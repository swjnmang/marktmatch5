'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, getDocs } from "firebase/firestore";
import type { GameDocument } from "@/lib/types";

const MASTER_PIN = process.env.NEXT_PUBLIC_MASTER_ADMIN_PIN || "2#Wadlstrumpf";

export default function MasterAdminPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [games, setGames] = useState<Array<{id: string, data: GameDocument, groupCount: number}>>([]);
  const [loading, setLoading] = useState(false);
  const [selectedGames, setSelectedGames] = useState<Set<string>>(new Set());

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

  const toggleGameSelection = (gameId: string) => {
    const newSelected = new Set(selectedGames);
    if (newSelected.has(gameId)) {
      newSelected.delete(gameId);
    } else {
      newSelected.add(gameId);
    }
    setSelectedGames(newSelected);
  };

  const selectAllGames = () => {
    if (selectedGames.size === games.length) {
      setSelectedGames(new Set());
    } else {
      setSelectedGames(new Set(games.map(g => g.id)));
    }
  };

  const handleBatchCloseGames = async () => {
    if (selectedGames.size === 0) return;
    if (!confirm(`${selectedGames.size} Spiel(e) wirklich beenden?`)) return;

    setLoading(true);
    try {
      for (const gameId of Array.from(selectedGames)) {
        await updateDoc(doc(db, "games", gameId), { status: "finished" });
      }
      setSelectedGames(new Set());
      alert(`✅ ${selectedGames.size} Spiel(e) wurden beendet.`);
    } catch (err: any) {
      alert(`❌ Fehler: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchDeleteGames = async () => {
    if (selectedGames.size === 0) return;
    if (!confirm(`ACHTUNG: ${selectedGames.size} Spiel(e) wirklich LÖSCHEN?`)) return;
    if (!confirm(`Letzte Bestätigung: Diese Spiele werden unwiderruflich gelöscht!`)) return;

    setLoading(true);
    try {
      for (const gameId of Array.from(selectedGames)) {
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
      }
      setSelectedGames(new Set());
      alert(`✅ ${selectedGames.size} Spiel(e) wurden vollständig gelöscht.`);
    } catch (err: any) {
      alert(`❌ Fehler beim Löschen: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return "Unbekannt";
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleString("de-DE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!authenticated) {
    return (
      <main className="relative min-h-screen overflow-hidden" style={{background: "linear-gradient(135deg, #4a5568 0%, #0f172a 100%)"}}>
        <div className="mx-auto max-w-md px-6 py-16 sm:px-10">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold text-neutral-900">🔐 Master Admin</h1>
            <p className="text-lg text-neutral-700">
              Zugriff auf alle Spiele und Verwaltungsfunktionen.
            </p>
          </div>

          <div className="rounded-2xl bg-white p-10 shadow-2xl mt-8">
            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold text-neutral-900">Master-Admin-PIN</span>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-neutral-900 placeholder:text-neutral-400 shadow-sm focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-300/40"
                  placeholder="PIN eingeben..."
                  autoFocus
                />
              </label>

              {error && (
                <div className="rounded-lg bg-red-500/20 p-3 text-sm text-red-100 ring-1 ring-red-400/40">
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="rounded-lg bg-gradient-to-r from-red-500 to-orange-500 px-6 py-3 font-semibold text-white hover:from-red-400 hover:to-orange-400 transition"
              >
                Anmelden
              </button>
            </form>

            <Link href="/" className="block mt-4 text-center text-sm text-neutral-500 hover:text-neutral-700 transition">
              ← Zurück zur Startseite
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden" style={{background: "linear-gradient(135deg, #4a5568 0%, #0f172a 100%)"}}>
      <div className="mx-auto max-w-6xl px-6 py-16 sm:px-10">
        <div className="flex items-center justify-between mb-12">
          <div>
            <p className="mb-2 text-sm font-semibold text-neutral-500 uppercase tracking-widest">Admin</p>
            <h1 className="text-4xl font-bold text-neutral-900">🔐 Master Admin Dashboard</h1>
            <p className="text-lg text-neutral-700">
              Alle Spiele verwalten und überwachen.
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="inline-block rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-6 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Abmelden
          </button>
        </div>

        <div className="rounded-2xl bg-white p-10 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-neutral-900">
              Alle Spiele ({games.length})
            </h2>
            {selectedGames.size > 0 && (
              <div className="flex gap-2 items-center">
                <span className="text-sm font-semibold text-neutral-700">
                  {selectedGames.size} ausgewählt
                </span>
                <button
                  onClick={handleBatchCloseGames}
                  disabled={loading}
                  className="rounded-lg bg-orange-600 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-700 transition disabled:opacity-50"
                >
                  ⏸️ Beenden
                </button>
                <button
                  onClick={handleBatchDeleteGames}
                  disabled={loading}
                  className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 transition disabled:opacity-50"
                >
                  🗑️ Löschen
                </button>
              </div>
            )}
          </div>

          {games.length > 0 && (
            <div className="mb-4 flex items-center gap-2 border-t border-neutral-200 pt-4">
              <input
                type="checkbox"
                id="select-all"
                checked={selectedGames.size === games.length && games.length > 0}
                onChange={selectAllGames}
                className="rounded border-neutral-300 cursor-pointer"
              />
              <label htmlFor="select-all" className="text-sm font-semibold text-neutral-700 cursor-pointer">
                Alle auswählen
              </label>
            </div>
          )}

          {games.length === 0 ? (
            <p className="text-center text-neutral-600 py-8">Keine Spiele gefunden</p>
          ) : (
            <div className="space-y-3">
              {games.map((game) => (
                <div
                  key={game.id}
                  className={`rounded-lg border p-4 transition flex items-start gap-3 ${
                    selectedGames.has(game.id)
                      ? "border-neutral-400 bg-neutral-50"
                      : game.data.status === "finished" 
                      ? "border-neutral-300 bg-neutral-50" 
                      : "border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedGames.has(game.id)}
                    onChange={() => toggleGameSelection(game.id)}
                    className="mt-1 rounded border-neutral-300 cursor-pointer"
                  />

                  <div className="flex-1">
                    <h3 className="font-semibold text-neutral-900">
                      {game.data.gameName || "Unbenanntes Spiel"}
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className={`rounded px-2 py-1 font-medium ${
                        game.data.status === "lobby" 
                          ? "bg-yellow-100 text-yellow-800"
                          : game.data.status === "in_progress"
                          ? "bg-green-100 text-green-800"
                          : "bg-neutral-200 text-neutral-700"
                      }`}>
                        {game.data.status === "lobby" ? "Lobby" : game.data.status === "in_progress" ? "Läuft" : "Beendet"}
                      </span>
                      <span className="rounded bg-neutral-100 px-2 py-1 text-neutral-800">
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
                    <div className="mt-3 text-xs text-neutral-600 space-y-1">
                      <p><strong>Eröffnet:</strong> {formatDate(game.data.createdAt)}</p>
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
                      className="rounded-lg bg-neutral-600 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700 transition text-center whitespace-nowrap"
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
              ))}
            </div>
          )}
        </div>

        <Link href="/" className="block text-center text-sm font-semibold text-neutral-700 hover:underline">
          ← Zurück zur Startseite
        </Link>
      </div>
    </main>
  );
}

