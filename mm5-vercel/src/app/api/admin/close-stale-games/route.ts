import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, writeBatch, doc, Timestamp } from "firebase/firestore";

// Ein offenes Spiel (Lobby oder laufend) soll nicht endlos in "Aktive Spiele"
// stehen bleiben, falls die Spielleitung vergisst, es zu beenden - nach 12h
// wird es automatisch auf "finished" gesetzt und verschwindet damit aus der
// aktiven Liste (die Daten selbst bleiben erhalten, siehe cleanup-inactive-games
// für die spätere vollständige Löschung nach 7 Tagen Inaktivität).
//
// Opportunistisch ausgelöst (beim Laden der "Aktive Spiele"-Liste), nicht per
// Cron - so greift die 12h-Grenze zeitnah statt nur einmal täglich.
const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

async function closeStaleGames(collectionName: string): Promise<number> {
  const q = query(collection(db, collectionName), where("status", "in", ["lobby", "in_progress"]));
  const snapshot = await getDocs(q);
  const now = Date.now();

  const batch = writeBatch(db);
  let closedCount = 0;
  snapshot.docs.forEach((gameDoc) => {
    const createdAt = gameDoc.data().createdAt as Timestamp | undefined;
    const createdAtMs = createdAt?.toMillis?.() ?? 0;
    if (createdAtMs && now - createdAtMs > TWELVE_HOURS_MS) {
      batch.update(doc(db, collectionName, gameDoc.id), { status: "finished" });
      closedCount += 1;
    }
  });
  if (closedCount > 0) await batch.commit();
  return closedCount;
}

export async function POST() {
  try {
    const [games, gamesHandel] = await Promise.all([
      closeStaleGames("games"),
      closeStaleGames("games_handel"),
    ]);
    return NextResponse.json({ closed: games + gamesHandel, games, gamesHandel });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
