export type MarketPreset = "easy" | "medium" | "hard";

export interface GameParameters {
  startingCapital: number;
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
  isRndEnabled: boolean;
  marketingEffectivenessFactor: number;
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
  joinCode: string;
  capital: number;
  inventory: number;
  cumulativeProfit: number;
  machines: Machine[];
  cumulativeRndInvestment: number;
  rndBenefitApplied: boolean;
  status: "pending" | "submitted" | "calculated";
}

export interface PeriodDecision {
  production: number;
  sellFromInventory: number;
  price: number;
  marketingEffort?: number;
  buyMarketAnalysis: boolean;
  rndInvestment?: number;
  newMachine?: string;
}

export interface PeriodResult {
  soldUnits: number;
  revenue: number;
  variableCosts: number;
  inventoryCost: number;
  interest: number;
  profit: number;
  endingInventory: number;
  endingCapital: number;
}

export interface GameDocument {
  preset: MarketPreset;
  groups: GroupState[];
  period: number;
  status: "waiting" | "in_progress" | "finished";
  createdAt?: any; // Firestore Timestamp
}
