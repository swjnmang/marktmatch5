'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, getDocs } from "firebase/firestore";
import type { GameDocument } from "@/lib/types";

const MASTER_PIN = process.env.NEXT_PUBLIC_MASTER_ADMIN_PIN || "ADMIN2026";

export default function MasterAdminPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [games, setGames] = useState<Array<{id: string, data: GameDocument, groupCount: number}>>([]);
  const [loading, setLoading] = useState(false);

  // Prüfe ob bereits authentifiziert (localStorage)
  useEffect(() => {
    const masterAuth = localStorage.getItem('master_admin_auth');
    if (masterAuth === MASTER_PIN) {
      setAuthenticated(true);
    }
  }, []);

  // Lade alle Spiele wenn authentifiziert
  useEffect(() => {
    if (!authenticated) return;

    const q = query(collection(db, "games"));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const gamesData = await Promise.all(
        snapshot.docs.map(async (gameDoc) => {
          const groupsSnapshot = await getDocs(collection(db, "games", gameDoc.id, "groups"));
          return {
            id: gameDoc.id,
            data: gameDoc.data() as GameDocument,
            groupCount: groupsSnapshot.size,
          };
        })
      );
      
      // Sortiere nach Erstellungsdatum (neueste zuerst)
      gamesData.sort((a, b) => {
        const timeA = a.data.createdAt?.seconds || 0;
        const timeB = b.data.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      
      setGames(gamesData);
    });

    return () => unsubscribe();
  }, [authenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === MASTER_PIN) {
      localStorage.setItem('master_admin_auth', pin);
      setAuthenticated(true);
      setError("");
    } else {
      setError("Ungültige Master-Admin-PIN");
    }
  };

  const handleCloseGame = async (gameId: string, gameName: string) => {
    if (!confirm(`Möchtest du das Spiel "${gameName}" wirklich beenden?`)) return;

    setLoading(true);
    try {
      await updateDoc(doc(db, "games", gameId), {
        status: "finished"
      });
      alert(`✅ Spiel "${gameName}" wurde beendet.`);
    } catch (err: any) {
      alert(`❌ Fehler: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGame = async (gameId: string, gameName: string) => {
    if (!confirm(`ACHTUNG: Möchtest du das Spiel "${gameName}" wirklich LÖSCHEN? Dies kann nicht rückgängig gemacht werden!`)) return;
    if (!confirm(`Letzte Bestätigung: Spiel "${gameName}" wird unwiderruflich gelöscht!`)) return;

    setLoading(true);
    try {
      // Lösche erst alle Gruppen
      const groupsSnapshot = await getDocs(collection(db, "games", gameId, "groups"));
      const deletePromises = groupsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);

      // Lösche Entscheidungen
      const decisionsSnapshot = await getDocs(collection(db, "games", gameId, "decisions"));
      const decisionDeletePromises = decisionsSnapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(decisionDeletePromises);

      // Lösche das Spiel
      await deleteDoc(doc(db, "games", gameId));
      
      alert(`✅ Spiel "${gameName}" wurde vollständig gelöscht.`);
    } catch (err: any) {
      alert(`❌ Fehler beim Löschen: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('master_admin_auth');
    setAuthenticated(false);
    setPin("");
  };

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-red-100 px-4 py-10">
        <section className="mx-auto max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-slate-900">🔐 Master Admin</h1>
            <p className="mt-2 text-slate-600">
              Zugriff auf alle Spiele und Verwaltungsfunktionen
            </p>
          </div>

          <div className="rounded-2xl bg-white p-8 shadow-lg ring-1 ring-slate-200">
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-slate-700">Master-Admin-PIN</span>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="rounded-lg border border-slate-300 px-4 py-3 text-base focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200"
                  placeholder="PIN eingeben..."
                  autoFocus
                />
              </label>

              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="rounded-lg bg-red-600 px-6 py-3 font-semibold text-white hover:bg-red-700 transition"
              >
                Anmelden
              </button>
            </form>

            <Link href="/" className="block mt-4 text-center text-sm text-slate-600 hover:underline">
              ← Zurück zur Startseite
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-red-100 px-4 py-10">
      <section className="mx-auto max-w-6xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">🔐 Master Admin Dashboard</h1>
            <p className="mt-2 text-slate-600">
              Alle Spiele verwalten und überwachen
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="rounded-lg bg-slate-600 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 transition"
          >
            Abmelden
          </button>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            Alle Spiele ({games.length})
          </h2>

          {games.length === 0 ? (
            <p className="text-center text-slate-600 py-8">Keine Spiele gefunden</p>
          ) : (
            <div className="space-y-3">
              {games.map((game) => (
                <div
                  key={game.id}
                  className={`rounded-lg border p-4 transition ${
                    game.data.status === "finished" 
                      ? "border-slate-300 bg-slate-50" 
                      : "border-slate-200 hover:border-sky-400 hover:bg-sky-50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">
                        {game.data.gameName || "Unbenanntes Spiel"}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className={`rounded px-2 py-1 font-medium ${
                          game.data.status === "lobby" 
                            ? "bg-yellow-100 text-yellow-800"
                            : game.data.status === "in_progress"
                            ? "bg-green-100 text-green-800"
                            : "bg-slate-200 text-slate-700"
                        }`}>
                          {game.data.status === "lobby" ? "Lobby" : game.data.status === "in_progress" ? "Läuft" : "Beendet"}
                        </span>
                        <span className="rounded bg-sky-100 px-2 py-1 text-sky-800">
                          Periode {game.data.period || 0}
                        </span>
                        <span className="rounded bg-purple-100 px-2 py-1 text-purple-800">
                          {game.groupCount} Gruppen
                        </span>
                        {game.data.status === "in_progress" && (
                          <span className="rounded bg-indigo-100 px-2 py-1 text-indigo-800">
                            {game.data.phase === "machine_selection" ? "Maschinenauswahl" : game.data.phase === "decisions" ? "Entscheidungen" : "Ergebnisse"}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 text-xs text-slate-600">
                        <p>Spiel-ID: {game.id.substring(0, 12)}...</p>
                        <p>Join-PIN: <span className="font-mono font-semibold">{game.data.joinPin}</span></p>
                        <p>Admin-PIN: <span className="font-mono font-semibold text-red-600">{game.data.adminPin}</span></p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Link
                        href={`/spielleiter/${game.id}`}
                        onClick={() => {
                          // Speichere Admin-PIN im localStorage für direkten Zugriff
                          localStorage.setItem(`admin_pin_${game.id}`, game.data.adminPin);
                        }}
                        className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 transition text-center whitespace-nowrap"
                      >
                        📊 Öffnen
                      </Link>
                      
                      {game.data.status !== "finished" && (
                        <button
                          onClick={() => handleCloseGame(game.id, game.data.gameName || "Unbenanntes Spiel")}
                          disabled={loading}
                          className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition disabled:opacity-50"
                        >
                          ⏸️ Beenden
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteGame(game.id, game.data.gameName || "Unbenanntes Spiel")}
                        disabled={loading}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition disabled:opacity-50"
                      >
                        🗑️ Löschen
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <Link href="/" className="block text-center text-sm font-semibold text-slate-700 hover:underline">
          ← Zurück zur Startseite
        </Link>
      </section>
    </main>
  );
}
