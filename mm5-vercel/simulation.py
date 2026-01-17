#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MarktMatch5 - Nachfrage-Elastizität Simulation
Simuliert 4 Gruppen mit unterschiedlichen Preisen und Produktionsmengen
"""

# ============================================
# PARAMETER
# ============================================
INITIAL_MARKET_SATURATION = 0.8  # 80% des ANGEBOTS (nicht der Kapazität!)
DEMAND_REFERENCE_PRICE = 100.0   # €100
PRICE_ELASTICITY_FACTOR = 0.8    # 80% Elastizitätsfaktor
MIN_ELASTICITY_MULTIPLIER = 0.3  # Minimum 30% der Basis-Nachfrage

# ============================================
# 4 GRUPPEN-SZENARIO
# ============================================
groups = [
    {
        "name": "Gruppe A (Billigstrategie)",
        "production": 200,
        "from_inventory": 0,
        "price": 45.00,
        "machines": {"capacity": 400},  # Annahme für Beispiel
    },
    {
        "name": "Gruppe B (Günstiger)",
        "production": 300,
        "from_inventory": 50,
        "price": 65.00,
        "machines": {"capacity": 500},
    },
    {
        "name": "Gruppe C (Referenz-Preis)",
        "production": 250,
        "from_inventory": 30,
        "price": 100.00,
        "machines": {"capacity": 450},
    },
    {
        "name": "Gruppe D (Premium)",
        "production": 180,
        "from_inventory": 20,
        "price": 135.00,
        "machines": {"capacity": 350},
    },
]

# ============================================
# BERECHNUNGEN
# ============================================

print("=" * 80)
print("MARKTSIMULATION - 4 GRUPPEN SZENARIO")
print("=" * 80)
print()

# 1. Gesamtkapazität
total_capacity = sum(g["machines"]["capacity"] for g in groups)
print(f"📊 SCHRITT 1: GESAMTKAPAZITÄT")
for g in groups:
    print(f"  {g['name']:30s} → {g['machines']['capacity']:3d} Einheiten")
print(f"  {'─' * 40}")
print(f"  {'Gesamtkapazität':30s} → {total_capacity:3d} Einheiten")
print()

# 2. Basis-Nachfrage
base_demand = INITIAL_MARKET_SATURATION * total_offered
print(f"📊 SCHRITT 2: BASIS-NACHFRAGE")
print(f"  Basis-Nachfrage = {INITIAL_MARKET_SATURATION} × {total_offered} = {base_demand:.0f} Einheiten")
print()

# 3. Durchschnittspreis (gewichtet)
total_offered = sum(g["production"] + g["from_inventory"] for g in groups)
weighted_price_sum = sum(
    g["price"] * (g["production"] + g["from_inventory"]) 
    for g in groups
)
avg_price = weighted_price_sum / total_offered if total_offered > 0 else DEMAND_REFERENCE_PRICE

print(f"📊 SCHRITT 3: DURCHSCHNITTSPREIS (GEWICHTET)")
for g in groups:
    offered = g["production"] + g["from_inventory"]
    contribution = g["price"] * offered
    pct = (offered / total_offered * 100) if total_offered > 0 else 0
    print(f"  {g['name']:30s} → €{g['price']:6.2f} × {offered:3d} = €{contribution:8.0f} ({pct:5.1f}%)")
print(f"  {'─' * 40}")
print(f"  {'Gewichteter Durchschnittspreis':30s} → €{avg_price:.2f}")
print(f"  {'Gesamtangebot':30s} → {total_offered} Einheiten")
print()

# 4. Preiselastizität
price_ratio = avg_price / DEMAND_REFERENCE_PRICE
elasticity_formula = 1 - PRICE_ELASTICITY_FACTOR * (price_ratio - 1)
elasticity_multiplier_old = max(MIN_ELASTICITY_MULTIPLIER, elasticity_formula)  # ALT
elasticity_multiplier_new = max(MIN_ELASTICITY_MULTIPLIER, min(1.0, elasticity_formula))  # NEU

print(f"📊 SCHRITT 4: PREISELASTIZITÄT")
print(f"  Durchschnittspreis (€{avg_price:.2f}) vs. Referenzpreis (€{DEMAND_REFERENCE_PRICE:.2f})")
print(f"  Preis-Ratio = {avg_price:.2f} / {DEMAND_REFERENCE_PRICE:.2f} = {price_ratio:.4f}")
print()
print(f"  Elastizitäts-Formel: 1 - {PRICE_ELASTICITY_FACTOR} × ({price_ratio:.4f} - 1)")
print(f"  Elastizitäts-Formel: 1 - {PRICE_ELASTICITY_FACTOR} × {price_ratio - 1:.4f}")
print(f"  Rohergebnis: {elasticity_formula:.4f}")
print()
print(f"  ❌ ALT (VOR FIX):  max({MIN_ELASTICITY_MULTIPLIER}, {elasticity_formula:.4f}) = {elasticity_multiplier_old:.4f}")
print(f"  ✅ NEU (NACH FIX): max({MIN_ELASTICITY_MULTIPLIER}, min(1.0, {elasticity_formula:.4f})) = {elasticity_multiplier_new:.4f}")
print()

# 5. Angepasste Nachfrage
adjusted_demand_old = int(base_demand * elasticity_multiplier_old)
adjusted_demand_new = int(base_demand * elasticity_multiplier_new)

print(f"📊 SCHRITT 5: ANGEPASSTE NACHFRAGE")
print(f"  ALT (VOR FIX):  {base_demand:.0f} × {elasticity_multiplier_old:.4f} = {adjusted_demand_old} Einheiten")
print(f"  NEU (NACH FIX): {base_demand:.0f} × {elasticity_multiplier_new:.4f} = {adjusted_demand_new} Einheiten")
print()

if elasticity_multiplier_old != elasticity_multiplier_new:
    diff = adjusted_demand_old - adjusted_demand_new
    pct_diff = (diff / adjusted_demand_new * 100) if adjusted_demand_new > 0 else 0
    print(f"  🔧 FIX-AUSWIRKUNG: {diff:+d} Einheiten ({pct_diff:+.1f}%)")
print()

# 6. Sequentielle Nachfrageverteilung (sortiert nach Preis)
print(f"📊 SCHRITT 6: SEQUENTIELLE NACHFRAGEVERTEILUNG")
print(f"  (Günstigster Preis zuerst, 80% Softening Factor)")
print()

# Sortiere nach Preis
sorted_groups = sorted(
    [(i, g) for i, g in enumerate(groups)],
    key=lambda x: x[1]["price"]
)

SOFTENING_FACTOR = 0.8
remaining_demand_new = adjusted_demand_new
allocation_new = {}

print(f"  {'Rang':<4s} {'Gruppe':<30s} {'Preis':<8s} {'Angebot':<8s} {'Ziel-NF':<8s} {'Allokation':<8s}")
print(f"  {'─' * 80}")

for rank, (orig_idx, group) in enumerate(sorted_groups):
    supply = group["production"] + group["from_inventory"]
    is_last = rank == len(sorted_groups) - 1
    
    target_demand = remaining_demand_new if is_last else int(remaining_demand_new * SOFTENING_FACTOR)
    allocation = min(target_demand, supply)
    
    allocation_new[orig_idx] = allocation
    remaining_demand_new -= allocation
    
    status = "✓ LETZTE" if is_last else ""
    print(f"  {rank+1:<4d} {group['name']:<30s} €{group['price']:<7.2f} {supply:<8d} {target_demand:<8d} {allocation:<8d} {status}")

print()

# 7. Zusammenfassung und Verkaufsanteile
print(f"📊 SCHRITT 7: ERGEBNISSE PRO GRUPPE")
print()

total_revenue_new = 0
for orig_idx, group in enumerate(groups):
    allocated = allocation_new[orig_idx]
    revenue = allocated * group["price"]
    total_revenue_new += revenue
    
    market_share = (allocated / adjusted_demand_new * 100) if adjusted_demand_new > 0 else 0
    
    print(f"  {group['name']}")
    print(f"    Preis:           €{group['price']:.2f}")
    print(f"    Angebot:         {group['production'] + group['from_inventory']} Einheiten")
    print(f"    Verkauft (NEU):  {allocated} Einheiten")
    print(f"    Marktanteil:     {market_share:.1f}%")
    print(f"    Umsatz:          €{revenue:,.0f}")
    print()

print(f"  MARKT-TOTAL:")
print(f"    Gesamtnachfrage: {adjusted_demand_new} Einheiten")
print(f"    Gesamtumsatz:    €{total_revenue_new:,.0f}")
print()

# ============================================
# VERGLEICH ALT vs NEU
# ============================================
print(f"🔧 ELASTIZITÄT-FIX VERGLEICH")
print(f"  {'Metrik':<40s} {'VOR FIX':<15s} {'NACH FIX':<15s} {'Differenz':<15s}")
print(f"  {'─' * 85}")
print(f"  {'Elastizitäts-Multiplier':<40s} {elasticity_multiplier_old:>14.4f} {elasticity_multiplier_new:>14.4f} {elasticity_multiplier_new - elasticity_multiplier_old:>+14.4f}")
print(f"  {'Gesamtnachfrage':<40s} {adjusted_demand_old:>14d} {adjusted_demand_new:>14d} {adjusted_demand_new - adjusted_demand_old:>+14d}")
if adjusted_demand_old > 0:
    pct_change = ((adjusted_demand_new - adjusted_demand_old) / adjusted_demand_old * 100)
    print(f"  {'Prozentuale Änderung':<40s} {'':15s} {'':15s} {pct_change:>+13.1f}%")
print()

print("=" * 80)
