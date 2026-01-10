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

  // Calculate base market demand
  const baseDemand = 1000 * params.initialMarketSaturationFactor;
  
  // Price elasticity effect with safety bounds
  const priceRatio = Math.max(0.01, avgMarketPrice / params.demandReferencePrice);
  const priceElasticityEffect = Math.max(
    params.minPriceElasticityDemandMultiplier,
    Math.min(2, 1 - (priceRatio - 1) * params.priceElasticityFactor)
  );
  
  const totalDemand = Math.max(1, Math.floor(baseDemand * priceElasticityEffect));


  // Demand allocation: Winner-Takes-Most model (lowest price gets majority of demand)
  // Sort by price (lowest first)
  const priceRanking = groups
    .map((group) => {
      const decision = decisions[group.id];
      if (!decision) return null;
      const supply = groupSupplies[group.id] || 0;
      return { id: group.id, price: decision.price, supply, decision };
    })
    .filter((entry): entry is { id: string; price: number; supply: number; decision: PeriodDecision } => !!entry)
    .sort((a, b) => a.price - b.price); // Lowest price first

  const soldByGroup: Record<string, number> = {};
  let remainingDemand = totalDemand;

  // Winner-Takes-Most: Allocate demand greedily starting with cheapest
  // Cheapest gets first pick at a max of 70% of original demand
  // Others get percentages from WHAT'S LEFT
  for (let i = 0; i < priceRanking.length && remainingDemand > 0; i++) {
    const entry = priceRanking[i];
    
    if (entry.supply <= 0) continue;
    
    let maxAllowed: number;
    if (i === 0) {
      // Cheapest: max 70% of original demand
      maxAllowed = Math.floor(totalDemand * 0.70);
    } else if (i === 1) {
      // Second: max 15% of original demand
      maxAllowed = Math.floor(totalDemand * 0.15);
    } else if (i === 2) {
      // Third: max 10% of original demand
      maxAllowed = Math.floor(totalDemand * 0.10);
    } else {
      // Others: max 5% of original demand
      maxAllowed = Math.floor(totalDemand * 0.05);
    }
    
    // Allocate: min of (what they can sell, what they want to sell, what's left in demand)
    const allocated = Math.min(entry.supply, maxAllowed, remainingDemand);
    
    if (allocated > 0) {
      soldByGroup[entry.id] = allocated;
      remainingDemand -= allocated;
      console.log(`[Market] Allocated ${allocated} units to ${entry.id} at price €${entry.price}`);
    }
  }

  console.log(`[Market] Total demand: ${totalDemand}, allocated: ${totalDemand - remainingDemand}, unmet: ${remainingDemand}`);

  // If there's still demand left, it goes unsold (simulating market demand constraints)
  // This is realistic for a digital market where customers are price-sensitive

  // Calculate market share and sales for each group
  for (const group of groups) {
    const decision = decisions[group.id];
    if (!decision) continue;

    const supply = groupSupplies[group.id] || 0;
    const allocated = soldByGroup[group.id] || 0;
    const soldUnits = Math.min(supply, allocated);
    
    // CRITICAL: Verify sold units don't exceed supply
    if (soldUnits > supply) {
      console.error(`[CRITICAL] Group ${group.id}: Sold (${soldUnits}) > Supply (${supply})!`);
      console.error(`  Production: ${decision.production}, Inventory: ${group.inventory}, SellFromInv: ${decision.sellFromInventory}`);
    }
    
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
