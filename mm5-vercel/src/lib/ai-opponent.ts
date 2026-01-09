import type { GroupState, PeriodDecision, GameDocument } from "./types";

const MACHINE_OPTIONS = [
  { name: "SmartMini-Fertiger", cost: 5000, capacity: 100, variableCostPerUnit: 6 },
  { name: "KompaktPro-Produzent", cost: 12000, capacity: 250, variableCostPerUnit: 5 },
  { name: "FlexiTech-Assembler", cost: 18000, capacity: 350, variableCostPerUnit: 4.5 },
  { name: "MegaFlow-Manufaktur", cost: 25000, capacity: 500, variableCostPerUnit: 4 },
];

/**
 * Select machine for AI group based on strategy
 */
export function selectAIMachine(
  group: GroupState,
  strategy: "aggressive" | "conservative" | "balanced" | "innovative"
): string {
  const affordableMachines = MACHINE_OPTIONS.filter(m => m.cost <= group.capital);
  
  if (affordableMachines.length === 0) {
    return MACHINE_OPTIONS[0].name; // Fallback to cheapest
  }

  switch (strategy) {
    case "aggressive":
      // Buy biggest affordable machine for max capacity
      return affordableMachines[affordableMachines.length - 1].name;
    
    case "conservative":
      // Buy cheapest or second cheapest
      return affordableMachines[Math.min(1, affordableMachines.length - 1)].name;
    
    case "balanced":
      // Buy middle option
      const midIndex = Math.floor(affordableMachines.length / 2);
      return affordableMachines[midIndex].name;
    
    case "innovative":
      // Buy expensive machine for lower variable costs
      return affordableMachines[affordableMachines.length - 1].name;
    
    default:
      return affordableMachines[0].name;
  }
}

/**
 * Generate AI decision for a period
 */
export function generateAIDecision(
  group: GroupState,
  game: GameDocument,
  period: number
): Omit<PeriodDecision, "submittedAt"> {
  const strategy = group.aiStrategy || "balanced";
  const totalCapacity = group.machines?.reduce((sum, m) => sum + m.capacity, 0) || 0;
  const avgVariableCost = group.machines?.length 
    ? group.machines.reduce((sum, m) => sum + m.variableCostPerUnit, 0) / group.machines.length 
    : 5;

  let production = 0;
  let sellFromInventory = 0;
  let price = 0;
  let marketingEffort = 0;
  let rndInvestment = 0;
  let buyMarketAnalysis = false;

  // Base reference price
  const basePrice = game.parameters.demandReferencePrice;

  switch (strategy) {
    case "aggressive":
      // High production, low prices, focus on market share
      production = Math.floor(totalCapacity * 0.95);
      sellFromInventory = Math.min(group.inventory, Math.floor(group.inventory * 0.8));
      price = basePrice * 0.85; // 15% below reference
      marketingEffort = Math.min(5000, group.capital * 0.1);
      buyMarketAnalysis = period % 2 === 0; // Every other period
      rndInvestment = 0;
      break;

    case "conservative":
      // Moderate production, stable prices
      production = Math.floor(totalCapacity * 0.6);
      sellFromInventory = Math.min(group.inventory, Math.floor(group.inventory * 0.5));
      price = basePrice * 1.0; // At reference price
      marketingEffort = Math.min(2000, group.capital * 0.04);
      buyMarketAnalysis = period === 1; // Only first period
      rndInvestment = 0;
      break;

    case "balanced":
      // Balanced approach
      production = Math.floor(totalCapacity * 0.75);
      sellFromInventory = Math.min(group.inventory, Math.floor(group.inventory * 0.6));
      price = basePrice * 0.95; // Slightly below reference
      marketingEffort = Math.min(3000, group.capital * 0.06);
      buyMarketAnalysis = period <= 2; // First two periods
      rndInvestment = period > 2 ? Math.min(3000, group.capital * 0.05) : 0;
      break;

    case "innovative":
      // Focus on R&D and premium pricing
      production = Math.floor(totalCapacity * 0.7);
      sellFromInventory = Math.min(group.inventory, Math.floor(group.inventory * 0.7));
      price = basePrice * 1.15; // Premium pricing
      marketingEffort = Math.min(4000, group.capital * 0.08);
      buyMarketAnalysis = true; // Always buy analysis
      rndInvestment = Math.min(5000, group.capital * 0.1);
      break;
  }

  // Safety checks
  production = Math.max(0, Math.min(production, totalCapacity));
  sellFromInventory = Math.max(0, Math.min(sellFromInventory, group.inventory));
  price = Math.max(10, price); // Minimum price
  marketingEffort = Math.max(0, marketingEffort);
  rndInvestment = Math.max(0, rndInvestment);

  // Ensure we can afford everything
  const totalCost = marketingEffort + rndInvestment + (buyMarketAnalysis ? game.parameters.marketAnalysisCost : 0);
  if (totalCost > group.capital * 0.5) {
    // Scale back if too expensive
    const scale = (group.capital * 0.5) / totalCost;
    marketingEffort = Math.floor(marketingEffort * scale);
    rndInvestment = Math.floor(rndInvestment * scale);
    if (totalCost > group.capital * 0.5) {
      buyMarketAnalysis = false;
    }
  }

  return {
    groupId: group.id,
    period,
    production,
    sellFromInventory,
    price: Math.round(price * 100) / 100, // Round to 2 decimals
    marketingEffort,
    buyMarketAnalysis,
    rndInvestment,
    newMachine: "",
  };
}

/**
 * Check if AI decisions should be auto-generated
 * Returns true if all AI groups need decisions
 */
export function shouldGenerateAIDecisions(groups: GroupState[]): boolean {
  const aiGroups = groups.filter(g => g.isAI);
  if (aiGroups.length === 0) return false;
  
  // Check if any AI group hasn't submitted
  return aiGroups.some(g => g.status !== "submitted");
}
