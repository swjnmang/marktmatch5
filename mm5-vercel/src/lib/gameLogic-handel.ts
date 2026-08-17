import type {
  GameParametersHandel,
  GroupStateHandel,
  PeriodActionsHandel,
  PeriodDecisionHandel,
  PeriodResultHandel,
  QualityTierDefinition,
  TierId,
  TierRecord,
} from "./types-handel";
import { TIER_IDS, emptyTierRecord } from "./types-handel";

export interface MarketCalculationInputHandel {
  groupId: string;
  decision: PeriodDecisionHandel;
  groupState: GroupStateHandel;
}

export interface MarketCalculationResultHandel {
  groupId: string;
  result: PeriodResultHandel;
  newCapital: number;
  newInventory: TierRecord;
  newCumulativeProfit: number;
  newCumulativeNegotiationInvestment: number;
  newNegotiationBenefitApplied: boolean;
}

function findTierDef(tierDefinitions: QualityTierDefinition[], tier: TierId): QualityTierDefinition {
  const def = tierDefinitions.find((t) => t.id === tier);
  if (!def) throw new Error(`Unbekannte Qualitätsstufe: ${tier}`);
  return def;
}

// Höchster erreichter Mengenrabatt für eine Einkaufsmenge dieser Qualitätsstufe in dieser Periode.
function getVolumeDiscount(quantity: number, tierDef: QualityTierDefinition): number {
  let discount = 0;
  for (const step of tierDef.volumeDiscounts) {
    if (quantity >= step.minQuantity) discount = Math.max(discount, step.discountPercent);
  }
  return discount;
}

// Einkaufspreis/Einheit inkl. Mengenrabatt und (falls freigeschaltet) Einkaufsverhandlungs-Rabatt.
// Von calculateMarketHandel UND validateDecisionHandel genutzt, damit beide nie auseinanderlaufen.
export function effectivePurchaseUnitPrice(
  tierDef: QualityTierDefinition,
  quantity: number,
  negotiationBenefitApplied: boolean,
  parameters: GameParametersHandel
): number {
  const volumeDiscount = getVolumeDiscount(quantity, tierDef);
  let unitPrice = tierDef.basePurchasePricePerUnit * (1 - volumeDiscount);
  if (negotiationBenefitApplied) {
    unitPrice *= 1 - parameters.purchaseNegotiationDiscount;
  }
  return unitPrice;
}

/**
 * Berechnet die Ergebnisse für alle Gruppen einer Periode im Handelsmodus.
 *
 * Kernidee gegenüber dem Produktionsmodus: statt einem Angebots-"Posten" pro Gruppe
 * gibt es hier bis zu drei Posten pro Gruppe (einen je Qualitätsstufe mit Angebot > 0).
 * Jeder Posten konkurriert einzeln um Marktanteil am gemeinsamen Nachfrage-Pool - die
 * Qualitätsstufe wirkt dabei als zusätzlicher Attraktivitäts-Multiplikator, strukturell
 * genau wie der Marketing-Bonus im Produktionsmodus.
 */
