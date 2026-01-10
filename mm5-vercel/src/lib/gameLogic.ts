import type { GameParameters, GroupState, PeriodDecision, PeriodResult, Machine } from "./types";

export interface MarketCalculationInput {
  groupId: string;
  decision: PeriodDecision;
  groupState: GroupState;
}

export interface MarketCalculationResult {
  groupId: string;
  result: PeriodResult;
  newCapital: number;
  newInventory: number;
  newCumulativeProfit: number;
  newCumulativeRndInvestment: number;
  newRndBenefitApplied: boolean;
  newMachines: Machine[];
}

const MACHINE_OPTIONS: Machine[] = [
  { name: "SmartMini-Fertiger", cost: 5000, capacity: 100, variableCostPerUnit: 6 },
  { name: "KompaktPro-Produzent", cost: 12000, capacity: 250, variableCostPerUnit: 5 },
  { name: "FlexiTech-Assembler", cost: 18000, capacity: 350, variableCostPerUnit: 4.5 },
  { name: "MegaFlow-Manufaktur", cost: 25000, capacity: 500, variableCostPerUnit: 4 },
];

/**
 * Berechnet die Ergebnisse für alle Gruppen einer Periode
 */
export function calculateMarket(
  parameters: GameParameters,
  period: number,
  inputs: MarketCalculationInput[]
): MarketCalculationResult[] {
  // 1. Berechne Gesamtkapazität aller Gruppen
  const totalCapacity = inputs.reduce((sum, input) => {
    const groupCapacity = input.groupState.machines.reduce((cap, m) => cap + m.capacity, 0);
    return sum + groupCapacity;
  }, 0);

  // 2. Berechne Basisnachfrage (70% der Gesamtkapazität für realistischen Wettbewerb)
  const baseDemand = 0.7 * totalCapacity;

  // 3. Berechne Durchschnittspreis
  const totalOffered = inputs.reduce((sum, input) => {
    const offered = input.decision.production + input.decision.sellFromInventory;
    return sum + offered;
  }, 0);

  const weightedPriceSum = inputs.reduce((sum, input) => {
    const offered = input.decision.production + input.decision.sellFromInventory;
    return sum + input.decision.price * offered;
  }, 0);

  const avgPrice = totalOffered > 0 ? weightedPriceSum / totalOffered : parameters.demandReferencePrice;

  // 4. Preiselastizität - Nachfrage wird durch höhere Preise reduziert
  const priceRatio = avgPrice / parameters.demandReferencePrice;
  const priceElasticityMultiplier = Math.max(
    parameters.minPriceElasticityDemandMultiplier,
    1 - parameters.priceElasticityFactor * (priceRatio - 1)
  );

  // Nachfrage darf Kapazität und tatsächliches Angebot nicht überschreiten
  const adjustedDemand = Math.min(baseDemand * priceElasticityMultiplier, totalCapacity, totalOffered || totalCapacity);

  // 5. Berechne Marketing-Scores (ab Periode 5)
  const marketingScores: { [groupId: string]: number } = {};
  const isMarketingPeriod = period >= 5;

  if (isMarketingPeriod) {
    const totalMarketing = inputs.reduce((sum, input) => sum + (input.decision.marketingEffort || 0), 0);
    inputs.forEach((input) => {
      const effort = input.decision.marketingEffort || 0;
      marketingScores[input.groupId] = totalMarketing > 0 ? effort / totalMarketing : 0;
    });
  }

  // 6. Berechne Verkaufsanteile basierend auf Preis und (optional) Marketing
  const salesShares = calculateSalesShares(inputs, marketingScores, parameters);

  // 7. Verteile Nachfrage auf Gruppen
  const results: MarketCalculationResult[] = inputs.map((input) => {
    const { groupId, decision, groupState } = input;

    // Angebotene Menge
    const offered = decision.production + decision.sellFromInventory;

    // Verkaufte Menge
    const allocatedDemand = adjustedDemand * salesShares[groupId];
    const soldUnits = Math.min(offered, Math.floor(allocatedDemand));

    // Lagerbestand
    const endingInventory = groupState.inventory + decision.production - soldUnits;

    // Umsatz
    const revenue = soldUnits * decision.price;

    // Kosten

    // Variable Produktionskosten (mit F&E-Vorteil)
    let effectiveVariableCost = groupState.machines.reduce((sum, m) => {
      return sum + m.variableCostPerUnit * m.capacity;
    }, 0) / groupState.machines.reduce((sum, m) => sum + m.capacity, 0);

    if (groupState.rndBenefitApplied) {
      effectiveVariableCost *= 1 - parameters.rndVariableCostReduction;
    }

    const productionCosts = decision.production * effectiveVariableCost;

    // Lagerkosten
    const inventoryCost = endingInventory * parameters.inventoryCostPerUnit;

    // F&E-Kosten
    const rndCost = decision.rndInvestment || 0;

    // Maschinenkauf
    let machineCost = 0;
    let newMachines = [...groupState.machines];
    if (decision.newMachine) {
      const machine = MACHINE_OPTIONS.find((m) => m.name === decision.newMachine);
      if (machine) {
        machineCost = machine.cost;
        newMachines.push(machine);
      }
    }

    // Marktanalyse
    const marketAnalysisCost = decision.buyMarketAnalysis ? parameters.marketAnalysisCost : 0;

    // Gesamtkosten
    const totalCosts = productionCosts + inventoryCost + rndCost + machineCost + marketAnalysisCost;

    // Gewinn vor Zinsen
    const profitBeforeInterest = revenue - totalCosts;

    // Neues Kapital berechnen (vor Zinsen)
    const capitalBeforeInterest = groupState.capital + profitBeforeInterest;

    // Negativzinsen
    const interest = capitalBeforeInterest < 0 
      ? Math.abs(capitalBeforeInterest) * parameters.negativeCashInterestRate 
      : 0;

    // Endgültiger Gewinn
    const profit = profitBeforeInterest - interest;

    // Neues Kapital
    const endingCapital = capitalBeforeInterest - interest;

    // F&E-Vorteil prüfen
    const newCumulativeRndInvestment = groupState.cumulativeRndInvestment + rndCost;
    const newRndBenefitApplied = 
      newCumulativeRndInvestment >= parameters.rndBenefitThreshold || groupState.rndBenefitApplied;

    // Ergebnis
    const result: PeriodResult = {
      period,
      price: decision.price,
      soldUnits,
      revenue,
      productionCosts,
      variableCosts: productionCosts, // Synonym
      inventoryCost,
      rndCost,
      machineCost,
      marketAnalysisCost,
      interest,
      totalCosts,
      profit,
      endingInventory,
      endingCapital,
      marketShare: adjustedDemand > 0 ? (soldUnits / adjustedDemand) * 100 : 0,
      averageMarketPrice: decision.buyMarketAnalysis ? avgPrice : 0,
      totalMarketDemand: decision.buyMarketAnalysis ? Math.floor(adjustedDemand) : 0,
    };

    return {
      groupId,
      result,
      newCapital: endingCapital,
      newInventory: endingInventory,
      newCumulativeProfit: groupState.cumulativeProfit + profit,
      newCumulativeRndInvestment,
      newRndBenefitApplied,
      newMachines,
    };
  });

  return results;
}

