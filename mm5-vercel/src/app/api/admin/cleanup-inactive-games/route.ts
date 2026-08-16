import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";

// Offene Spiele (Lobby oder laufend) ohne jede Aktivität (Spielleitung ODER Gruppe)
// werden nach dieser Frist komplett gelöscht - inklusive aller Untersammlungen.
const GAME_INACTIVITY_MS = 7 * 24 * 60 * 60 * 1000; // 7 Tage

async function deleteSubcollection(gameId: string, subcollection: string): Promise<number> {
  const snapshot = await getDocs(collection(db, "games", gameId, subcollection));
  await Promise.all(snapshot.docs.map((d) => deleteDoc(d.ref)));
  return snapshot.size;
}

async function deleteGameCompletely(gameId: string) {
  // Firestore löscht Untersammlungen nicht automatisch mit dem Elterndokument -
  // jede muss einzeln geleert werden, bevor das Spiel-Dokument selbst gelöscht wird.
  const [groups, decisions, specialTasks] = await Promise.all([
    deleteSubcollection(gameId, "groups"),
    deleteSubcollection(gameId, "decisions"),
    deleteSubcollection(gameId, "specialTasks"),
  ]);
  await deleteDoc(doc(db, "games", gameId));
  return { groups, decisions, specialTasks };
}

/**
 * Ermittelt den letzten bekannten Aktivitätszeitpunkt eines Spiels, ohne dass dafür
 * ein eigenes "lastActivity"-Feld auf dem Spiel-Dokument gepflegt werden muss:
 * - createdAt: Erstellungszeitpunkt als Basislinie
 * - phaseEndsAt: wird bei jedem Periodenstart durch die Spielleitung neu gesetzt
 * - Gruppen-Aktivität: lastActivityTime (alle 30s aktualisiert, solange eine Gruppe
 *   die Seite offen hat) bzw. joinedAt als Fallback pro Gruppe
 */
async function getLastActivity(gameId: string, game: Record<string, unknown>): Promise<number> {
  const createdAtMs =
    (game.createdAt as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0;
  const phaseEndsAtMs = typeof game.phaseEndsAt === "number" ? game.phaseEndsAt : 0;

  const groupsSnapshot = await getDocs(collection(db, "games", gameId, "groups"));
  const groupTimestamps = groupsSnapshot.docs.map((g) => {
    const data = g.data() as {
      lastActivityTime?: number;
      joinedAt?: { toMillis?: () => number };
    };
    return data.lastActivityTime ?? data.joinedAt?.toMillis?.() ?? 0;
  });

  return Math.max(createdAtMs, phaseEndsAtMs, 0, ...groupTimestamps);
}

async function runCleanup() {
  const now = Date.now();
  const result = {
    gamesChecked: 0,
    gamesDeleted: [] as Array<{ id: string; name: string; inactiveDays: number }>,
    errors: [] as string[],
  };

  const gamesSnapshot = await getDocs(collection(db, "games"));

  for (const gameDoc of gamesSnapshot.docs) {
    const gameId = gameDoc.id;
    const game = gameDoc.data() as Record<string, unknown>;

    // "Offene Spiele": bereits beendete Spiele werden hier bewusst nicht angefasst.
    if (game.status === "finished") {
      continue;
    }

    result.gamesChecked++;

    try {
      const lastActivity = await getLastActivity(gameId, game);
      const inactiveMs = now - lastActivity;

      if (inactiveMs > GAME_INACTIVITY_MS) {
        console.log(
          `[CleanupInactiveGames] Deleting "${game.gameName}" (${gameId}) - inactive for ${Math.round(inactiveMs / 86400000)} days`
        );
        await deleteGameCompletely(gameId);
        result.gamesDeleted.push({
          id: gameId,
          name: String(game.gameName ?? "?"),
          inactiveDays: Math.round(inactiveMs / 86400000),
        });
      }
    } catch (err) {
      const msg = `Game ${gameId}: ${err instanceof Error ? err.message : String(err)}`;
      console.error(`[CleanupInactiveGames] ${msg}`);
      result.errors.push(msg);
    }
  }

  console.log("[CleanupInactiveGames] Done:", result);
  return result;
}

function isAuthorized(req: NextRequest): boolean {
  // Vercel Cron sendet automatisch "Authorization: Bearer $CRON_SECRET", sofern die
  // Umgebungsvariable CRON_SECRET im Vercel-Projekt gesetzt ist. Ist sie nicht gesetzt,
  // bleibt der Endpunkt (wie schon zuvor der alte Cleanup-Endpunkt) ungeschützt - das
  // Risiko ist begrenzt, da hier ausschließlich bereits inaktive, offene Spiele
  // gelöscht werden, keine beliebigen Daten.
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

// Vercel Cron ruft standardmäßig GET auf.
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await runCleanup();
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// POST bleibt für manuelles Auslösen (z.B. durch die Spielleitung) verfügbar.
export async function POST(req: NextRequest) {
  return GET(req);
}