export function calculateMarketHandel(
  parameters: GameParametersHandel,
  tierDefinitions: QualityTierDefinition[],
  period: number,
  inputs: MarketCalculationInputHandel[],
  activeActions?: PeriodActionsHandel
): MarketCalculationResultHandel[] {
  const actions = activeActions && activeActions.period === period ? activeActions : undefined;

  // 1. Angebots-Posten aufbauen: eine (Gruppe, Qualitätsstufe)-Kombination je Zeile
  interface Posten {
    groupId: string;
    tier: TierId;
    price: number;
    offered: number;
    qualityMultiplier: number;
  }
  const posten: Posten[] = [];
  for (const input of inputs) {
    for (const tier of TIER_IDS) {
      const offered =
        Math.max(0, input.groupState.currentPeriodPurchases[tier] || 0) +
        Math.max(0, input.decision.sellFromInventoryByTier[tier] || 0);
      if (offered > 0) {
        posten.push({
          groupId: input.groupId,
          tier,
          price: Math.max(0.01, input.decision.pricesByTier[tier] || 0.01),
          offered,
          qualityMultiplier: findTierDef(tierDefinitions, tier).qualityMultiplier,
        });
      }
    }
  }

  // 2. Gesamtangebot & Basisnachfrage (identisch zum Produktionsmodus, nur auf Postenebene)
  const totalOffered = posten.reduce((sum, p) => sum + p.offered, 0);
  const demandBoostMultiplier = actions?.demandBoost ? 1.3 : 1;
  const baseDemand = parameters.initialMarketSaturationFactor * totalOffered * demandBoostMultiplier;

  // 3. Mindestpreis & gewichteter Durchschnittspreis über ALLE Posten (für Elastizität/Analyse)
  const minPrice = posten.length > 0 ? Math.min(...posten.map((p) => p.price)) : parameters.demandReferencePrice;
  const weightedPriceSum = posten.reduce((sum, p) => sum + p.price * p.offered, 0);
  const avgPrice = totalOffered > 0 ? weightedPriceSum / totalOffered : parameters.demandReferencePrice;

  // 4. Preiselastizität - unverändert vom Produktionsmodus übernommen (siehe dortige
  // ausführliche Begründung), nur dass minPrice hier über alle Posten läuft.
  const priceRatio = minPrice / parameters.demandReferencePrice;
  const linearElasticity = 1 - parameters.priceElasticityFactor * (priceRatio - 1);
  const decayingFloor = 0.005 + 0.2 * Math.exp(-0.15 * Math.max(0, priceRatio - 2));
  const priceElasticityMultiplier = Math.max(decayingFloor, Math.min(1.0, linearElasticity));
  const adjustedDemand = Math.floor(baseDemand * priceElasticityMultiplier);

  // 5. Marktverteilung auf Postenebene
  const soldByPosten = calculateInversePriceAllocationHandel(posten, inputs, adjustedDemand, parameters, period);

  // 6. Posten-Ergebnisse zu "verkaufte Menge je Gruppe & Stufe" aggregieren
  const soldUnitsByGroup: { [groupId: string]: TierRecord } = {};
  for (const input of inputs) soldUnitsByGroup[input.groupId] = emptyTierRecord();
  posten.forEach((p, idx) => {
    soldUnitsByGroup[p.groupId][p.tier] = soldByPosten[idx] || 0;
  });

  // 7. Finanzen pro Gruppe berechnen
  const results: MarketCalculationResultHandel[] = inputs.map((input) => {
    const { groupId, decision, groupState } = input;
    const soldUnitsByTier = soldUnitsByGroup[groupId];

    const purchaseCostsByTier = emptyTierRecord();
    const inventoryCostByTier = emptyTierRecord();
    const revenueByTier = emptyTierRecord();
    const endingInventoryByTier = emptyTierRecord();

    for (const tier of TIER_IDS) {
      // Einkaufsmenge & -kosten stehen bereits fest: Der Kauf wurde während der Periode
      // per "Einkaufen"-Button sofort bezahlt (siehe game-form.tsx). Hier NICHT neu
      // berechnen, sonst würden nachträgliche Rabatt-Änderungen einen längst bezahlten
      // Einkauf rückwirkend verändern.
      const qty = Math.max(0, groupState.currentPeriodPurchases[tier] || 0);
      purchaseCostsByTier[tier] = Math.round((groupState.currentPeriodPurchaseCosts[tier] || 0) * 100) / 100;

      const soldQty = soldUnitsByTier[tier];
      const endingInventory = Math.floor(groupState.inventory[tier] + qty - soldQty);
      endingInventoryByTier[tier] = endingInventory;

      const inventoryCostPerUnit = actions?.noInventoryCosts ? 0 : parameters.inventoryCostPerUnit;
      inventoryCostByTier[tier] = Math.round(endingInventory * inventoryCostPerUnit * 100) / 100;

      revenueByTier[tier] = Math.round(soldQty * (decision.pricesByTier[tier] || 0) * 100) / 100;
    }

    const soldUnits = TIER_IDS.reduce((sum, t) => sum + soldUnitsByTier[t], 0);
    const revenue = Math.round(TIER_IDS.reduce((sum, t) => sum + revenueByTier[t], 0) * 100) / 100;
    const purchaseCosts = Math.round(TIER_IDS.reduce((sum, t) => sum + purchaseCostsByTier[t], 0) * 100) / 100;
    const inventoryCost = Math.round(TIER_IDS.reduce((sum, t) => sum + inventoryCostByTier[t], 0) * 100) / 100;
    const endingInventoryTotal = TIER_IDS.reduce((sum, t) => sum + endingInventoryByTier[t], 0);

    const negotiationCost = Math.round((decision.negotiationInvestment || 0) * 100) / 100;
    const marketingCost = period >= 5 ? Math.round((decision.marketingEffort || 0) * 100) / 100 : 0;

    const hasMarketAnalysis = actions?.freeMarketAnalysis || decision.buyMarketAnalysis;
    const marketAnalysisCost = hasMarketAnalysis
      ? actions?.freeMarketAnalysis
        ? 0
        : Math.round(parameters.marketAnalysisCost * 100) / 100
      : 0;

    const totalCosts =
      Math.round((purchaseCosts + inventoryCost + negotiationCost + marketingCost + marketAnalysisCost) * 100) / 100;

    // WICHTIG: Der Einkauf (purchaseCosts) wurde schon beim "Einkaufen"-Klick vom Kapital
    // abgebucht (groupState.capital ist hier bereits NACH dem Einkauf). Für den "Gewinn"
    // zählt er trotzdem als Kosten dieser Periode (echte Kostenrechnung), aber beim
    // tatsächlichen Kapitalstand darf er nicht ein zweites Mal abgezogen werden.
    const profitBeforeInterest = Math.round((revenue - totalCosts) * 100) / 100;
    const nonPurchaseCosts =
      Math.round((inventoryCost + negotiationCost + marketingCost + marketAnalysisCost) * 100) / 100;
    const capitalBeforeInterest = Math.round((groupState.capital + revenue - nonPurchaseCosts) * 100) / 100;
    const interest =
      capitalBeforeInterest < 0
        ? Math.round(Math.abs(capitalBeforeInterest) * parameters.negativeCashInterestRate * 100) / 100
        : 0;
    const profit = Math.round((profitBeforeInterest - interest) * 100) / 100;
    const endingCapital = Math.round((capitalBeforeInterest - interest) * 100) / 100;

    // Einkaufsverhandlungs-Vorteil (Ersatz für F&E): nur wenn der Spielleiter allowNegotiation
    // für diese Periode aktiv geschaltet hat, analog zu allowRnD im Produktionsmodus.
    const negotiationThreshold = actions?.allowNegotiation
      ? actions.negotiationThreshold || parameters.purchaseNegotiationThreshold
      : Infinity;
    const newCumulativeNegotiationInvestment = groupState.cumulativeNegotiationInvestment + negotiationCost;
    const newNegotiationBenefitApplied = !!(
      actions?.allowNegotiation &&
      (newCumulativeNegotiationInvestment >= negotiationThreshold || groupState.negotiationBenefitApplied)
    );

    const result: PeriodResultHandel = {
      period,
      pricesByTier: { ...decision.pricesByTier },
      soldUnitsByTier,
      soldUnits,
      revenueByTier,
      revenue,
      purchaseCostsByTier,
      purchaseCosts,
      inventoryCostByTier,
      inventoryCost,
      negotiationCost,
      marketingCost,
      marketAnalysisCost,
      interest,
      totalCosts,
      profit,
      endingInventoryByTier,
      endingInventoryTotal,
      endingCapital,
      // Marktbericht ist wie im Produktionsmodus an den Kauf der Marktanalyse gekoppelt.
      marketShare: hasMarketAnalysis && adjustedDemand > 0 ? Math.round((soldUnits / adjustedDemand) * 100 * 100) / 100 : 0,
      averageMarketPrice: hasMarketAnalysis ? Math.round(avgPrice * 100) / 100 : 0,
      totalMarketDemand: hasMarketAnalysis ? Math.floor(adjustedDemand) : 0,
    };

    return {
      groupId,
      result,
      newCapital: endingCapital,
      newInventory: endingInventoryByTier,
      newCumulativeProfit: groupState.cumulativeProfit + profit,
      newCumulativeNegotiationInvestment,
      newNegotiationBenefitApplied,
    };
  });

  return results;
}

