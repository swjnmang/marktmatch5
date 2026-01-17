# Session Management & Browser-Refresh Recovery

## Problem gelöst

Die App hatte zuvor folgendes Problem: Wenn Gruppen auf ihrem Tablet den Browser aktualisiert haben oder mit der Browser-Zurück-Taste navigiert sind, konnten sie nicht zu ihrer Lobby/ihrem laufenden Spiel zurückkehren. Sie mussten von vorne beginnen und ein neue Gruppe erstellen, was die alte Session blockierte und das gesamte Spiel lähmte.

## Lösung implementiert

### 1. **Automatische Session-Wiederherstellung** (Kern-Feature)

- **localStorage-basierte Persistierung**: Die `groupId` und `gameId` werden mit Device-ID und Aktivitäts-Timestamp gespeichert
- **Auto-Redirect nach Browser-Refresh**: Gruppen werden automatisch zu ihrer aktiven Spielsession weitergeleitet
- **Device-Authentifizierung**: Ein eindeutiger Device-ID verhindert, dass mehrere Geräte die gleiche Gruppe-Session gleichzeitig steuern
- **Session-Validierung**: Sessions verfallen automatisch nach 90 Minuten Inaktivität

### 2. **Session Management Utilities** (`src/lib/session-utils.ts`)

Neue Hilfsfunktionen für die Session-Verwaltung:

```typescript
// Kernfunktionen
saveSession(groupId, gameId)              // Speichert eine neue Session mit Device-ID
updateSessionActivity(gameId)             // Updated Aktivitäts-Timestamp
getSession(gameId)                        // Lädt Session aus localStorage
isSessionValid(gameId, expiryMinutes)     // Prüft ob Session noch gültig ist
isDeviceAuthorized(gameId)                // Prüft ob aktuelles Device autorisiert ist
clearSession(gameId)                      // Löscht Session-Daten
getConflictingSession(gameId)             // Findet Sitzungen von anderen Geräten
```

### 3. **Spielleiter-Management Dashboard** (`SessionManagementPanel.tsx`)

Spielleiter können jetzt:
- ✅ **Inaktive Gruppen überwachen**: Echtzeit-Anzeige der Inaktivität (in Minuten)
- ✅ **Verwaiste Sessions löschen**: Manuelle Löschung von Sessions, die länger als 90 Minuten inaktiv sind
- ✅ **Batch-Cleanup**: Löscht mehrere verwaiste Sessions auf einmal
- ✅ **Farb-Kodierung**:
  - 🟢 **Grün**: Aktiv
  - 🟠 **Orange**: > 30 Min inaktiv
  - 🔴 **Rot**: > 90 Min (wird bald gelöscht)

### 4. **Auto-Cleanup API** (`src/app/api/admin/cleanup.ts`)

Serverseite Cleanup-Funktion:

```bash
# Manueller Cleanup aller inaktiven Sessions
POST /api/admin/cleanup

# Überwachung eines Spiels (GET)
GET /api/admin/cleanup?gameId=<gameId>
```

**Empfohlene Setup**:
- Vercel Cron Jobs: `0 */15 * * * POST /api/admin/cleanup` (alle 15 Minuten)
- Oder: Externe Monitoring-Services (Healthchecks.io, UptimeRobot, etc.)

### 5. **Verbessertes UI für Manual Rejoin**

Wenn eine Gruppe auf ihr Tablet zurückkehrt, sieht sie:

```
╔═══════════════════════════════════════════════════════╗
║ ✅ Vorherige Sitzung gefunden                         ║
║ Du kannst deine bestehende Gruppe fortsetzen.        ║
║                                                       ║
║ Team Alpha          €50,000          Periode 3       ║
║                                                       ║
║              [✓ Fortsetzen] Button                   ║
╚═══════════════════════════════════════════════════════╝
             ODER
╔═══════════════════════════════════════════════════════╗
║ ⚠️ Neue Sitzung starten                              ║
║ Nur verwenden, wenn die alte Sitzung nicht mehr     ║
║ aktiv ist.                                           ║
╚═══════════════════════════════════════════════════════╝
```

