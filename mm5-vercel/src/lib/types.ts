import type { Timestamp } from "firebase/firestore";

export type MarketPreset = "easy" | "medium" | "hard";

export interface GameParameters {
  startingCapital: number;
  periodDurationMinutes: number;
  marketAnalysisCost: number;
  negativeCashInterestRate: number;
  initialMarketSaturationFactor: number;
  priceElasticityFactor: number;
  demandReferencePrice: number;
  minPriceElasticityDemandMultiplier: number;
  inventoryCostPerUnit: number;
  rndBenefitThreshold: number;
  rndVariableCostReduction: number;
  machineDegradationRate: number;
  marketingEffectivenessFactor: number;
  allowMachinePurchaseNextPeriod?: boolean;
  demandBoostNextPeriod?: boolean;
  freeMarketAnalysisNextPeriod?: boolean;
  noInventoryCostsNextPeriod?: boolean;
  customEventNextPeriod?: string;
  // Inverse Preisverteilung Steuerung
  priceExponent?: number; // α: Preissensitivität (z. B. 2)
  maxMarketShareCap?: number; // s_max: Anteilscap pro Anbieter (z. B. 0.5)
  // Machine Depreciation
  machineDepreciationEnabled?: boolean; // Enable/disable machine capacity depreciation
  machineDepreciationRate?: number; // Percentage per period (e.g., 0.10 for 10%)
}

export interface PeriodActions {
  period: number;
  allowMachinePurchase?: boolean;
  demandBoost?: boolean;
  freeMarketAnalysis?: boolean;
  noInventoryCosts?: boolean;
  customEvent?: string;
  allowRnD?: boolean;
  rndThreshold?: number;
}

export interface Machine {
  name: string;
  cost: number;
  capacity: number;
  variableCostPerUnit: number;
}

export interface GroupState {
  id: string;
  name: string;
  capital: number;
  inventory: number;
  cumulativeProfit: number;
  machines: Machine[];
  cumulativeRndInvestment: number;
  rndBenefitApplied: boolean;
  status: "waiting" | "ready" | "submitted" | "calculated" | "selecting";
  selectedMachine?: string;
  joinedAt?: Timestamp; // Firestore Timestamp
  lastResult?: PeriodResult;
  isAI?: boolean; // Flag for AI-controlled groups in Solo mode
  aiStrategy?: "aggressive" | "conservative" | "balanced" | "innovative";
  instructionsAcknowledged?: boolean; // Flag for acknowledging game instructions
}

export interface PeriodDecision {
  groupId: string;
  period: number;
  production: number;
  sellFromInventory: number;
  price: number;
  marketingEffort: number;
  buyMarketAnalysis: boolean;
  rndInvestment: number;
  newMachine: string;
  submittedAt?: Timestamp; // Firestore Timestamp
}

export interface PeriodResult {
  period: number;
  price?: number;
  soldUnits: number;
  revenue: number;
  productionCosts: number;
  variableCosts: number;
  inventoryCost: number;
  rndCost: number;
  machineCost: number;
  marketAnalysisCost: number;
  interest: number;
  totalCosts: number;
  profit: number;
  endingInventory: number;
  endingCapital: number;
  marketShare?: number;
  averageMarketPrice: number;
  totalMarketDemand: number;
  // Machine depreciation info
  machineDepreciationCapacityLost?: number; // Units of capacity lost due to depreciation
}

export interface GameDocument {
  gameName: string; // Name des Spiels/der Lobby
  adminPin: string; // Admin-PIN für Spielleiter
  joinPin: string; // Ein gemeinsamer PIN für alle Gruppen
  parameters: GameParameters;
  groups: GroupState[];
  period: number;
  status: "lobby" | "in_progress" | "finished";
  phase?: "machine_selection" | "decisions" | "results";
  phaseEndsAt?: number;
  periodDeadline?: number; // Timestamp when current period decision phase ends
  allowMachinePurchase?: boolean;
  activePeriodActions?: PeriodActions;
  createdAt?: Timestamp; // Firestore Timestamp
  isSoloMode?: boolean; // Flag for Solo mode games
  humanGroupId?: string; // ID of the human player's group in Solo mode
}
export interface SpecialTask {
  id: string;
  period: number;
  title: string;
  description: string;
  createdAt?: Timestamp; // Firestore Timestamp
}