/**
 * Posten-basierte Variante des inversen Preis-Modells aus dem Produktionsmodus
 * (siehe dortige ausführliche Erklärung in gameLogic.ts). Statt einer Zeile pro Gruppe
 * gibt es hier eine Zeile pro (Gruppe, Qualitätsstufe)-Posten; die Qualitätsstufe wirkt
 * dabei zusätzlich zum inversen Preis als Attraktivitäts-Multiplikator. Der Marketing-Bonus
 * bleibt ein Gruppen-Feld (kein Stufen-Feld) und wird identisch auf alle Posten einer
 * Gruppe angewendet.
 */
function calculateInversePriceAllocationHandel(
  posten: { groupId: string; tier: TierId; price: number; offered: number; qualityMultiplier: number }[],
  inputs: MarketCalculationInputHandel[],
  totalDemand: number,
  parameters: GameParametersHandel,
  period: number
): number[] {
  const totalMarketingEffort = inputs.reduce((sum, i) => sum + Math.max(0, i.decision.marketingEffort || 0), 0);
  const isMarketingActive = period >= 5 && totalMarketingEffort > 0;
  const marketingMultiplierByGroup: { [groupId: string]: number } = {};
  for (const input of inputs) {
    const effort = Math.max(0, input.decision.marketingEffort || 0);
    marketingMultiplierByGroup[input.groupId] = isMarketingActive
      ? 1 + (effort / totalMarketingEffort) * parameters.marketingEffectivenessFactor
      : 1;
  }

  const attractiveness = posten.map(
    (p) => (1 / p.price) * p.qualityMultiplier * marketingMultiplierByGroup[p.groupId]
  );
  const attractivenessSum = attractiveness.reduce((sum, a) => sum + a, 0);

  const targetDemand = posten.map((p, idx) => {
    const share = attractivenessSum > 0 ? attractiveness[idx] / attractivenessSum : 0;
    return Math.floor(share * totalDemand);
  });

  const sold = posten.map((p, idx) => Math.min(targetDemand[idx], p.offered));
  let totalSold = sold.reduce((sum, s) => sum + s, 0);

  // Restnachfrage (weil ein Posten nicht genug Angebot hat) aufsteigend nach Preis an
  // Posten mit Restkapazität weiterreichen - identischer Waterfall wie im Produktionsmodus.
  let unallocatedDemand = totalDemand - totalSold;
  if (unallocatedDemand > 0) {
    const order = posten
      .map((p, idx) => idx)
      .sort((a, b) => posten[a].price - posten[b].price);
    for (const idx of order) {
      if (unallocatedDemand <= 0) break;
      const remaining = posten[idx].offered - sold[idx];
      const take = Math.min(remaining, unallocatedDemand);
      if (take > 0) {
        sold[idx] += take;
        totalSold += take;
        unallocatedDemand -= take;
      }
    }
  }

  return sold;
}

