# Referenz: Original Markt-Match 5 Spielparameter

**Quelle:** Original HTML/JS-Implementierung (Version 1.9.16, 25.05.2025)

## Maschinen (Produktionsanlagen)

Alle Schwierigkeitsstufen verwenden dieselben Maschinen:

| Name | Kosten | Kapazität | Variable Kosten/Einheit |
|------|--------|-----------|-------------------------|
| SmartMini-Fertiger | 5.000 € | 100 | 6,00 € |
| KompaktPro-Produzent | 12.000 € | 250 | 5,00 € |
| FlexiTech-Assembler | 18.000 € | 350 | 4,50 € |
| MegaFlow-Manufaktur | 25.000 € | 500 | 4,00 € |

## Spielparameter nach Schwierigkeitsgrad

### Easy (Einfacher Markt)
- **Startkapital:** 35.000 €
- **Marktanalyse-Kosten:** 300 €
- **Negativzinssatz:** 8%
- **Initialer Marktsättigungsfaktor:** 0,85
- **Preiselastizitätsfaktor:** 0,4
- **Nachfrage-Referenzpreis:** 22,00 €
- **Min. Nachfragemultiplikator:** 0,30
- **Lagerkosten pro Einheit:** 5,00 €
- **F&E-Vorteil Schwelle:** 2.500 €
- **F&E Variable Kostenreduzierung:** 15%
- **Maschinen-Degradationsrate:** 0%
- **F&E aktiviert:** Nein
- **Timer-Dauer:** 8 Minuten
- **Marketing-Effektivitätsfaktor:** 0,04

### Medium (Mittlerer Markt)
- **Startkapital:** 30.000 €
- **Marktanalyse-Kosten:** 400 €
- **Negativzinssatz:** 10%
- **Initialer Marktsättigungsfaktor:** 0,75
- **Preiselastizitätsfaktor:** 0,6
- **Nachfrage-Referenzpreis:** 20,00 €
- **Min. Nachfragemultiplikator:** 0,20
- **Lagerkosten pro Einheit:** 7,00 €
- **F&E-Vorteil Schwelle:** 3.000 €
- **F&E Variable Kostenreduzierung:** 12%
- **Maschinen-Degradationsrate:** 0%
- **F&E aktiviert:** Ja
- **Timer-Dauer:** 8 Minuten
- **Marketing-Effektivitätsfaktor:** 0,03

### Hard (Schwieriger Markt)
- **Startkapital:** 25.000 €
- **Marktanalyse-Kosten:** 500 €
- **Negativzinssatz:** 12%
- **Initialer Marktsättigungsfaktor:** 0,65
- **Preiselastizitätsfaktor:** 0,8
- **Nachfrage-Referenzpreis:** 18,00 €
- **Min. Nachfragemultiplikator:** 0,10
- **Lagerkosten pro Einheit:** 9,00 €
- **F&E-Vorteil Schwelle:** 3.500 €
- **F&E Variable Kostenreduzierung:** 10%
- **Maschinen-Degradationsrate:** 1%
- **F&E aktiviert:** Ja
- **Timer-Dauer:** 8 Minuten
- **Marketing-Effektivitätsfaktor:** 0,02

## Spielablauf

### Phase 0: Maschinenauswahl (vor Periode 1)
Jede Gruppe wählt ihre erste Produktionsmaschine aus dem verfügbaren Startkapital.

### Perioden-Entscheidungen
Gruppen treffen folgende Entscheidungen pro Periode:
1. **Produktionsmenge** (begrenzt durch Maschinenkapazität)
2. **Verkaufen aus Lagerbestand** (zusätzlich zur Produktion)
3. **Verkaufspreis pro Einheit**
4. **Marketing-Bemühung** (nur Periode 5, Skala 1-10)
5. **Marktanalyse kaufen** (optional)
6. **F&E-Investition** (ab Periode 3, falls aktiviert)
7. **Zusätzliche Maschine kaufen** (ab Periode 3, dann alle 3 Perioden: 6, 9, ...)

### Wichtige Mechaniken
- **Lagerkosten:** Anfallend für unverkaufte Einheiten am Periodenende
- **Negativzinsen:** Auf negative Kontostände am Periodenende
- **F&E-Vorteil:** Kumulierte Investition über Schwelle → permanente Kostenreduzierung
- **Maschinen-Degradation:** Jährlicher Kapazitätsverlust (nur Hard-Mode)
- **Marketing:** Beeinflusst Absatzanteil in Periode 5

## Berechnung Marktnachfrage

1. **Basisnachfrage:** Initialer Marktsättigungsfaktor × Gesamtproduktionskapazität aller Gruppen
2. **Preiselastizität:** Nachfrage sinkt bei höherem Durchschnittspreis (begrenzt durch Min. Multiplikator)
3. **Marketing-Bonus:** Individuelle Marketing-Bewertung erhöht Absatzanteil

## UI/UX Details
- **Tooltips:** Info-Boxen bei Hover über Eingabefelder (aktivierbar)
- **Auto-Save:** Automatische Speicherung des Spielstands
- **Druckfunktionen:** Anleitungen, Ergebnisse, Schülervorlagen
- **Dark Mode:** Umschaltbar

## Begleitmaterial
1. Schülervorlage: Entscheidungen & Ergebnisse
2. Arbeitsauftrag: Vorstellungsrunde
3. Arbeitsauftrag: Marketingkonzept
4. Reflexionsphasen & Auswertung
5. Glossar wirtschaftlicher Begriffe
6. Kennenlernspiele Vorschläge
