````markdown
# Markt-Match 5 (Next.js + Firebase)

Digitale Version des Wirtschaftsplanspiels mit separaten Ansichten für Spielleitung und Gruppen. Basis: Next.js (App Router), TypeScript, Tailwind CSS, Firebase (Firestore/Auth geplant).

## Struktur
- `/` Startseite mit Rollenwahl (Spielleitung vs. Gruppe)
- `/spielleiter` Stub-Dashboard zum Anlegen einer Lobby (Presets Easy/Medium/Hard, max. 10 Gruppen, Admin-PIN)
- `/gruppe` Join-Formular für Gruppen-Codes
- `src/lib/firebase.ts` Firebase-Initialisierung
- `src/lib/types.ts` Grundtypen für Spiel, Gruppen und Perioden

## Lokale Entwicklung
```bash
npm install
npm run dev
# öffnet http://localhost:3000
```

## Umgebungsvariablen
Kopiere `.env.local.example` zu `.env.local` und trage deine Firebase-Werte ein:
```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

## Nächste Schritte (geplant)
- Firestore-Schema für Lobbys, Gruppen und Perioden
- Auth via Admin-PIN + Gruppen-Codes
- Realtime-Dashboard (Status jeder Gruppe, Periodenstart)
- Entscheidungsformular und Ergebnis-Logik
````