## Implementierte Funktionen

### Dateiänderungen

| Datei | Änderung |
|-------|----------|
| `src/lib/session-utils.ts` | ✨ **NEU**: Session-Management Utilities |
| `src/lib/types.ts` | `lastActivityTime?: number` zu `GroupState` hinzugefügt |
| `src/app/gruppe/page.tsx` | Auto-Redirect bei gültiger Session; Device-Konflikt-Handling |
| `src/app/gruppe/game-form.tsx` | `saveSession()` in Join/Auto-Join; `updateSessionActivity()` tracking |
| `src/components/SessionManagementPanel.tsx` | ✨ **NEU**: Spielleiter-Management Panel |
| `src/app/api/admin/cleanup.ts` | ✨ **NEU**: Server-side Cleanup-API |
| `src/app/spielleiter/[gameId]/page.tsx` | `SessionManagementPanel` integriert |

### Multi-Device-Protection

Das System blockiert automatisch mehrfache Access-Versuche auf der gleichen Gruppe von verschiedenen Geräten:

1. **Gerät A** öffnet Gruppe → Device-ID wird gespeichert
2. **Gerät B** versucht die gleiche Gruppe zu öffnen → Konflikt erkannt
3. **Gerät B** bekommt Warnung: "Diese Sitzung läuft auf anderem Gerät"
4. **Gerät B** kann "Übernehmen" klicken → Wechsel der Kontrolle

## Zeitliche Limits

```
90 Minuten   → Session wird automatisch als inaktiv markiert
             → Spielleiter sieht Warning
             → Cleanup-API entfernt Session

30 Minuten   → Orange Warnung im Spielleiter-Dashboard
```

## Deployment-Anleitung

### Lokal testen

```bash
npm run dev
# Öffne zwei unterschiedliche Browser/Geräte
# Browser 1: Gruppe beitreten
# Browser 2: Zu Gruppe gehen → sollte Konflikt-Warnung sehen
# Browser 1: Refresh → sollte auto zu aktiver Session navigieren
```

### Production (Vercel)

1. **Environment Variables** (`.env.local`):
   ```
   # Keine zusätzlichen Vars benötigt
   ```

2. **Cron Job aktivieren** (vercel.json):
   ```json
   {
     "crons": [
       {
         "path": "/api/admin/cleanup",
         "schedule": "0 */15 * * *"
       }
     ]
   }
   ```

3. **Firestore Indexe** (optional, für große Spielzahlen):
   - `games/{gameId}/groups` sorted by `lastActivityTime`

## Bekannte Einschränkungen

- **localStorage Limit**: ~5-10MB pro Domain (reicht für ~1000 Sessions)
- **Device-ID**: Wird bei Cookie-Clearing gelöscht (neuer Device-ID generiert)
- **Browser-Kompatibilität**: Moderne Browser (Chrome, Firefox, Safari, Edge)

## Troubleshooting

### "Sitzung wird nicht fortgesetzt"

1. Prüfe ob `lastActivityTime` in Firestore aktualisiert wird
2. Prüfe Browser-Console auf localStorage-Fehler
3. Prüfe Device-ID Mismatch

### "Cleanup läuft nicht"

1. Vercel Cron Jobs aktivieren: `vercel env pull`
2. Teste manuell: `curl https://your-domain.vercel.app/api/admin/cleanup`
3. Prüfe Vercel Dashboard → Functions für Errors

### "Multi-Device-Sperre funktioniert nicht"

1. Prüfe `getOrCreateDeviceId()` in session-utils.ts
2. Stelle sicher, dass localStorage-Keys gespeichert werden
3. Teste mit unterschiedlichen Browsern (nicht nur Tabs!)

## Zukünftige Verbesserungen

- [ ] WebSocket-basierte Real-time Session-Sync
- [ ] Besseres UI für Device-Konflikt-Auflösung
- [ ] Session-Pause/Resume-Mechanik (Gruppen können Sitzung pausieren)
- [ ] Analytics für Session-Qualität
- [ ] Automatische "heartbeat"-Requests für Aktivitäts-Tracking
