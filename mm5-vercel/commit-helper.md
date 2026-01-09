# Auto-Version Update Helper

Dieses Script hilft, die Version vor jedem Commit zu aktualisieren.

## Windows PowerShell Funktion

Füge diese Funktion zu deinem PowerShell Profil hinzu:

```powershell
function Commit-WithVersion {
    param(
        [string]$message
    )
    Set-Location "c:\Users\mailt\OneDrive\KI Programme\MM5\marktmatch5\mm5-vercel"
    npm run version:update
    git add .
    git commit -m $message
}

# Alias
Set-Alias gcv Commit-WithVersion
```

Dann kannst du einfach verwenden:
```powershell
gcv "feat: add new feature"
```

## Manueller Workflow

```bash
cd "c:\Users\mailt\OneDrive\KI Programme\MM5\marktmatch5\mm5-vercel"
npm run version:update
git add .
git commit -m "deine Nachricht"
git push
```

## Batch Script für Windows

Erstelle eine `commit.bat` Datei:

```batch
@echo off
npm run version:update
git add .
git commit -m %*
```

Verwendung:
```
commit.bat "feat: add new feature"
```