/**
 * Berechnet Verkaufsanteile basierend auf Preis und Marketing
 */
function calculateSalesShares(
  inputs: MarketCalculationInput[],
  marketingScores: { [groupId: string]: number },
  parameters: GameParameters
): { [groupId: string]: number } {
  // Berechne Attraktivität jeder Gruppe (niedriger Preis = höhere Attraktivität)
  const attractiveness: { [groupId: string]: number } = {};
  
  inputs.forEach((input) => {
    // Preis-Attraktivität (inverse Beziehung: niedriger Preis = höher)
    const priceAttractiveness = 1 / input.decision.price;
    
    // Marketing-Bonus (ab Periode 5)
    const marketingBonus = marketingScores[input.groupId] 
      ? marketingScores[input.groupId] * parameters.marketingEffectivenessFactor 
      : 0;
    
    attractiveness[input.groupId] = priceAttractiveness * (1 + marketingBonus);
  });

  // Normalisiere zu Anteilen
  const totalAttractiveness = Object.values(attractiveness).reduce((sum, val) => sum + val, 0);
  
  const shares: { [groupId: string]: number } = {};
  inputs.forEach((input) => {
    shares[input.groupId] = totalAttractiveness > 0 
      ? attractiveness[input.groupId] / totalAttractiveness 
      : 1 / inputs.length;
  });

  return shares;
}

/**
 * Validiert eine Entscheidung
 */
export function validateDecision(
  decision: Partial<PeriodDecision>,
  groupState: GroupState,
  parameters: GameParameters,
  period: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Produktionsmenge
  const totalCapacity = groupState.machines.reduce((sum, m) => sum + m.capacity, 0);
  if (decision.production === undefined || decision.production < 0) {
    errors.push("Produktionsmenge muss mindestens 0 sein.");
  } else if (decision.production > totalCapacity) {
    errors.push(`Produktionsmenge (${decision.production}) überschreitet Kapazität (${totalCapacity}).`);
  }

  // Verkauf aus Lagerbestand
  if (decision.sellFromInventory === undefined || decision.sellFromInventory < 0) {
    errors.push("Verkauf aus Lagerbestand muss mindestens 0 sein.");
  } else if (decision.sellFromInventory > groupState.inventory) {
    errors.push(`Verkauf aus Lagerbestand (${decision.sellFromInventory}) überschreitet Lagerbestand (${groupState.inventory}).`);
  }

  // Preis
  if (decision.price === undefined || decision.price <= 0) {
    errors.push("Verkaufspreis muss größer als 0 sein.");
  }

  // Marketing (nur Periode 5)
  if (period === 5) {
    if (decision.marketingEffort === undefined || decision.marketingEffort < 1 || decision.marketingEffort > 10) {
      errors.push("Marketing-Bemühung muss zwischen 1 und 10 liegen (nur in Periode 5).");
    }
  }

  // F&E (ab Periode 3, falls aktiviert)
  if (parameters.isRndEnabled && period >= 3) {
    if (decision.rndInvestment === undefined || decision.rndInvestment < 0) {
      errors.push("F&E-Investition muss mindestens 0 sein.");
    }
  }

  // Maschinenkauf (ab Periode 3, alle 3 Perioden: 3, 6, 9...)
  const canBuyMachine = period >= 3 && (period - 3) % 3 === 0;
  if (decision.newMachine && !canBuyMachine) {
    errors.push(`Maschinenkauf ist nur in Perioden 3, 6, 9, ... erlaubt (aktuell: ${period}).`);
  }
  if (decision.newMachine) {
    const machine = MACHINE_OPTIONS.find((m) => m.name === decision.newMachine);
    if (!machine) {
      errors.push("Unbekannte Maschine ausgewählt.");
    } else if (machine.cost > groupState.capital) {
      errors.push(`Kapital (€${groupState.capital}) reicht für Maschine nicht aus (€${machine.cost}).`);
    }
  }

  return { valid: errors.length === 0, errors };
}
