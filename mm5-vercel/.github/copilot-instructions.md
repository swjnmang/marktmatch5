- [x] Verify that the copilot-instructions.md file in the .github directory is created.

- [x] Clarify Project Requirements
Next.js 14 + TypeScript + Tailwind CSS + Firebase Firestore + Custom Auth (PIN + Gruppen-Codes) f�r digitales Unternehmensplanspiel.

- [x] Scaffold the Project
create-next-app mit App Router, TypeScript, Tailwind, ESLint, src-dir durchgef�hrt. Firebase SDK installiert.

- [x] Customize the Project
Landing Page mit Rollenwahl, Sky-Blue Palette. Stub-Pages f�r Spielleiter und Gruppen. Firebase config, Types, env-Vorlage.

- [x] Install Required Extensions
Keine Extensions notwendig.

- [x] Compile the Project
npm run build erfolgreich (2.2s). Routes /, /gruppe, /spielleiter prerendered.

- [x] Create and Run Task
npm run dev verf�gbar (localhost:3000).

- [x] Launch the Project
Bereit f�r Vercel-Deployment.

- [x] Ensure Documentation is Complete
README.md und .env.local.example vorhanden.

## Projektstruktur (MVP Phase 1)
- `/` Landing Page mit Rollenwahl
- `/spielleiter` Spielleiter-Auth Stub
- `/gruppe` Gruppe-Join-Form
- `src/lib/firebase.ts` Firebase-Init
- `src/lib/types.ts` Game Datentypen
