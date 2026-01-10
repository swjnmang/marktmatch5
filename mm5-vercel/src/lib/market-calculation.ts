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

  const soldByGroup: Record<string, number> = {};
  let remainingDemand = totalDemand;

  // Iteratively allocate demand respecting supply caps
  for (let round = 0; round < 5 && remainingDemand > 0; round++) {
    let weightSum = 0;
    let availableSupply = 0;
    for (const group of groups) {
      const gSupply = groupSupplies[group.id] || 0;
      const gSold = soldByGroup[group.id] || 0;
      const gRemaining = Math.max(0, gSupply - gSold);
      if (gRemaining > 0 && scores[group.id] > 0) {
        weightSum += scores[group.id];
        availableSupply += gRemaining;
      }
    }
    if (weightSum <= 0 || availableSupply <= 0) break;

    let allocatedThisRound = 0;
    for (const group of groups) {
      const decision = decisions[group.id];
      if (!decision) continue;
      const gSupply = groupSupplies[group.id] || 0;
      const gSold = soldByGroup[group.id] || 0;
      const gRemaining = Math.max(0, gSupply - gSold);
      if (gRemaining <= 0) continue;
      
      const share = scores[group.id] / weightSum;
      const desired = Math.floor(remainingDemand * share);
      const allocate = Math.min(gRemaining, desired);
      if (allocate > 0) {
        soldByGroup[group.id] = (soldByGroup[group.id] || 0) + allocate;
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
    const revenue = soldUnits * decision.price;
    
    // Variable cost per unit: from machine OR default 5€
    let varCostPerUnit = 5;
    if (group.machines && group.machines.length > 0) {
      varCostPerUnit = group.machines[0].variableCostPerUnit;
    }
    
    // Apply R&D benefit if applicable
    const rndBenefit = group.rndBenefitApplied ? 2 : 0; // 2€ cost reduction
    const effectiveVarCost = Math.max(0, varCostPerUnit - rndBenefit);
    
    // Production costs = quantity × per-unit cost
    const productionCosts = decision.production * effectiveVarCost;
    
    // Inventory: beginning + produced - sold
    const newInventory = group.inventory + decision.production - soldUnits;
    const inventoryCost = Math.max(0, newInventory) * params.inventoryCostPerUnit;
    
    // Explicit costs
    const rndCost = decision.rndInvestment || 0;
    const marketAnalysisCost = decision.buyMarketAnalysis ? params.marketAnalysisCost : 0;
    const marketingCost = decision.marketingEffort || 0;
    const machineCost = 0;
    
    // Total costs
    const totalCosts = productionCosts + inventoryCost + rndCost + marketAnalysisCost + marketingCost;
    
    // Profit before interest
    let profit = revenue - totalCosts;
    let endingCapital = group.capital + profit;
    
    // Apply interest on negative capital
    let interest = 0;
    if (endingCapital < 0) {
      interest = Math.abs(endingCapital) * params.negativeCashInterestRate;
      endingCapital -= interest;
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
      totalCosts: totalCosts + interest,
      profit: profit - interest,
      endingInventory: Math.max(0, newInventory),
      endingCapital,
      marketShare: totalDemand > 0 ? (soldUnits / totalDemand) * 100 : 0,
      averageMarketPrice: 0,
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
