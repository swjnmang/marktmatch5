import type { GameDocument, GroupState, PeriodDecision, PeriodResult } from "./types";

/**
 * Calculate market results for all groups in a period
 * Uses Sequential Softening algorithm for realistic price competition
 */
export async function calculateMarketResults(
  game: GameDocument,
  groups: GroupState[],
  decisions: Record<string, PeriodDecision>
): Promise<Record<string, PeriodResult>> {
  const params = game.parameters;
  const activeActions = game.activePeriodActions && game.activePeriodActions.period === game.period
    ? game.activePeriodActions
    : undefined;
  const demandBoostMultiplier = activeActions?.demandBoost ? 1.3 : 1;
  const inventoryCostPerUnit = activeActions?.noInventoryCosts ? 0 : params.inventoryCostPerUnit;
  const freeMarketAnalysis = !!activeActions?.freeMarketAnalysis;
  const results: Record<string, PeriodResult> = {};

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

  // Calculate total machine capacity across all groups
  const totalCapacity = groups.reduce((sum, g) => {
    const cap = g.machines?.reduce((c, m) => c + m.capacity, 0) || 0;
    return sum + cap;
  }, 0);

  // Base demand as a fraction of total capacity (market saturation)
  const baseDemand = Math.floor(totalCapacity * params.initialMarketSaturationFactor);
  
  // Price elasticity effect with safety bounds
  const priceRatio = Math.max(0.01, avgMarketPrice / params.demandReferencePrice);
  // Price elasticity only reduces demand from base (cap at 1.0)
  const priceElasticityEffect = Math.max(
    params.minPriceElasticityDemandMultiplier,
    1 - (priceRatio - 1) * params.priceElasticityFactor
  );

  // Final demand - never more than base demand
  const totalDemand = Math.max(
    1,
    Math.floor(baseDemand * priceElasticityEffect * demandBoostMultiplier)
  );

  console.log(`[Market] TotalCapacity=${totalCapacity}, BaseDemand=${baseDemand}, AvgPrice=€${avgMarketPrice.toFixed(2)}, PriceElasticity=${priceElasticityEffect.toFixed(3)}, FinalDemand=${totalDemand}`);

  // ===== SEQUENTIAL SOFTENING ALGORITHM =====
  // Groups sorted by price (cheapest first) get priority in demand allocation
  const entries = groups
    .map((group) => {
      const decision = decisions[group.id];
      if (!decision) return null;
      const supply = groupSupplies[group.id] || 0;
      return { id: group.id, price: Math.max(0.01, decision.price), supply };
    })
    .filter((e): e is { id: string; price: number; supply: number } => !!e)
    .sort((a, b) => a.price - b.price);  // Sort by price ascending (cheapest first)

  const soldByGroup: Record<string, number> = {};
  let remainingDemand = totalDemand;
  const SOFTENING_FACTOR = 0.8;  // Each group gets 80% of remaining demand

  console.log(`[Market] Starting demand allocation (Sequential Softening). Total groups: ${entries.length}`);

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    
    if (remainingDemand <= 0) {
      console.log(`[Market] Group ${i} (€${entry.price.toFixed(2)}): No remaining demand`);
      soldByGroup[entry.id] = 0;
      continue;
    }

    // Last group gets all remaining demand
    const isLastGroup = i === entries.length - 1;
    const targetDemand = isLastGroup 
      ? remainingDemand  
      : Math.floor(remainingDemand * SOFTENING_FACTOR);
    
    // Limited by supply
    const allocated = Math.min(targetDemand, entry.supply);
    
    soldByGroup[entry.id] = allocated;
    remainingDemand -= allocated;
    
    console.log(`[Market] Group ${i} (€${entry.price.toFixed(2)}, Supply=${entry.supply}): Target=${targetDemand}, Allocated=${allocated}, Remaining=${remainingDemand}`);
  }

  console.log(`[Market] Allocation complete. Total allocated: ${Object.values(soldByGroup).reduce((s, v) => s + v, 0)}, Unmet demand: ${remainingDemand}`);

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
    
    // Variable cost per unit: from machine
    let varCostPerUnit = 5;
    if (group.machines && group.machines.length > 0) {
      varCostPerUnit = group.machines[0].variableCostPerUnit;
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
    const hasMarketAnalysis = freeMarketAnalysis || decision.buyMarketAnalysis;
    const marketAnalysisCost = hasMarketAnalysis ? (freeMarketAnalysis ? 0 : Math.round(params.marketAnalysisCost * 100) / 100) : 0;
    const machineCost = 0;  // Machine costs not included in this simplified version
    
    // Total costs
    const totalCosts = Math.round((productionCosts + inventoryCost + rndCost + marketAnalysisCost + machineCost) * 100) / 100;
    
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

    results[group.id] = {
      period: game.period,
      price: Math.round(decision.price * 100) / 100,
      soldUnits,
      revenue,
      productionCosts,
      variableCosts: productionCosts,
      inventoryCost,
      rndCost,
      marketAnalysisCost,
      machineCost,
      interest,
      totalCosts: Math.round((totalCosts + interest) * 100) / 100,
      profit: finalProfit,
      endingInventory: Math.max(0, newInventory),
      endingCapital,
      marketShare: totalDemand > 0 ? Math.round((soldUnits / totalDemand) * 100 * 100) / 100 : 0,
      averageMarketPrice: hasMarketAnalysis ? Math.round(avgMarketPrice * 100) / 100 : 0,
      totalMarketDemand: hasMarketAnalysis ? totalDemand : 0,
      machineDepreciationCapacityLost: 0,
    };
  }

  return results;
}
