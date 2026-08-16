import type { GameDocument, GroupState, Machine, PeriodDecision, PeriodResult } from "./types";

export interface MarketResultEntry {
  result: PeriodResult;
  newMachines: Machine[];
}

/**
 * Calculate market results for all groups in a period
 * Uses Sequential Softening algorithm for realistic price competition
 */
export async function calculateMarketResults(
  game: GameDocument,
  groups: GroupState[],
  decisions: Record<string, PeriodDecision>
): Promise<Record<string, MarketResultEntry>> {
  const params = game.parameters;
  const activeActions = game.activePeriodActions && game.activePeriodActions.period === game.period
    ? game.activePeriodActions
    : undefined;
  const demandBoostMultiplier = activeActions?.demandBoost ? 1.3 : 1;
  const inventoryCostPerUnit = activeActions?.noInventoryCosts ? 0 : params.inventoryCostPerUnit;
  const freeMarketAnalysis = !!activeActions?.freeMarketAnalysis;
  const results: Record<string, MarketResultEntry> = {};
  const depreciationRate = params.machineDepreciationEnabled && params.machineDepreciationRate
    ? params.machineDepreciationRate
    : 0;

  // Validate decisions
  for (const [groupId, decision] of Object.entries(decisions)) {
    if (!decision || typeof decision.price !== "number" || decision.price < 0) {
      throw new Error(`Invalid decision for group ${groupId}: price=${decision?.price}`);
    }
    if (typeof decision.production !== "number" || decision.production < 0) {
      throw new Error(`Invalid decision for group ${groupId}: production=${decision?.production}`);
    }
    console.log(`[Market] Group ${groupId}: Production=${decision.production}, SellFromInv=${decision.sellFromInventory}, Price=€${decision.price}`);
  }

  // Calculate total market supply and average price
  let totalSupply = 0;
  let totalPriceWeight = 0;
  const groupSupplies: Record<string, number> = {};

  for (const group of groups) {
    const decision = decisions[group.id];
    if (!decision) continue;

    const supply = Math.max(0, decision.production + decision.sellFromInventory);
    groupSupplies[group.id] = supply;
    totalSupply += supply;
    totalPriceWeight += decision.price * supply;
  }

  const avgMarketPrice = totalSupply > 0 ? totalPriceWeight / totalSupply : params.demandReferencePrice;

  // Validate avgMarketPrice
  if (!isFinite(avgMarketPrice) || avgMarketPrice < 0) {
    throw new Error(`Invalid market price: ${avgMarketPrice}`);
  }

  // Base demand as a fraction of total supply (market saturation)
  // WICHTIG: Nachfrage basiert auf ANGEBOT (totalSupply), nicht auf Maschinenkapazität!
  const baseDemand = Math.floor(totalSupply * params.initialMarketSaturationFactor);
  
  // Price elasticity effect with safety bounds
  const priceRatio = Math.max(0.01, avgMarketPrice / params.demandReferencePrice);
  // Price elasticity only reduces demand from base (cap at 1.0, floor at 0.01 for extreme prices)
  const priceElasticityEffect = Math.max(
    0.01,  // Allow demand to drop to 1% at extreme prices (realistic competition)
    Math.min(1.0, 1 - (priceRatio - 1) * params.priceElasticityFactor)
  );

  // Final demand - never more than base demand
  const totalDemand = Math.max(
    1,
    Math.floor(baseDemand * priceElasticityEffect * demandBoostMultiplier)
  );

  console.log(`[Market] TotalSupply=${totalSupply}, BaseDemand=${baseDemand}, AvgPrice=€${avgMarketPrice.toFixed(2)}, PriceElasticity=${priceElasticityEffect.toFixed(3)}, FinalDemand=${totalDemand}`);

  // Prepare group data for allocation
  const entries = groups
    .map((group) => {
      const decision = decisions[group.id];
      if (!decision) return null;
      const supply = groupSupplies[group.id] || 0;
      return { id: group.id, price: Math.max(0.01, decision.price), supply };
    })
    .filter((e): e is { id: string; price: number; supply: number } => !!e);

  const soldByGroup: Record<string, number> = {};

  // ===== INVERSE PRICE ALLOCATION MODEL =====
  // MODELL 1: Je günstiger der Preis, desto höher der Marktanteil
  // Formel: marketShare = (1/price) / sum(1/allPrices)
  // Realistisch: Kunden kaufen das Günstigste. Der Markt crasht nicht.
  
  const groupDataForAlloc = entries.map(entry => ({
    ...entry,
    inverse: 1 / Math.max(0.01, entry.price),
    marketingEffort: Math.max(0, decisions[entry.id]?.marketingEffort || 0),
  }));

  // Ab Periode 5: Marketing-Budget verschiebt die Attraktivität zusätzlich zum Preis
  const totalMarketingEffort = groupDataForAlloc.reduce((sum, g) => sum + g.marketingEffort, 0);
  const isMarketingActive = game.period >= 5 && totalMarketingEffort > 0;

  const attractivenessData = groupDataForAlloc.map(g => ({
    ...g,
    attractiveness: isMarketingActive
      ? g.inverse * (1 + (g.marketingEffort / totalMarketingEffort) * params.marketingEffectivenessFactor)
      : g.inverse,
  }));

  const attractivenessSum = attractivenessData.reduce((sum, g) => sum + g.attractiveness, 0);

  const marketShares = attractivenessData.map(g => ({
    ...g,
    marketShare: attractivenessSum > 0 ? g.attractiveness / attractivenessSum : 0,
  }));

  // First pass: allocate based on market share
  let allocatedDemand = 0;
  let unallocatedDemand = totalDemand;

  marketShares.forEach(item => {
    const targetDemand = Math.floor(item.marketShare * totalDemand);
    const canSell = Math.min(targetDemand, item.supply);
    soldByGroup[item.id] = canSell;
    allocatedDemand += canSell;
    unallocatedDemand -= canSell;
    console.log(`[Inverse Model] Group €${item.price.toFixed(2)}: Inverse=${item.inverse.toFixed(6)}, Share=${(item.marketShare*100).toFixed(2)}%, Target=${targetDemand}, CanSupply=${item.supply}, Sold=${canSell}`);
  });

  // Second pass: redistribute unmet demand to groups with remaining capacity (by price)
  if (unallocatedDemand > 0) {
    console.log(`[Inverse Model] Unallocated: ${unallocatedDemand} units - redistributing...`);
    const sortedByPrice = marketShares.sort((a, b) => a.price - b.price);
    
    for (const item of sortedByPrice) {
      if (unallocatedDemand <= 0) break;
      
      const alreadySold = soldByGroup[item.id] || 0;
      const remainingCapacity = item.supply - alreadySold;
      const canTake = Math.min(remainingCapacity, unallocatedDemand);
      
      if (canTake > 0) {
        soldByGroup[item.id] = alreadySold + canTake;
        unallocatedDemand -= canTake;
        console.log(`[Inverse Model] Group €${item.price.toFixed(2)}: Taking ${canTake} from overflow → ${soldByGroup[item.id]} total`);
      }
    }
  }

  console.log(`[Inverse Model] Allocation complete. Total: ${allocatedDemand + (totalDemand - unallocatedDemand)}, Unmet: ${unallocatedDemand}`);

  // ===== CALCULATE RESULTS FOR EACH GROUP =====
  for (const group of groups) {
    const decision = decisions[group.id];
    if (!decision) continue;

    const supply = groupSupplies[group.id] || 0;
    const soldUnits = soldByGroup[group.id] || 0;
    
    // Safety check
    if (soldUnits > supply) {
      console.error(`[CRITICAL] Group ${group.id}: Sold (${soldUnits}) > Supply (${supply})!`);
    }
    
    const revenue = Math.round(soldUnits * decision.price * 100) / 100;

    // Variable cost per unit: capacity-weighted average across all machines
    // (matches gameLogic.ts, so a group's cheaper additional machine actually lowers costs)
    let varCostPerUnit = 5;
    if (group.machines && group.machines.length > 0) {
      const totalCapacity = group.machines.reduce((sum, m) => sum + m.capacity, 0);
      varCostPerUnit = totalCapacity > 0
        ? group.machines.reduce((sum, m) => sum + m.variableCostPerUnit * m.capacity, 0) / totalCapacity
        : group.machines[0].variableCostPerUnit;
    }

    // Apply R&D benefit if applicable
    const rndBenefit = group.rndBenefitApplied ? params.rndVariableCostReduction * varCostPerUnit : 0;
    const effectiveVarCost = Math.max(0, varCostPerUnit - rndBenefit);
    
    // Production costs = quantity × per-unit cost
    const productionCosts = Math.round(decision.production * effectiveVarCost * 100) / 100;
    
    // Inventory: beginning + produced - sold
    const newInventory = Math.floor(group.inventory + decision.production - soldUnits);
    const inventoryCost = Math.round(Math.max(0, newInventory) * inventoryCostPerUnit * 100) / 100;
    
    // Explicit costs
    const rndCost = Math.round((decision.rndInvestment || 0) * 100) / 100;
    const marketingCost = game.period >= 5 ? Math.round((decision.marketingEffort || 0) * 100) / 100 : 0;
    const hasMarketAnalysis = freeMarketAnalysis || decision.buyMarketAnalysis;
    const marketAnalysisCost = hasMarketAnalysis ? (freeMarketAnalysis ? 0 : Math.round(params.marketAnalysisCost * 100) / 100) : 0;
    const machineCost = 0;  // Machine costs not included in this simplified version

    // Total costs
    const totalCosts = Math.round((productionCosts + inventoryCost + rndCost + marketingCost + marketAnalysisCost + machineCost) * 100) / 100;
    
    // Profit and capital
    const profitBeforeInterest = Math.round((revenue - totalCosts) * 100) / 100;
    let endingCapital = Math.round((group.capital + profitBeforeInterest) * 100) / 100;
    
    // Interest on negative capital
    let interest = 0;
    if (endingCapital < 0) {
      interest = Math.round(Math.abs(endingCapital) * params.negativeCashInterestRate * 100) / 100;
      endingCapital = Math.round((endingCapital - interest) * 100) / 100;
    }
    
    const finalProfit = Math.round((profitBeforeInterest - interest) * 100) / 100;

    // Machine Depreciation: reduce capacity for next period if enabled
    // (matches gameLogic.ts - applied after this period's costs, affects the next period)
    let capacityLostToDepreciation = 0;
    const newMachines: Machine[] = group.machines ? group.machines.map((m) => ({ ...m })) : [];
    if (depreciationRate > 0 && newMachines.length > 0) {
      const capacityBefore = newMachines.reduce((sum, m) => sum + m.capacity, 0);
      for (const machine of newMachines) {
        machine.capacity = Math.max(0, Math.floor(machine.capacity * (1 - depreciationRate)));
      }
      const capacityAfter = newMachines.reduce((sum, m) => sum + m.capacity, 0);
      capacityLostToDepreciation = capacityBefore - capacityAfter;
    }

    results[group.id] = {
      newMachines,
      result: {
        period: game.period,
        price: Math.round(decision.price * 100) / 100,
        soldUnits,
        revenue,
        productionCosts,
        variableCosts: productionCosts,
        inventoryCost,
        rndCost,
        marketingCost,
        marketAnalysisCost,
        machineCost,
        interest,
        totalCosts: Math.round((totalCosts + interest) * 100) / 100,
        profit: finalProfit,
        endingInventory: Math.max(0, newInventory),
        endingCapital,
        // Marktbericht (Marktanteil, Durchschnittspreis, Gesamtnachfrage) und die
        // Konkurrenzanalyse sind beide an den Kauf der Marktanalyse gekoppelt.
        marketShare: hasMarketAnalysis && totalDemand > 0 ? Math.round((soldUnits / totalDemand) * 100 * 100) / 100 : 0,
        averageMarketPrice: hasMarketAnalysis ? Math.round(avgMarketPrice * 100) / 100 : 0,
        totalMarketDemand: hasMarketAnalysis ? totalDemand : 0,
        machineDepreciationCapacityLost: capacityLostToDepreciation,
      },
    };
  }

  return results;
}