/**
 * Validiert eine Entscheidung im Handelsmodus.
 */
export function validateDecisionHandel(
  decision: Partial<PeriodDecisionHandel>,
  groupState: GroupStateHandel,
  tierDefinitions: QualityTierDefinition[],
  parameters: GameParametersHandel,
  period: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const sellFromInventoryByTier = decision.sellFromInventoryByTier || emptyTierRecord();
  const pricesByTier = decision.pricesByTier || emptyTierRecord();

  for (const tier of TIER_IDS) {
    const tierDef = findTierDef(tierDefinitions, tier);
    const purchasedThisPeriod = groupState.currentPeriodPurchases[tier] ?? 0;
    const sellFromInventory = sellFromInventoryByTier[tier] ?? 0;
    const price = pricesByTier[tier] ?? 0;

    if (sellFromInventory < 0) errors.push(`Verkauf aus Lager (${tierDef.name}) darf nicht negativ sein.`);
    if (sellFromInventory > groupState.inventory[tier]) {
      errors.push(
        `Verkauf aus Lager (${tierDef.name}: ${sellFromInventory}) überschreitet Lagerbestand (${groupState.inventory[tier]}).`
      );
    }
    const offered = Math.max(0, purchasedThisPeriod) + Math.max(0, sellFromInventory);
    if (offered > 0 && price <= 0) {
      errors.push(`Verkaufspreis (${tierDef.name}) muss größer als 0 sein, sobald Ware angeboten wird.`);
    }
  }

  const negotiationInvestment = decision.negotiationInvestment ?? 0;
  const marketingEffort = decision.marketingEffort ?? 0;
  if (negotiationInvestment < 0) errors.push("Einkaufsverhandlungs-Investition darf nicht negativ sein.");
  if (marketingEffort < 0) errors.push("Marketing-Investition darf nicht negativ sein.");

  // Einkauf ist zu diesem Zeitpunkt schon bezahlt (siehe "Einkaufen"-Button) und daher
  // schon im aktuellen Kapital berücksichtigt - hier zählt nur noch, was NEU dazukommt.
  const totalCommitted = Math.max(0, negotiationInvestment) + Math.max(0, marketingEffort);
  if (totalCommitted > groupState.capital) {
    errors.push(
      `Einkaufsverhandlung + Marketing (${Math.round(totalCommitted)}) übersteigt das verfügbare Kapital (${Math.round(groupState.capital)}).`
    );
  }

  // Periode 1 mit leerem Lager: ohne Einkauf gibt es nichts zu verkaufen.
  const inventoryEmpty = TIER_IDS.every((t) => groupState.inventory[t] === 0);
  const totalPurchasedThisPeriod = TIER_IDS.reduce((sum, t) => sum + (groupState.currentPeriodPurchases[t] || 0), 0);
  if (period === 1 && inventoryEmpty && totalPurchasedThisPeriod <= 0) {
    errors.push("Bitte kauft zuerst mindestens eine Qualitätsstufe ein - euer Lager ist noch leer.");
  }

  return { valid: errors.length === 0, errors };
}
