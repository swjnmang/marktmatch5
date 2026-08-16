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

  // 3. Berechne Mindestpreis und Durchschnittspreis (für Analysen)
  const minPrice = inputs.length > 0 
    ? Math.min(...inputs.map(i => i.decision.price)) 
    : parameters.demandReferencePrice;

  const weightedPriceSum = inputs.reduce((sum, input) => {
    const offered = input.decision.production + input.decision.sellFromInventory;
    return sum + input.decision.price * offered;
  }, 0);

  const avgPrice = totalOffered > 0 ? weightedPriceSum / totalOffered : parameters.demandReferencePrice;

  // 4. Preiselastizität - Nachfrage wird durch MINIMUMPREIS-Verhältnis berechnet
  // WICHTIG: Wir nutzen den MINIMUMPREIS nicht den Durchschnitt!
  // Grund: Mit Inverse Price Allocation ist der Markt noch offen für günstige Gruppen.
  // Nur wenn ALLE Preise über Referenz sind, reduzieren wir Nachfrage.
  const priceRatio = minPrice / parameters.demandReferencePrice;
  const linearElasticity = 1 - parameters.priceElasticityFactor * (priceRatio - 1);
  // Bis zum 2-fachen Referenzpreis: normale lineare Elastizität (unverändertes Verhalten).
  // Darüber hinaus: der Nachfrage-Boden fällt selbst exponentiell weiter ab, statt bei 20%
  // hart einzurasten. So bestraft der Markt auch Fantasiepreise, bei denen ALLE Gruppen weit
  // über dem Referenzpreis liegen (z. B. die ganze Klasse einigt sich unbeabsichtigt auf
  // überteuerte Preise) - statt trotzdem für alle satten Gewinn zu garantieren.
  const decayingFloor = 0.005 + 0.2 * Math.exp(-0.15 * Math.max(0, priceRatio - 2));
  const priceElasticityMultiplier = Math.max(
    decayingFloor,
    Math.min(1.0, linearElasticity)
  );

  // Nachfrage wird durch Preiselastizität und Marktsättigung bestimmt
  // Mit Inverse Price Allocation wird diese Nachfrage dann korrekt zu günstigen Gruppen verteilt!
  const adjustedDemand = Math.floor(baseDemand * priceElasticityMultiplier);

  // 5. Inverse Preis-Nachfrageverteilung: Je günstiger der Preis, desto höher der Marktanteil
  // Das ist realistisch: Kunden kaufen das Günstigste. Der Markt crasht nicht durch extreme Preise.
  // Ab Periode 5 verschiebt Marketing-Investition den Marktanteil zusätzlich zugunsten der Gruppe.
  const soldUnitsMap = calculateInversePriceAllocation(inputs, adjustedDemand, parameters, period);

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

    // Marketing-Kosten (nur ab Periode 5 wirksam - siehe calculateInversePriceAllocation)
    const marketingCost = period >= 5 ? Math.round((decision.marketingEffort || 0) * 100) / 100 : 0;

    // Maschinenkauf erfolgt über den separaten Maschinenauswahl-Screen (game-form.tsx),
    // nicht über die Periodenentscheidung - hier fallen daher keine Maschinenkosten an.
    const machineCost = 0;
    const newMachines = [...groupState.machines];

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
    const totalCosts = Math.round((productionCosts + inventoryCost + rndCost + machineCost + marketingCost + marketAnalysisCost) * 100) / 100;

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
      marketingCost,
      marketAnalysisCost,
      interest,
      totalCosts,
      profit,
      endingInventory,
      endingCapital,
      // Marktbericht (Marktanteil, Durchschnittspreis, Gesamtnachfrage) und die
      // Konkurrenzanalyse sind beide an den Kauf der Marktanalyse gekoppelt.
      marketShare: hasMarketAnalysis && adjustedDemand > 0 ? Math.round((soldUnits / adjustedDemand) * 100 * 100) / 100 : 0,
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
/**
 * MODELL 1: INVERSES PREIS-MODELL (Inverse Price Allocation)
 * 
 * Formel: marketShare = (1/price) / sum(1/allPrices)
 * 
 * Interpretation:
 * - Realistisch: Kunden kaufen das Günstigste
 * - Je günstiger der Preis, desto höher die Nachfrage-Quote
 * - Der Markt crasht NICHT durch extreme Preise
 * - Teure Gruppen werden wirtschaftlich bestraft (niedriger Marktanteil)
 * 
 * Algorithmus:
 * 1. Berechne inverse Preise: 1/price für jede Gruppe
 * 2. Ab Periode 5: gewichte die Attraktivität zusätzlich mit dem relativen
 *    Marketing-Anteil der Gruppe (marketingEffort / Summe aller marketingEffort),
 *    skaliert über parameters.marketingEffectivenessFactor
 * 3. Marktanteil = eigene Attraktivität / Summe aller Attraktivitäten
 * 4. Allokiere: min(marktanteil * demand, produktion)
 * 5. Wenn Gruppe weniger produziert als ihr Marktanteil: Rest an nächstbilligere Gruppe
 */
