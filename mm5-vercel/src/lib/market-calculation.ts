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
  const results: Record<string, PeriodResult> = {};

  // Validate decisions
  for (const [groupId, decision] of Object.entries(decisions)) {
    if (!decision || typeof decision.price !== "number" || decision.price < 0) {
      throw new Error(`Invalid decision for group ${groupId}: price=${decision?.price}`);
    }
    if (typeof decision.production !== "number" || decision.production < 0) {
      throw new Error(`Invalid decision for group ${groupId}: production=${decision?.production}`);
    }
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

  // Calculate base market demand
  const baseDemand = 1000 * params.initialMarketSaturationFactor;
  
  // Price elasticity effect with safety bounds
  const priceRatio = Math.max(0.01, avgMarketPrice / params.demandReferencePrice);
  const priceElasticityEffect = Math.max(
    params.minPriceElasticityDemandMultiplier,
    Math.min(2, 1 - (priceRatio - 1) * params.priceElasticityFactor)
  );
  
  const totalDemand = Math.max(1, Math.floor(baseDemand * priceElasticityEffect));

  // Demand allocation driven primarily by price; supply acts as cap
  const scores: Record<string, number> = {};
  for (const group of groups) {
    const decision = decisions[group.id];
    if (!decision) continue;
    const marketingBoost = decision.marketingEffort > 0
      ? 1 + (decision.marketingEffort / 10000) * params.marketingEffectivenessFactor
      : 1;
    const priceFactor = Math.max(0.01, params.demandReferencePrice / Math.max(0.01, decision.price));
    const exponent = 1 + Math.max(0, params.priceElasticityFactor);
    scores[group.id] = Math.pow(priceFactor, exponent) * marketingBoost;
  }

  const remainingSupply: Record<string, number> = { ...groupSupplies };
  const soldByGroup: Record<string, number> = {};
  let remainingDemand = totalDemand;

  // Iteratively allocate demand respecting supply caps
  for (let round = 0; round < 5 && remainingDemand > 0; round++) {
    let weightSum = 0;
    for (const group of groups) {
      if (remainingSupply[group.id] > 0 && scores[group.id] > 0) {
        weightSum += scores[group.id];
      }
    }
    if (weightSum <= 0) break;

    let allocatedThisRound = 0;
    for (const group of groups) {
      const decision = decisions[group.id];
      if (!decision) continue;
      if (remainingSupply[group.id] <= 0) continue;
      const share = scores[group.id] / weightSum;
      const desired = Math.floor(remainingDemand * share);
      const allocate = Math.min(remainingSupply[group.id], desired);
      if (allocate > 0) {
        soldByGroup[group.id] = (soldByGroup[group.id] || 0) + allocate;
        remainingSupply[group.id] -= allocate;
        remainingDemand -= allocate;
        allocatedThisRound += allocate;
      }
    }
    if (allocatedThisRound === 0) break; // avoid infinite loop
  }

  // Calculate market share and sales for each group
  for (const group of groups) {
    const decision = decisions[group.id];
    if (!decision) continue;

    const soldUnits = Math.min(groupSupplies[group.id], soldByGroup[group.id] || 0);
    
    // Calculate revenues and costs
    const revenue = soldUnits * decision.price;
    
    // Production costs
    const avgVariableCost = group.machines?.length 
      ? group.machines.reduce((sum, m) => sum + m.variableCostPerUnit, 0) / group.machines.length
      : 5;
    
    const rndBenefit = group.rndBenefitApplied ? params.rndVariableCostReduction : 0;
    const effectiveVariableCost = Math.max(0, avgVariableCost - rndBenefit);
    
    const productionCosts = decision.production * effectiveVariableCost;
    const variableCosts = productionCosts;
    
    // Inventory costs
    const newInventory = group.inventory + decision.production - soldUnits;
    const inventoryCost = newInventory * params.inventoryCostPerUnit;
    
    // Other costs
    const rndCost = decision.rndInvestment;
    const machineCost = 0; // Machine depreciation could be added here
    const marketAnalysisCost = decision.buyMarketAnalysis ? params.marketAnalysisCost : 0;
    
    // Total costs
    const totalCosts = productionCosts + inventoryCost + rndCost + machineCost + marketAnalysisCost + decision.marketingEffort;
    
    // Profit calculation
    let profit = revenue - totalCosts;
    
    // Calculate ending capital
    let endingCapital = group.capital + profit;
    
    // Apply interest if negative
    let interest = 0;
    if (endingCapital < 0) {
      interest = Math.abs(endingCapital) * params.negativeCashInterestRate;
      endingCapital -= interest;
    }

    // Check for R&D benefit
    const newCumulativeRnd = group.cumulativeRndInvestment + rndCost;
    const rndBenefitApplied = newCumulativeRnd >= params.rndBenefitThreshold && !group.rndBenefitApplied;

    // Store result
    results[group.id] = {
      period: game.period,
      soldUnits,
      revenue,
      productionCosts,
      variableCosts,
      inventoryCost,
      rndCost,
      machineCost,
      marketAnalysisCost,
      interest,
      totalCosts: totalCosts + interest,
      profit: profit - interest,
      endingInventory: Math.max(0, newInventory),
      endingCapital,
      marketShare: totalDemand > 0 ? (soldUnits / totalDemand) * 100 : 0,
      averageMarketPrice: 0, // placeholder; set after loop with demand-weighted average
      totalMarketDemand: totalDemand,
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
    results[gid].averageMarketPrice = demandWeightedAvg;
  }

  return results;
}
