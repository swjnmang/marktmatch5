import type { GameParameters, GroupState, PeriodDecision, PeriodResult, Machine, PeriodActions } from "./types";

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
  inputs: MarketCalculationInput[],
  activeActions?: PeriodActions
): MarketCalculationResult[] {
  const actions = activeActions && activeActions.period === period ? activeActions : undefined;

  // 1. Berechne Gesamtangebot aller Gruppen
  const totalOffered = inputs.reduce((sum, input) => {
    const offered = input.decision.production + input.decision.sellFromInventory;
    return sum + offered;
  }, 0);

  // 2. Berechne Basisnachfrage (80% des tatsächlich angebotenen Volumen)
  // WICHTIG: Nachfrage basiert auf ANGEBOT, nicht auf Maschinenkapazität!
  const demandBoostMultiplier = actions?.demandBoost ? 1.3 : 1;
  const baseDemand = parameters.initialMarketSaturationFactor * totalOffered * demandBoostMultiplier;

  // 3. Berechne Durchschnittspreis

  const weightedPriceSum = inputs.reduce((sum, input) => {
    const offered = input.decision.production + input.decision.sellFromInventory;
    return sum + input.decision.price * offered;
  }, 0);

  const avgPrice = totalOffered > 0 ? weightedPriceSum / totalOffered : parameters.demandReferencePrice;

  // 4. Preiselastizität - Nachfrage wird durch höhere Preise reduziert
  const priceRatio = avgPrice / parameters.demandReferencePrice;
  const priceElasticityMultiplier = Math.max(
    0.01,  // Allow demand to drop to 1% at extreme prices (realistic competition)
    Math.min(1.0, 1 - parameters.priceElasticityFactor * (priceRatio - 1))
  );

  // Nachfrage wird durch Preiselastizität und Marktsättigung bestimmt
  // NICHT durch Angebot (Angebot und Nachfrage sind getrennt!)
  const adjustedDemand = Math.floor(baseDemand * priceElasticityMultiplier);

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

  // 6. Sequentielle Nachfrageverteilung: Günstigster Preis zuerst
  const soldUnitsMap = calculateInversePriceSales(inputs, adjustedDemand, parameters);

  // 7. Berechne Ergebnisse für jede Gruppe
  const results: MarketCalculationResult[] = inputs.map((input) => {
    const { groupId, decision, groupState } = input;

    // Verkaufte Menge aus sequentieller Verteilung
    const soldUnits = soldUnitsMap[groupId] || 0;

    // Lagerbestand
    const endingInventory = Math.floor(groupState.inventory + decision.production - soldUnits);

    // Umsatz
    const revenue = Math.round(soldUnits * decision.price * 100) / 100;

    // Kosten

    // Variable Produktionskosten (mit F&E-Vorteil)
    let effectiveVariableCost = groupState.machines.reduce((sum, m) => {
      return sum + m.variableCostPerUnit * m.capacity;
    }, 0) / groupState.machines.reduce((sum, m) => sum + m.capacity, 0);

    if (groupState.rndBenefitApplied) {
      effectiveVariableCost *= 1 - parameters.rndVariableCostReduction;
    }

    const productionCosts = Math.round(decision.production * effectiveVariableCost * 100) / 100;

    // Lagerkosten
    const inventoryCostPerUnit = actions?.noInventoryCosts ? 0 : parameters.inventoryCostPerUnit;
    const inventoryCost = Math.round(endingInventory * inventoryCostPerUnit * 100) / 100;

    // F&E-Kosten
    const rndCost = Math.round((decision.rndInvestment || 0) * 100) / 100;

    // Maschinenkauf
    let machineCost = 0;
    const newMachines = [...groupState.machines];
    if (decision.newMachine) {
      const machine = MACHINE_OPTIONS.find((m) => m.name === decision.newMachine);
      if (machine) {
        machineCost = Math.round(machine.cost * 100) / 100;
        newMachines.push(machine);
      }
    }

    // Machine Depreciation: Reduce capacity if enabled
    // Calculate capacity lost due to depreciation
    let capacityLostToDepreciation = 0;
    const depreciationRate = parameters.machineDepreciationEnabled && parameters.machineDepreciationRate 
      ? parameters.machineDepreciationRate 
      : 0;

    if (depreciationRate > 0 && newMachines.length > 0) {
      // Calculate capacity before depreciation
      const capacityBefore = newMachines.reduce((sum, m) => sum + m.capacity, 0);
      
      // Reduce machine capacity by depreciation rate
      for (const machine of newMachines) {
        machine.capacity = Math.max(0, Math.floor(machine.capacity * (1 - depreciationRate)));
      }
      
      // Calculate capacity lost
      const capacityAfter = newMachines.reduce((sum, m) => sum + m.capacity, 0);
      capacityLostToDepreciation = capacityBefore - capacityAfter;
    }

    // Marktanalyse
    const hasMarketAnalysis = actions?.freeMarketAnalysis || decision.buyMarketAnalysis;
    const marketAnalysisCost = hasMarketAnalysis ? (actions?.freeMarketAnalysis ? 0 : Math.round(parameters.marketAnalysisCost * 100) / 100) : 0;

    // Gesamtkosten
    const totalCosts = Math.round((productionCosts + inventoryCost + rndCost + machineCost + marketAnalysisCost) * 100) / 100;

    // Gewinn vor Zinsen
    const profitBeforeInterest = Math.round((revenue - totalCosts) * 100) / 100;

    // Neues Kapital berechnen (vor Zinsen)
    const capitalBeforeInterest = Math.round((groupState.capital + profitBeforeInterest) * 100) / 100;

    // Negativzinsen
    const interest = capitalBeforeInterest < 0 
      ? Math.round(Math.abs(capitalBeforeInterest) * parameters.negativeCashInterestRate * 100) / 100
      : 0;

    // Endgültiger Gewinn
    const profit = Math.round((profitBeforeInterest - interest) * 100) / 100;

    // Neues Kapital
    const endingCapital = Math.round((capitalBeforeInterest - interest) * 100) / 100;

    // F&E-Vorteil prüfen (nur wenn in aktivePeriodActions aktiviert)
    const rndThreshold = actions?.allowRnD ? (actions.rndThreshold || 10000) : Infinity;
    const newCumulativeRndInvestment = groupState.cumulativeRndInvestment + rndCost;
    const newRndBenefitApplied = !!(actions?.allowRnD && (
      newCumulativeRndInvestment >= rndThreshold || groupState.rndBenefitApplied
    ));

    // Ergebnis
    const result: PeriodResult = {
      period,
      price: Math.round(decision.price * 100) / 100,
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
      marketShare: adjustedDemand > 0 ? Math.round((soldUnits / adjustedDemand) * 100 * 100) / 100 : 0,
      averageMarketPrice: hasMarketAnalysis ? Math.round(avgPrice * 100) / 100 : 0,
      totalMarketDemand: hasMarketAnalysis ? Math.floor(adjustedDemand) : 0,
      machineDepreciationCapacityLost: capacityLostToDepreciation || 0,
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
 * Option 2: Sequential with Softening - Realistischer Preiskonkurrenz-Mechanismus
 * 
 * Grundprinzip:
 * - Kunden kaufen vom günstigsten Anbieter zuerst
 * - Jeder Anbieter bekommt 80% der verbleibenden Nachfrage (bis zu seiner Kapazität)
 * - Dies ermöglicht realistische Preiskonkurrenz ohne "Winner-Takes-All"
 * 
 * Beispiel bei 480 Nachfrage:
 * - Gruppe A (€50, 100 Cap): 80% von 480 = 384, aber Cap = 100 → bekommt 100
 * - Verbleibend: 380 Nachfrage
 * - Gruppe B (€60, 500 Cap): 80% von 380 = 304 → bekommt 304
 * - Verbleibend: 76 Nachfrage
 * - Gruppe C (€100, 500 Cap): 80% von 76 = 61 → bekommt 61
 */
function calculateInversePriceSales(
  inputs: MarketCalculationInput[],
  totalDemand: number,
  parameters: GameParameters
): { [groupId: string]: number } {
  // Sortiere nach Preis (günstig zuerst)
  const sortedByPrice = inputs
    .map(input => ({
      id: input.groupId,
      price: Math.max(0.01, input.decision.price),
      supply: Math.max(0, input.decision.production + input.decision.sellFromInventory),
    }))
    .sort((a, b) => a.price - b.price);

  const soldUnits: { [groupId: string]: number } = {};
  let remainingDemand = totalDemand;
  
  // Konstante für "Softening" - jede Gruppe bekommt 80% der verbleibenden Nachfrage
  const SOFTENING_FACTOR = 0.8;

  console.log(`[Market Calc] Total Demand: ${totalDemand}, Total Supply: ${sortedByPrice.reduce((s, g) => s + g.supply, 0)}`);

  // Iteriere durch Gruppen nach Preis (günstig zuerst)
  for (let i = 0; i < sortedByPrice.length; i++) {
    const entry = sortedByPrice[i];
    
    if (remainingDemand <= 0) {
      console.log(`[Market Calc] Group ${i}: No remaining demand`);
      break;
    }

    // Diese Gruppe bekommt 80% der verbleibenden Nachfrage
    // ABER: Wenn es die letzte Gruppe ist, bekommt sie den Rest
    const isLastGroup = i === sortedByPrice.length - 1;
    const targetDemand = isLastGroup 
      ? remainingDemand  // Letzte Gruppe bekommt alles verbleibende
      : Math.floor(remainingDemand * SOFTENING_FACTOR);
    
    // Aber begrenzt durch ihre verfügbare Kapazität
    const allocationToGroup = Math.min(targetDemand, entry.supply);
    
    console.log(`[Market Calc] Group ${i} (€${entry.price}, Supply: ${entry.supply}): Target=${targetDemand}, Allocated=${allocationToGroup}, Remaining before=${remainingDemand}, After=${remainingDemand - allocationToGroup}`);
    
    if (allocationToGroup > 0) {
      soldUnits[entry.id] = allocationToGroup;
      remainingDemand -= allocationToGroup;
    }
  }

  console.log(`[Market Calc] Final allocation:`, soldUnits, `Remaining demand not fulfilled: ${remainingDemand}`);

  return soldUnits;
}

/**
 * Berechnet Verkaufsanteile basierend auf Preis und Marketing (VERALTET - nur für Referenz)
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

  // F&E wird nicht mehr automatisch validiert - nur wenn über Aktionen aktiviert
  // Die Validierung erfolgt in der Berechnung basierend auf activePeriodActions

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
