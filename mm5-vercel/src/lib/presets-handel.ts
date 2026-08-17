import type { GameParametersHandel, HandelPreset, QualityTierDefinition } from "./types-handel";

export const PRESET_PARAMETERS_HANDEL: Record<HandelPreset, GameParametersHandel> = {
  easy: {
    startingCapital: 50000,
    periodDurationMinutes: 15,
    marketAnalysisCost: 2000,
    negativeCashInterestRate: 0.05,
    initialMarketSaturationFactor: 0.8,
    priceElasticityFactor: 0.8,
    demandReferencePrice: 100,
    inventoryCostPerUnit: 5,
    marketingEffectivenessFactor: 0.3,
    purchaseNegotiationThreshold: 2500,
    purchaseNegotiationDiscount: 0.15,
    demandBoostNextPeriod: false,
    freeMarketAnalysisNextPeriod: false,
    noInventoryCostsNextPeriod: false,
    allowNegotiationNextPeriod: false,
    customEventNextPeriod: "",
  },
  medium: {
    startingCapital: 40000,
    periodDurationMinutes: 12,
    marketAnalysisCost: 3000,
    negativeCashInterestRate: 0.08,
    initialMarketSaturationFactor: 0.7,
    priceElasticityFactor: 1.0,
    demandReferencePrice: 100,
    inventoryCostPerUnit: 8,
    marketingEffectivenessFactor: 0.25,
    purchaseNegotiationThreshold: 3500,
    purchaseNegotiationDiscount: 0.12,
    demandBoostNextPeriod: false,
    freeMarketAnalysisNextPeriod: false,
    noInventoryCostsNextPeriod: false,
    allowNegotiationNextPeriod: false,
    customEventNextPeriod: "",
  },
  hard: {
    startingCapital: 30000,
    periodDurationMinutes: 10,
    marketAnalysisCost: 5000,
    negativeCashInterestRate: 0.12,
    initialMarketSaturationFactor: 0.6,
    priceElasticityFactor: 1.2,
    demandReferencePrice: 100,
    inventoryCostPerUnit: 12,
    marketingEffectivenessFactor: 0.2,
    purchaseNegotiationThreshold: 5000,
    purchaseNegotiationDiscount: 0.10,
    demandBoostNextPeriod: false,
    freeMarketAnalysisNextPeriod: false,
    noInventoryCostsNextPeriod: false,
    allowNegotiationNextPeriod: false,
    customEventNextPeriod: "",
  },
};

// Feste Qualitätsstufen je Schwierigkeitsgrad (analog zu MACHINE_OPTIONS im Produktionsmodus,
// hier aber als Preset-Konstante statt in der Formular-Komponente hartcodiert, da die Werte
// je Schwierigkeitsgrad variieren).
export const QUALITY_TIER_OPTIONS: Record<HandelPreset, QualityTierDefinition[]> = {
  easy: [
    {
      id: "standard",
      name: "Standardware",
      basePurchasePricePerUnit: 25,
      qualityMultiplier: 1.0,
      volumeDiscounts: [
        { minQuantity: 200, discountPercent: 0.05 },
        { minQuantity: 500, discountPercent: 0.1 },
      ],
    },
    {
      id: "branded",
      name: "Markenware",
      basePurchasePricePerUnit: 40,
      qualityMultiplier: 1.15,
      volumeDiscounts: [
        { minQuantity: 150, discountPercent: 0.05 },
        { minQuantity: 400, discountPercent: 0.1 },
      ],
    },
    {
      id: "premium",
      name: "Premiumware",
      basePurchasePricePerUnit: 60,
      qualityMultiplier: 1.35,
      volumeDiscounts: [
        { minQuantity: 100, discountPercent: 0.05 },
        { minQuantity: 300, discountPercent: 0.1 },
      ],
    },
  ],
  medium: [
    {
      id: "standard",
      name: "Standardware",
      basePurchasePricePerUnit: 28,
      qualityMultiplier: 1.0,
      volumeDiscounts: [
        { minQuantity: 220, discountPercent: 0.04 },
        { minQuantity: 550, discountPercent: 0.08 },
      ],
    },
    {
      id: "branded",
      name: "Markenware",
      basePurchasePricePerUnit: 45,
      qualityMultiplier: 1.15,
      volumeDiscounts: [
        { minQuantity: 170, discountPercent: 0.04 },
        { minQuantity: 450, discountPercent: 0.08 },
      ],
    },
    {
      id: "premium",
      name: "Premiumware",
      basePurchasePricePerUnit: 68,
      qualityMultiplier: 1.35,
      volumeDiscounts: [
        { minQuantity: 120, discountPercent: 0.04 },
        { minQuantity: 350, discountPercent: 0.08 },
      ],
    },
  ],
  hard: [
    {
      id: "standard",
      name: "Standardware",
      basePurchasePricePerUnit: 32,
      qualityMultiplier: 1.0,
      volumeDiscounts: [
        { minQuantity: 250, discountPercent: 0.03 },
        { minQuantity: 600, discountPercent: 0.06 },
      ],
    },
    {
      id: "branded",
      name: "Markenware",
      basePurchasePricePerUnit: 50,
      qualityMultiplier: 1.15,
      volumeDiscounts: [
        { minQuantity: 200, discountPercent: 0.03 },
        { minQuantity: 500, discountPercent: 0.06 },
      ],
    },
    {
      id: "premium",
      name: "Premiumware",
      basePurchasePricePerUnit: 75,
      qualityMultiplier: 1.35,
      volumeDiscounts: [
        { minQuantity: 150, discountPercent: 0.03 },
        { minQuantity: 400, discountPercent: 0.06 },
      ],
    },
  ],
};
