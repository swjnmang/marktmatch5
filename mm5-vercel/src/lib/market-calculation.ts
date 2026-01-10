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


  // Demand allocation: Sequentielles Modell (günstigster Preis verkauft zuerst ALLES)
  // Sortiere nach Preis (niedrigster zuerst)
  const priceRanking = groups
    .map((group) => {
      const decision = decisions[group.id];
      if (!decision) return null;
      const supply = groupSupplies[group.id] || 0;
      return { id: group.id, price: decision.price, supply, decision };
    })
    .filter((entry): entry is { id: string; price: number; supply: number; decision: PeriodDecision } => !!entry)
    .sort((a, b) => a.price - b.price); // Niedrigster Preis zuerst

  const soldByGroup: Record<string, number> = {};
  let remainingDemand = totalDemand;

  // Sequentielle Verteilung: Jedes Team verkauft alles was es anbietet (oder was von der Nachfrage übrig ist)
  for (const entry of priceRanking) {
    if (remainingDemand <= 0) {
      soldByGroup[entry.id] = 0;
      continue;
    }
    
    // Diese Gruppe verkauft entweder ihr gesamtes Angebot oder die verbleibende Nachfrage
    const sold = Math.min(entry.supply, remainingDemand);
    soldByGroup[entry.id] = sold;
    
    // Reduziere verbleibende Nachfrage
    remainingDemand -= sold;
  }
    
    if (allocated > 0) {
      soldByGroup[entry.id] = allocated;
      remainingDemand -= allocated;
      console.log(`[Market] Allocated ${allocated} units to ${entry.id} at price €${entry.price}`);
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
