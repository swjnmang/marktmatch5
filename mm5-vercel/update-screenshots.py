#!/usr/bin/env python3
"""Replace all screenshot SVGs with realistic mockups"""

screenshots = {
    "screenshot-2.svg": '''<svg viewBox="0 0 1280 800" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#f8fafc;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#e2e8f0;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="1280" height="800" fill="url(#bgGradient)"/>
  <rect width="1280" height="80" fill="#1e40af"/>
  <text x="640" y="50" font-size="32" font-weight="bold" fill="white" text-anchor="middle">Ranking - Ihre Position</text>
  <rect x="150" y="130" width="320" height="120" rx="12" fill="white" stroke="#d4af37" stroke-width="3"/>
  <text x="180" y="160" font-size="48">🥇</text>
  <text x="250" y="165" font-size="18" font-weight="bold" fill="#1e40af">Team Alpha</text>
  <text x="250" y="215" font-size="24" font-weight="bold" fill="#059669">€250.000</text>
  <rect x="500" y="130" width="320" height="120" rx="12" fill="white" stroke="#0ea5e9" stroke-width="4"/>
  <text x="530" y="160" font-size="48">🥈</text>
  <text x="600" y="165" font-size="18" font-weight="bold" fill="#1e40af">Team Beta (You)</text>
  <text x="600" y="215" font-size="24" font-weight="bold" fill="#0ea5e9">€185.500</text>
  <rect x="150" y="300" width="700" height="80" rx="8" fill="white" stroke="#cbd5e1" stroke-width="1"/>
  <text x="180" y="335" font-size="16" fill="#1e40af" font-weight="600">4. Team Delta</text>
  <text x="700" y="335" font-size="16" fill="#059669" font-weight="bold">€98.500</text>
</svg>''',
    
    "screenshot-3.svg": '''<svg viewBox="0 0 1280 800" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad3" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#f8fafc;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#e2e8f0;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="1280" height="800" fill="url(#bgGrad3)"/>
  <rect width="1280" height="70" fill="#1e40af"/>
  <text x="100" y="48" font-size="28" font-weight="bold" fill="white">Meine Daten einsehen</text>
  <rect x="80" y="100" width="550" height="160" rx="12" fill="white" stroke="#dbeafe" stroke-width="2"/>
  <rect x="80" y="100" width="550" height="40" rx="12" fill="#dbeafe"/>
  <text x="110" y="130" font-size="18" font-weight="bold" fill="#1e40af">💰 Finanzen</text>
  <text x="110" y="180" font-size="13" fill="#64748b">Verfügbares Kapital</text>
  <text x="550" y="180" font-size="13" fill="#1e40af" font-weight="bold" text-anchor="end">€125.600</text>
  <text x="110" y="210" font-size="13" fill="#64748b">Kumulierter Gewinn</text>
  <text x="550" y="210" font-size="13" fill="#059669" font-weight="bold" text-anchor="end">€45.600</text>
</svg>''',
    
    "screenshot-4.svg": '''<svg viewBox="0 0 1280 800" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad4" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#f8fafc;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#e2e8f0;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="1280" height="800" fill="url(#bgGrad4)"/>
  <rect width="1280" height="70" fill="#7c3aed"/>
  <text x="100" y="48" font-size="28" font-weight="bold" fill="white">Spielleiter-Kontrolle</text>
  <rect x="80" y="100" width="380" height="140" rx="12" fill="white" stroke="#e0e7ff" stroke-width="2"/>
  <text x="110" y="130" font-size="16" font-weight="bold" fill="#5b21b6">Aktuelle Periode</text>
  <text x="110" y="165" font-size="48" font-weight="bold" fill="#7c3aed">3</text>
  <text x="170" y="165" font-size="36" fill="#cbd5e1">/</text>
  <text x="200" y="165" font-size="36" fill="#7c3aed">10</text>
  <rect x="500" y="100" width="380" height="140" rx="12" fill="white" stroke="#e0e7ff" stroke-width="2"/>
  <text x="530" y="130" font-size="16" font-weight="bold" fill="#5b21b6">Spieler bereit</text>
  <text x="530" y="165" font-size="48" font-weight="bold" fill="#7c3aed">7</text>
  <text x="620" y="165" font-size="36" fill="#7c3aed">/ 8</text>
</svg>''',
    
    "screenshot-5.svg": '''<svg viewBox="0 0 1280 800" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad5" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#f8fafc;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#e2e8f0;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="1280" height="800" fill="url(#bgGrad5)"/>
  <rect width="1280" height="70" fill="#1e40af"/>
  <text x="100" y="48" font-size="28" font-weight="bold" fill="white">Marktlage - Periode 3</text>
  <rect x="80" y="100" width="1120" height="110" rx="8" fill="white" stroke="#cbd5e1" stroke-width="1"/>
  <rect x="100" y="120" width="8" height="70" fill="#f59e0b" rx="4"/>
  <text x="130" y="140" font-size="16" font-weight="bold" fill="#1e40af">Team Alpha</text>
  <text x="130" y="165" font-size="13" fill="#64748b">Preis: €85 | Marktanteil: 24% | Lager: 450</text>
  <text x="1100" y="165" font-size="16" font-weight="bold" fill="#059669" text-anchor="end">€250.000</text>
</svg>''',
    
    "screenshot-6.svg": '''<svg viewBox="0 0 1280 800" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad6" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#f8fafc;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#e2e8f0;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="1280" height="800" fill="url(#bgGrad6)"/>
  <rect width="1280" height="70" fill="#1e40af"/>
  <text x="100" y="48" font-size="28" font-weight="bold" fill="white">Solo-Modus gegen KI</text>
  <rect x="80" y="100" width="540" height="150" rx="12" fill="white" stroke="#dbeafe" stroke-width="2"/>
  <text x="110" y="130" font-size="18" font-weight="bold" fill="#1e40af">Ihr Ergebnis</text>
  <text x="110" y="165" font-size="14" fill="#64748b">Ihr Gewinn</text>
  <text x="510" y="165" font-size="24" font-weight="bold" fill="#059669" text-anchor="end">€165.200</text>
</svg>''',
    
    "screenshot-7.svg": '''<svg viewBox="0 0 1280 800" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad7" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#f8fafc;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#e2e8f0;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="1280" height="800" fill="url(#bgGrad7)"/>
  <rect width="1280" height="70" fill="#1e40af"/>
  <text x="100" y="48" font-size="28" font-weight="bold" fill="white">Periode 3 - Ergebnisse</text>
  <rect x="80" y="100" width="540" height="90" rx="12" fill="white" stroke="#dbeafe" stroke-width="2"/>
  <text x="110" y="130" font-size="14" fill="#64748b">Verkaufte Menge</text>
  <text x="110" y="165" font-size="36" font-weight="bold" fill="#1e40af">1.200</text>
  <text x="320" y="165" font-size="16" fill="#64748b">Einheiten</text>
  <rect x="80" y="320" width="1120" height="140" rx="12" fill="#ecfdf5" stroke="#10b981" stroke-width="3"/>
  <text x="110" y="355" font-size="18" font-weight="bold" fill="#065f46">Gewinn dieser Periode</text>
  <text x="110" y="420" font-size="64" font-weight="bold" fill="#059669">€21.500</text>
</svg>''',
    
    "screenshot-8.svg": '''<svg viewBox="0 0 1280 800" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad8" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#f8fafc;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#e2e8f0;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="1280" height="800" fill="url(#bgGrad8)"/>
  <rect width="1280" height="70" fill="#1e40af"/>
  <text x="100" y="48" font-size="28" font-weight="bold" fill="white">Investitionen & Technologie</text>
  <rect x="80" y="100" width="550" height="180" rx="12" fill="white" stroke="#c7d2fe" stroke-width="2"/>
  <rect x="80" y="100" width="550" height="40" rx="12" fill="#c7d2fe"/>
  <text x="110" y="130" font-size="18" font-weight="bold" fill="#4f46e5">🔬 F&E Investitionen</text>
  <text x="110" y="180" font-size="13" fill="#64748b">Total investiert</text>
  <text x="550" y="180" font-size="16" font-weight="bold" fill="#4f46e5" text-anchor="end">€50.000</text>
</svg>''',
}

import os
path = "/mnt/c/Users/mailt/OneDrive/KI Programme/MM5/marktmatch5/mm5-vercel/public"

for filename, content in screenshots.items():
    with open(os.path.join(path, filename), "w") as f:
        f.write(content)
    print(f"✓ Updated {filename}")

print(f"\n✓ All {len(screenshots)} screenshots updated successfully!")
