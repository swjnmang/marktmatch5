# 🚀 Schnellanleitung: Commits mit Auto-Versionierung

## Option 1: Batch-Script (Empfohlen für Windows)

```bash
# Einfach das Batch-Script verwenden:
commit.bat "feat: deine Commit-Nachricht"

# Dann pushen:
git push
```

Das Script führt automatisch aus:
1. ✓ Version aktualisieren (Datum, Zeit, Commit-Hash)
2. ✓ Alle Änderungen hinzufügen
3. ✓ Commit erstellen

## Option 2: Manuell

```bash
# 1. Version aktualisieren
npm run version:update

# 2. Committen
git add .
git commit -m "deine Nachricht"
git push
```

## Was wird aktualisiert?

- **Version**: Aus `package.json` (z.B. 1.2.0)
- **Datum**: Aktuelles Datum im Format DD.MM.YYYY
- **Zeit**: Aktuelle Uhrzeit im Format HH:MM
- **Commit-Hash**: Kurzer Git-Hash des letzten Commits
- **Anzeige**: Automatisch auf der Homepage sichtbar

## Version ändern

```bash
# Patch (1.2.0 -> 1.2.1)
npm version patch

# Minor (1.2.0 -> 1.3.0)  
npm version minor

# Major (1.2.0 -> 2.0.0)
npm version major

# Dann committen
commit.bat "chore: bump version"
git push
```

## Neue Features-Liste aktualisieren

Bearbeite in `src/app/page.tsx` die Liste unter "Neue Features" manuell.

---

**Wichtig**: Verwende ab jetzt immer `commit.bat` oder führe `npm run version:update` vor jedem Commit aus!
