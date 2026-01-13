# Maschinenabschreibungen - Spielleiter-Anleitung

## Feature-Übersicht

**Maschinenabschreibungen** sind eine optionale Spielmechanik, die realistische wirtschaftliche Bedingungen simuliert: Maschinen verlieren mit der Zeit an Kapazität durch Verschleiß.

---

## Aktivierung

### Schritt-für-Schritt:
1. Gehe zu **Spielleiter** → **Spiel erstellen**
2. Wähle deine Schwierigkeitsstufe (Einfach/Mittel/Schwer)
3. Klicke auf **"Erweiterte Einstellungen anpassen"**
4. Scrolle zu **"🏭 Abschreibungen von Maschinen"**
5. Aktiviere die Checkbox: **"Maschinenabschreibungen aktivieren"**
6. Stelle den **Abschreibungssatz pro Periode** ein (Standard: 10%)

---

## Funktionsweise

### Berechnung:
```
Verbleibende Kapazität = Aktuelle Kapazität × (1 - Abschreibungssatz)
```

### Beispiel (10% Abschreibung):
| Periode | Start | Kapazität | Verlust | Ende |
|---------|-------|-----------|--------|------|
| 1       | 500   | -50       | 10%    | 450  |
| 2       | 450   | -45       | 10%    | 405  |
| 3       | 405   | -40.5     | 10%    | 364  |
| 4       | 364   | -36.4     | 10%    | 328  |

---

## Spielauswirkungen

### Für die Gruppen:
- 💥 **Beschränkung**: Produktionskapazität sinkt kontinuierlich
- 🎯 **Strategie**: FuE-Investitionen werden wichtiger zur Wiederherstellung
- 💰 **Kosten**: Maschineneinkauf wird strategischer
- 📊 **Schwierigkeit**: Spielverlauf wird anspruchsvoller

### Pädagogischer Wert:
- Realistische Geschäftssimulation
- Langfristiges strategisches Denken erforderlich
- Ressourcenmanagement wichtiger
- Technologie-Investitionen sinnvoller

---

## Empfohlene Abschreibungssätze

| Szenario | Satz | Schwierigkeit |
|----------|------|---------------|
| Einfach (keine Abschreibung) | 0% | Anfänger |
| Moderate Herausforderung | 5% | Mittel |
| Standard | **10%** | Empfohlen |
| Anspruchsvoll | 15% | Erfahrene |
| Sehr realistisch | 20% | Experten |

---

## Anzeige der Abschreibungen

### Für Gruppen sichtbar:
- **Periode-Auswertung**: "Abschreibungen (XX%): -500 Stück"
- **Verfügbare Kapazität**: Angepasst nach Abschreibung
- **Leaderboard**: Berücksichtigt Kapazitätsverlust

### Im Screenshot-Slider (Startseite):
- Screenshot 8 zeigt Beispiel-Auswertung mit Abschreibungen

---

## Best Practices

✅ **DO:**
- Kommuniziere die Abschreibungsrate zu Beginn
- Erkläre die wirtschaftliche Bedeutung
- Nutze es für Langzeit-Spiele (8+ Perioden)
- Kombiniere mit anderen Modifiern (z.B. FuE-Effekte)

❌ **DON'T:**
- Nutze Abschreibungen in sehr kurzen Spielen (< 3 Perioden)
- Setze Satz zu hoch (> 20%), macht Spiel zu frustrierend
- Ändere Satz während laufendem Spiel ohne Ankündigung

---

## Häufig Gestellte Fragen (FAQ)

**F: Können Gruppen die Abschreibungen verhindern?**  
A: Nein, Abschreibungen wirken sich automatisch auf alle Maschinen aus. FuE-Investitionen helfen aber, neue Kapazität aufzubauen.

**F: Betrifft das auch gekaufte Maschinen in späteren Perioden?**  
A: Ja, ALLE Maschinen einer Gruppe erfahren die gleiche Abschreibungsrate.

**F: Kann ich die Rate während des Spiels ändern?**  
A: Technisch möglich, aber nicht empfohlen. Kommuniziere die Rate vorher klar.

**F: Wie zeige ich Gruppen die Abschreibungen?**  
A: In der Periode-Auswertung sehen sie "Abschreibungen: -X Stück" angezeigt.

---

## Tipps für Verschiedene Unterrichtsszenarien

### 📚 Grundlagen (Klasse 8-9):
- Abschreibungen deaktivieren oder sehr niedrig (< 5%)
- Fokus auf erste Entscheidungen

### 🏢 Mittelstufe (Klasse 10-11):
- Standard 10% aktivieren
- 6-8 Perioden spielen
- Fokus auf Langzeitstrategien

### 💼 Projektkurs/Betriebswirtschaft:
- 15-20% für realistisches Szenario
- 10+ Perioden mit allen Modifiern
- Kombination mit Marktstudien

---

## Weitere Ressourcen

- [Implementierung Details](IMPLEMENTATION_SUMMARY.md)
- [Typ-Definitionen](src/lib/types.ts)
- [Berechnung Logik](src/lib/gameLogic.ts)

---

**Viel Erfolg beim nächsten Planspiel! 🎮**
