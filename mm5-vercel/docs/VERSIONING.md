# Automatische Versionierung

Die Anwendung aktualisiert automatisch die Versionsinformationen bei jedem Commit.

## Wie es funktioniert

1. **Version File**: `src/lib/version.ts` enthält die aktuelle Version, Datum, Zeit und Commit-Hash
2. **Update Script**: `update-version.js` aktualisiert die Versionsdatei automatisch
3. **Vor jedem Commit**: Führe `npm run version:update` aus, um die Version zu aktualisieren

## Manuelle Aktualisierung

```bash
npm run version:update
```

## Version ändern

Die Versionsnummer wird aus `package.json` gelesen. Um die Version zu ändern:

```bash
# Kleinere Änderung (1.2.0 -> 1.2.1)
npm version patch

# Neue Features (1.2.0 -> 1.3.0)
npm version minor

# Große Änderungen (1.2.0 -> 2.0.0)
npm version major
```

Danach:
```bash
npm run version:update
git add .
git commit -m "chore: bump version to X.Y.Z"
git push
```

## Anzeige auf der Homepage

Die Version wird auf der Startseite angezeigt und automatisch aus `src/lib/version.ts` geladen.

## Features Liste aktualisieren

Bearbeite die Features-Liste in `src/app/page.tsx` manuell, um neue Features hervorzuheben.
