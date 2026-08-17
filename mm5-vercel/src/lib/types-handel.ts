import type { Timestamp } from "firebase/firestore";

export type HandelPreset = "easy" | "medium" | "hard";

export type TierId = "standard" | "branded" | "premium";

export const TIER_IDS: TierId[] = ["standard", "branded", "premium"];

export interface VolumeDiscountStep {
  minQuantity: number; // ab dieser Einkaufsmenge dieser Stufe in dieser Periode
  discountPercent: number; // z.B. 0.05 = 5% Rabatt auf den Einkaufspreis dieser Stufe
}

export interface QualityTierDefinition {
  id: TierId;
  name: string; // "Standardware" | "Markenware" | "Premiumware"
  basePurchasePricePerUnit: number;
  qualityMultiplier: number; // Attraktivitäts-Faktor im Markt, >= 1.0
  volumeDiscounts: VolumeDiscountStep[]; // aufsteigend nach minQuantity sortiert
}

export interface GameParametersHandel {
  startingCapital: number;
  periodDurationMinutes: number;
  marketAnalysisCost: number;
  negativeCashInterestRate: number;
  initialMarketSaturationFactor: number;
  priceElasticityFactor: number;
  demandReferencePrice: number;
  inventoryCostPerUnit: number;
  marketingEffectivenessFactor: number;
  // Einkaufsverhandlung (Ersatz für F&E im Produktionsmodus)
  purchaseNegotiationThreshold: number;
  purchaseNegotiationDiscount: number;
  // Nächste-Periode-Events (vom Spielleiter gesteuert)
  demandBoostNextPeriod?: boolean;
  freeMarketAnalysisNextPeriod?: boolean;
  noInventoryCostsNextPeriod?: boolean;
  allowNegotiationNextPeriod?: boolean;
  negotiationThresholdNextPeriod?: number;
  customEventNextPeriod?: string;
}

export interface PeriodActionsHandel {
  period: number;
  demandBoost?: boolean;
  freeMarketAnalysis?: boolean;
  noInventoryCosts?: boolean;
  allowNegotiation?: boolean;
  negotiationThreshold?: number;
  customEvent?: string;
}

export type TierRecord = Record<TierId, number>;

export function emptyTierRecord(): TierRecord {
  return { standard: 0, branded: 0, premium: 0 };
}

export interface GroupStateHandel {
  id: string;
  name: string;
  capital: number;
  inventory: TierRecord;
  // Bereits in dieser Periode gekaufte (und sofort bezahlte) Ware je Qualitätsstufe.
  // Wird beim Klick auf "Einkaufen" befüllt und bei jedem Periodenwechsel geleert.
  currentPeriodPurchases: TierRecord;
  // Tatsächlich beim Einkauf abgebuchter Betrag je Stufe (inkl. Mengenrabatt/Verhandlung
  // zum Kaufzeitpunkt) - wird für die Auswertung 1:1 übernommen, nicht neu berechnet,
  // damit sich später geänderte Rabatte nicht rückwirkend auf einen bereits bezahlten
  // Einkauf auswirken.
  currentPeriodPurchaseCosts: TierRecord;
  cumulativeProfit: number;
  cumulativeNegotiationInvestment: number;
  negotiationBenefitApplied: boolean;
  status: "waiting" | "submitted" | "calculated";
  joinedAt?: Timestamp;
  lastActivityTime?: number;
  lastResult?: PeriodResultHandel;
  instructionsAcknowledged?: boolean;
}

export interface PeriodDecisionHandel {
  groupId: string;
  period: number;
  sellFromInventoryByTier: TierRecord;
  pricesByTier: TierRecord;
  marketingEffort: number;
  buyMarketAnalysis: boolean;
  negotiationInvestment: number;
  submittedAt?: Timestamp;
}

export interface PeriodResultHandel {
  period: number;
  soldUnitsByTier: TierRecord;
  soldUnits: number;
  pricesByTier: TierRecord;
  revenueByTier: TierRecord;
  revenue: number;
  purchaseCostsByTier: TierRecord;
  purchaseCosts: number;
  inventoryCostByTier: TierRecord;
  inventoryCost: number;
  negotiationCost: number;
  marketingCost: number;
  marketAnalysisCost: number;
  interest: number;
  totalCosts: number;
  profit: number;
  endingInventoryByTier: TierRecord;
  endingInventoryTotal: number;
  endingCapital: number;
  marketShare?: number;
  averageMarketPrice: number;
  totalMarketDemand: number;
}

export interface GameDocumentHandel {
  gameName: string;
  adminPin: string;
  joinPin: string;
  parameters: GameParametersHandel;
  qualityTiers: QualityTierDefinition[]; // Snapshot der Preset-Qualitätsstufen bei Spielerstellung
  period: number;
  status: "lobby" | "in_progress" | "finished";
  phase?: "decisions" | "results";
  phaseEndsAt?: number;
  periodDeadline?: number;
  activePeriodActions?: PeriodActionsHandel;
  createdAt?: Timestamp;
}