function calculateInversePriceAllocation(
  inputs: MarketCalculationInput[],
  totalDemand: number,
  parameters: GameParameters,
  period: number
): { [groupId: string]: number } {
  // Schritt 1: Berechne Inverse für alle Gruppen
  const groupData = inputs.map(input => ({
    id: input.groupId,
    price: Math.max(0.01, input.decision.price),
    supply: Math.max(0, input.decision.production + input.decision.sellFromInventory),
    inverse: 1 / Math.max(0.01, input.decision.price),  // Inverse des Preises
    marketingEffort: Math.max(0, input.decision.marketingEffort || 0),
  }));

  // Schritt 2: Marketing-Bonus (nur ab Periode 5) - Anteil am gesamten Marketing-Budget,
  // skaliert über marketingEffectivenessFactor. Ohne Marketing-Ausgaben: Bonus = 0.
  const totalMarketingEffort = groupData.reduce((sum, g) => sum + g.marketingEffort, 0);
  const isMarketingActive = period >= 5 && totalMarketingEffort > 0;

  // Schritt 3: Attraktivität = Preis-Inverse * (1 + Marketing-Bonus)
  const attractivenessData = groupData.map(g => ({
    ...g,
    attractiveness: isMarketingActive
      ? g.inverse * (1 + (g.marketingEffort / totalMarketingEffort) * parameters.marketingEffectivenessFactor)
      : g.inverse,
  }));

  // Schritt 4: Summe der Attraktivitäten
  const attractivenessSum = attractivenessData.reduce((sum, g) => sum + g.attractiveness, 0);

  // Schritt 5: Berechne Marktanteile
  const marketShares = attractivenessData.map(g => ({
    ...g,
    marketShare: attractivenessSum > 0 ? g.attractiveness / attractivenessSum : 0,
  }));

  // Schritt 6: Erste Allokation (kann Überbieter sein)
  const firstAllocation = marketShares.map(g => ({
    ...g,
    targetDemand: Math.floor(g.marketShare * totalDemand),
  }));

  // Schritt 7: Begrenzen durch verfügbare Produktion
  const soldUnits: { [groupId: string]: number } = {};
  let totalSoldUnits = 0;

  // Allokiere Nachfrage basierend auf Marktanteilen und verfügbarer Kapazität
  // WICHTIG: Wenn eine Gruppe nicht genug Kapazität hat, bleibt die Nachfrage UNVERKAUFT
  // Das ist realistisch - der Markt kann nicht beliebig expandieren!
  firstAllocation.forEach(item => {
    const canSell = Math.min(item.targetDemand, item.supply);
    soldUnits[item.id] = canSell;
    totalSoldUnits += canSell;
    console.log(`[Inverse Model] Group €${item.price.toFixed(2)}: Inverse=${item.inverse.toFixed(6)}, Share=${(item.marketShare*100).toFixed(2)}%, Target=${item.targetDemand}, Capacity=${item.supply}, Sold=${canSell}`);
  });

  // Schritt 8: Überschüssige Nachfrage, die die günstigste Gruppe wegen fehlender Kapazität
  // nicht bedienen kann, wandert zur nächstgünstigeren Gruppe mit freier Kapazität - genau wie
  // im Solo-Modus (market-calculation.ts). Ohne diesen Schritt verpufft die Nachfrage einfach,
  // selbst wenn andere Gruppen problemlos hätten liefern können.
  let unallocatedDemand = totalDemand - totalSoldUnits;
  if (unallocatedDemand > 0) {
    const sortedByPrice = [...marketShares].sort((a, b) => a.price - b.price);
    for (const item of sortedByPrice) {
      if (unallocatedDemand <= 0) break;
      const alreadySold = soldUnits[item.id] || 0;
      const remainingCapacity = item.supply - alreadySold;
      const canTake = Math.min(remainingCapacity, unallocatedDemand);
      if (canTake > 0) {
        soldUnits[item.id] = alreadySold + canTake;
        totalSoldUnits += canTake;
        unallocatedDemand -= canTake;
        console.log(`[Inverse Model] Group €${item.price.toFixed(2)}: Taking ${canTake} from overflow → ${soldUnits[item.id]} total`);
      }
    }
  }

  if (unallocatedDemand > 0) {
    console.log(`[Inverse Model] ⚠️ Unmet Demand: ${unallocatedDemand} units - no group has remaining capacity`);
  }

  console.log(`[Market Calc - Inverse Model] Total Demand: ${totalDemand}, Total Sold: ${totalSoldUnits}, Unmet: ${unallocatedDemand}`);

  return soldUnits;
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

  // F&E-Investition: gegen verfügbares Kapital gedeckelt, damit ein Zahlendreher
  // (z. B. 999999 statt 9999) nicht die ganze restliche Session ruiniert. Verschuldung
  // bleibt über Produktion/Preis weiterhin möglich - hier geht es nur um Eingaben, die
  // keinerlei natürliche Obergrenze wie Maschinenkapazität haben.
  if (decision.rndInvestment !== undefined && decision.rndInvestment < 0) {
    errors.push("F&E-Investition darf nicht negativ sein.");
  } else if (decision.rndInvestment !== undefined && decision.rndInvestment > groupState.capital) {
    errors.push(`F&E-Investition (${decision.rndInvestment}) übersteigt das verfügbare Kapital (${groupState.capital}).`);
  }

  // Marketing-Investition (erst ab Periode 5 wirksam, siehe calculateInversePriceAllocation)
  if (decision.marketingEffort !== undefined && decision.marketingEffort < 0) {
    errors.push("Marketing-Investition darf nicht negativ sein.");
  } else if (decision.marketingEffort !== undefined && decision.marketingEffort > groupState.capital) {
    errors.push(`Marketing-Investition (${decision.marketingEffort}) übersteigt das verfügbare Kapital (${groupState.capital}).`);
  }

  // Maschinenkauf erfolgt über den separaten Maschinenauswahl-Screen, nicht über die
  // Periodenentscheidung - daher hier keine Validierung nötig.

  return { valid: errors.length === 0, errors };
}
