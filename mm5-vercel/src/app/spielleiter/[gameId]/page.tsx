"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { checkPinFromLocalStorage } from "@/lib/auth";
import type { GameDocument } from "@/lib/types";

export default function GameDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;

  const [game, setGame] = useState<GameDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isPinValid, setIsPinValid] = useState(false);

  useEffect(() => {
    if (!gameId) return;

    // Überprüfe PIN
    const pinValid = checkPinFromLocalStorage(gameId, "");
    if (!pinValid) {
      // PIN nicht vorhanden - zurück zur Login-Seite
      router.push("/spielleiter");
      return;
    }
    setIsPinValid(true);

    // Hole Spiel-Daten
    const unsubscribe = onSnapshot(
      doc(db, "games", gameId),
      (docSnap) => {
        if (docSnap.exists()) {
          setGame(docSnap.data() as GameDocument);
        } else {
          setError("Spiel nicht gefunden");
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error loading game:", err);
        setError(`Fehler beim Laden des Spiels: ${err.message}`);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [gameId, router]);

  if (!isPinValid) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 px-4 py-10">
        <section className="mx-auto max-w-2xl text-center">
          <p className="text-slate-600">Authentifizierung erforderlich...</p>
        </section>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 px-4 py-10">
        <section className="mx-auto max-w-4xl">
          <div className="text-center text-slate-600">Spiel wird geladen...</div>
        </section>
      </main>
    );
  }

  if (error || !game) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 px-4 py-10">
        <section className="mx-auto max-w-4xl">
          <div className="rounded-lg bg-red-50 p-4 text-red-700">{error || "Spiel nicht gefunden"}</div>
          <Link href="/spielleiter" className="mt-4 text-sky-700 hover:underline">
            ← Zurück zur Startseite
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 px-4 py-10">
      <section className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-slate-900">
            {game.status === "lobby" ? "🎮 Lobby" : "Spiel-Dashboard"}
          </h1>
          <p className="mt-2 text-slate-600">
            {game.status === "lobby" ? (
              <>
                <span className="font-mono text-lg font-semibold text-sky-700">{game.joinPin}</span>
                {" "}← Gruppen-PIN zum Beitreten
              </>
            ) : (
              <>
                Periode <span className="font-semibold text-sky-700">{game.period || 0}</span>
              </>
            )}
          </p>
        </div>

        {/* Game Info */}
        <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Spielinformationen</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-slate-600">Status</p>
              <p className="font-semibold text-slate-900 capitalize">{game.status}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Gruppen</p>
              <p className="font-semibold text-slate-900">{game.groups?.length || 0}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Spiel-ID</p>
              <p className="font-mono text-xs text-slate-900">{gameId.substring(0, 8)}...</p>
            </div>
          </div>
        </div>

        {/* Groups Section */}
        <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">
            {game.status === "lobby" ? "Wartende Gruppen" : "Gruppen"}
          </h2>
          <div className="mt-6 space-y-3">
            {game.groups && game.groups.length > 0 ? (
              game.groups.map((group, index) => (
                <div
                  key={group.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-4 hover:border-sky-400 hover:bg-sky-50"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      {group.name || `Gruppe ${index + 1}`}
                    </p>
                    <p className="text-sm text-slate-600">Status: {group.status}</p>
                  </div>
                  {game.status !== "lobby" && (
                    <div className="text-right">
                      <p className="text-sm text-slate-600">Kapital: €{group.capital}</p>
                      <p className="text-xs text-slate-500">Lager: {group.inventory}</p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-slate-600 text-center py-8">
                {game.status === "lobby" 
                  ? "Noch keine Gruppen beigetreten. Teile den Gruppen-PIN oben!" 
                  : "Keine Gruppen vorhanden"}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">
            {game.status === "lobby" ? "Spiel starten" : "Periode verwalten"}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {game.status === "lobby"
              ? "Warte bis alle Gruppen beigetreten sind, dann starte das Spiel."
              : "Aktiviere die Entscheidungsphase für die nächste Periode."}
          </p>
          <button
            disabled
            className="mt-4 rounded-lg bg-sky-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:bg-slate-300"
          >
            {game.status === "lobby"
              ? `🚀 Spiel mit ${game.groups?.length || 0} Gruppe(n) starten (kommt bald)`
              : `Periode ${(game.period || 0) + 1} starten (kommt bald)`}
          </button>
        </div>

        <Link href="/spielleiter" className="text-sm font-semibold text-sky-700 hover:underline">
          ← Zurück zur Übersicht
        </Link>
      </section>
    </main>
  );
}
