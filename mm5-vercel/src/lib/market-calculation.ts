import type { GameDocument, GroupState, PeriodDecision, PeriodResult } from "./types";

/**
 * Calculate market results for all groups in a period
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

  // Final demand capped below total capacity to avoid "sell-all" scenarios
  const demandCap = Math.floor(totalCapacity * params.initialMarketSaturationFactor);
  const totalDemand = Math.max(
    1,
    Math.min(demandCap, Math.floor(baseDemand * priceElasticityEffect * demandBoostMultiplier))
  );


  // Inverse-Preis-Verteilung: Nachfrageanteile nach (p_min / p_i)^alpha
  const entries = groups
    .map((group) => {
      const decision = decisions[group.id];
      if (!decision) return null;
      const supply = groupSupplies[group.id] || 0;
      return { id: group.id, price: Math.max(0.01, decision.price), supply };
    })
    .filter((e): e is { id: string; price: number; supply: number } => !!e);

  const pMin = Math.min(...entries.map(e => e.price));
  const alpha = params.priceExponent ?? 2;
  const sCap = Math.max(0, Math.min(1, params.maxMarketShareCap ?? 0.5));
  const capUnits = Math.floor(sCap * totalDemand);

  const weights = entries.map(e => ({ id: e.id, w: Math.pow(pMin / e.price, alpha), supply: e.supply }));
  const totalW = weights.reduce((s, x) => s + x.w, 0) || 1;

  const soldByGroup: Record<string, number> = {};
  // Initial Allokation
  for (const x of weights) {
    const share = x.w / totalW;
    const target = Math.floor(share * totalDemand);
    const sold = Math.min(target, x.supply, capUnits);
    soldByGroup[x.id] = sold;
  }

  let remainingDemand = totalDemand - Object.values(soldByGroup).reduce((s, v) => s + v, 0);

  // Proportionale Restverteilung nach Gewicht, begrenzt durch verbleibende Kapazitäten und Cap
  if (remainingDemand > 0) {
    const eligible = weights.filter(x => {
      const sold = soldByGroup[x.id] || 0;
      return x.supply - sold > 0 && capUnits - sold > 0;
    });
    const sumEligW = eligible.reduce((s, x) => s + x.w, 0) || 1;
    for (const x of eligible) {
      if (remainingDemand <= 0) break;
      const sold = soldByGroup[x.id] || 0;
      const supplyLeft = x.supply - sold;
      const capLeft = capUnits - sold;
      const add = Math.min(supplyLeft, capLeft, Math.floor((x.w / sumEligW) * remainingDemand));
      if (add > 0) {
        soldByGroup[x.id] = sold + add;
        remainingDemand -= add;
      }
    }
  }

  // Falls noch Einheiten übrig (durch Rundung), verteile 1er-Inkremente nach Gewicht
  if (remainingDemand > 0) {
    const order = [...weights].sort((a, b) => b.w - a.w);
    let idx = 0;
    while (remainingDemand > 0 && idx < order.length) {
      const x = order[idx];
      const sold = soldByGroup[x.id] || 0;
      if (x.supply - sold > 0 && capUnits - sold > 0) {
        soldByGroup[x.id] = sold + 1;
        remainingDemand -= 1;
      }
      idx = (idx + 1) % order.length;
    }
  }

  console.log(`[Market] Total demand: ${totalDemand}, remaining unmet: ${remainingDemand}`);

  // Berechne Marktanteil und Verkäufe für jede Gruppe
  for (const group of groups) {
    const decision = decisions[group.id];
    if (!decision) continue;

    const supply = groupSupplies[group.id] || 0;
    const soldUnits = soldByGroup[group.id] || 0;
    
    // CRITICAL: Verkaufte Einheiten dürfen Angebot nicht überschreiten
    if (soldUnits > supply) {
      console.error(`[CRITICAL] Group ${group.id}: Sold (${soldUnits}) > Supply (${supply})!`);
      console.error(`  Production: ${decision.production}, Inventory: ${group.inventory}, SellFromInv: ${decision.sellFromInventory}`);
    }
    
    const revenue = Math.round(soldUnits * decision.price * 100) / 100;
    
    // Variable cost per unit: from machine OR default 5€
    let varCostPerUnit = 5;
    if (group.machines && group.machines.length > 0) {
      varCostPerUnit = group.machines[0].variableCostPerUnit;
    }
    
    // Apply R&D benefit if applicable
    const rndBenefit = group.rndBenefitApplied ? 2 : 0; // 2€ cost reduction
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
    const marketingCost = Math.round((decision.marketingEffort || 0) * 100) / 100;
    const machineCost = 0;
    
    // Total costs
    const totalCosts = Math.round((productionCosts + inventoryCost + rndCost + marketAnalysisCost + marketingCost) * 100) / 100;
    
    // Profit before interest
    const profit = Math.round((revenue - totalCosts) * 100) / 100;
    let endingCapital = Math.round((group.capital + profit) * 100) / 100;
    
    // Apply interest on negative capital
    let interest = 0;
    if (endingCapital < 0) {
      interest = Math.round(Math.abs(endingCapital) * params.negativeCashInterestRate * 100) / 100;
      endingCapital = Math.round((endingCapital - interest) * 100) / 100;
    }

    // R&D benefit check
    const newCumulativeRnd = group.cumulativeRndInvestment + rndCost;
    const rndBenefitApplied = newCumulativeRnd >= params.rndBenefitThreshold && !group.rndBenefitApplied;

    // Store result
    results[group.id] = {
      period: game.period,
      soldUnits,
      revenue,
      productionCosts,
      variableCosts: productionCosts,
      inventoryCost,
      rndCost,
      machineCost,
      marketAnalysisCost,
      interest,
      totalCosts: Math.round((totalCosts + interest) * 100) / 100,
      profit: Math.round((profit - interest) * 100) / 100,
      endingInventory: Math.max(0, newInventory),
      endingCapital,
      marketShare: totalDemand > 0 ? Math.round((soldUnits / totalDemand) * 100 * 100) / 100 : 0,
      averageMarketPrice: hasMarketAnalysis ? Math.round(avgMarketPrice * 100) / 100 : 0,
      totalMarketDemand: hasMarketAnalysis ? totalDemand : 0,
    };
  }
  // Compute demand-weighted average market price after allocation
  let totalSold = 0;
  let valueSum = 0;
  for (const group of groups) {
    const decision = decisions[group.id];
    if (!decision) continue;
    const sold = results[group.id]?.soldUnits || 0;
    totalSold += sold;
    valueSum += sold * decision.price;
  }
  const demandWeightedAvg = totalSold > 0 ? valueSum / totalSold : avgMarketPrice;
  for (const gid of Object.keys(results)) {
    const decision = decisions[gid];
    const hasMarketAnalysis = freeMarketAnalysis || decision?.buyMarketAnalysis;
    results[gid].averageMarketPrice = hasMarketAnalysis ? demandWeightedAvg : 0;
  }

  return results;
}
