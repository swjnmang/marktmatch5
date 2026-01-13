"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { generateAdminPin, generateGroupCode, savePinToLocalStorage } from "@/lib/auth";
import { PRESET_PARAMETERS } from "@/lib/presets";
import type { GameParameters } from "@/lib/types";
import { ui } from "@/lib/ui";

export default function SpielleiterPage() {
  const router = useRouter();
  const [view, setView] = useState<"login" | "create" | "pins" | "list">("create");
  const [preset, setPreset] = useState<"easy" | "medium" | "hard">("easy");
  const [parameters, setParameters] = useState<GameParameters>(PRESET_PARAMETERS.easy);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [existingPin, setExistingPin] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [gameId, setGameId] = useState<string>("");
  const [adminPin, setAdminPin] = useState<string>("");
  const [joinPin, setJoinPin] = useState<string>("");
  const [showAdminPin, setShowAdminPin] = useState(false);
  const [gameName, setGameName] = useState("");
  const [activeGames, setActiveGames] = useState<Array<{id: string, gameName: string, status: string, period: number}>>([]);

  const handlePresetChange = (newPreset: "easy" | "medium" | "hard") => {
    setPreset(newPreset);
    setParameters(PRESET_PARAMETERS[newPreset]);
  };

  const handleParameterChange = (key: keyof GameParameters, value: number | boolean) => {
    setParameters((prev) => ({ ...prev, [key]: value }));
  };

  // Lade aktive Spiele
  useEffect(() => {
    const q = query(collection(db, "games"), where("status", "in", ["lobby", "in_progress"]));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const games = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          gameName: data.gameName || "Unbenanntes Spiel",
          status: data.status,
          period: data.period || 0,
        };
      });
      setActiveGames(games);
    });

    return () => unsubscribe();
  }, []);

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const newAdminPin = generateAdminPin();
      const newJoinPin = generateGroupCode();

      const gameDoc = {
        gameName: gameName.trim() || "Mein Planspiel",
        adminPin: newAdminPin,
        joinPin: newJoinPin,
        parameters,
        groups: [],
        period: 0,
        status: "lobby" as const,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "games"), gameDoc);
      savePinToLocalStorage(newAdminPin, docRef.id);
      
      // Navigiere direkt zum Game-Dashboard
      router.push(`/spielleiter/${docRef.id}?showPins=true`);
    } catch (err) {
      console.error("Error creating game:", err);
      setError("Fehler beim Erstellen des Spiels. Versuche es erneut.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const normalizedPin = existingPin.trim();
      if (!normalizedPin || normalizedPin.length < 4) {
        setError("Bitte gib eine gültige Admin-PIN ein.");
        setLoading(false);
        return;
      }

      // Suche nach Spiel mit dieser Admin-PIN
      const gamesSnapshot = await getDocs(collection(db, "games"));
      let foundGameId = "";
      
      gamesSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.adminPin === normalizedPin) {
          foundGameId = doc.id;
        }
      });

      if (!foundGameId) {
        setError("Ungültige Admin-PIN. Kein Spiel gefunden.");
        setLoading(false);
        return;
      }

      // Speichere PIN und leite weiter
      savePinToLocalStorage(normalizedPin, foundGameId);
      router.push(`/spielleiter/${foundGameId}`);
    } catch (err: any) {
      console.error("Error joining game:", err);
      setError(`Fehler: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={ui.page.shell}>
      <div className={ui.page.overlay} />
      <section className={ui.page.container}>
        <div className="text-center space-y-2">
          <p className={ui.header.kicker}>Spielleitung</p>
          <h1 className="text-4xl font-bold text-neutral-900">Spiel erstellen & verwalten</h1>
          <p className={ui.header.subtitle}>
            Konfiguriere ein neues Planspiel oder tritt einem bestehenden bei.
          </p>
        </div>

        {/* PIN Display View */}
        {view === "pins" && (
          <div className="rounded-2xl bg-gradient-to-br from-neutral-50 to-neutral-50 p-8 shadow-lg ring-2 ring-neutral-300">
            <h2 className="text-2xl font-bold text-neutral-900 mb-6">✅ Lobby erstellt!</h2>
            
            {/* Gruppen-PIN */}
            <div className="space-y-4 mb-8">
              <div>
                <p className="text-sm font-semibold text-neutral-600 mb-2">👥 Gruppen-PIN (zum Beitreten)</p>
                <div className="flex gap-3 items-center">
                  <div className="font-mono text-4xl font-bold text-neutral-700 bg-white px-6 py-4 rounded-lg border-2 border-neutral-300">
                    {joinPin}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(joinPin);
                      alert("✅ PIN kopiert!");
                    }}
                    className="rounded-lg bg-neutral-600 px-4 py-3 text-white font-semibold hover:bg-neutral-700 transition"
                  >
                    📋 Kopieren
                  </button>
                </div>
                <p className="text-xs text-neutral-600 mt-2">Teile diese PIN mit allen Teilnehmern</p>
              </div>
            </div>

            {/* Admin-PIN Toggle */}
            <div className="border-t pt-6">
              <button
                onClick={() => setShowAdminPin(!showAdminPin)}
                className="text-sm font-semibold text-neutral-700 hover:text-neutral-900 flex items-center gap-2"
              >
                {showAdminPin ? "▼" : "▶"} 🔑 Admin-PIN (versteckt)
              </button>
              
              {showAdminPin && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs text-neutral-600 mb-2">Dein Admin-PIN für dieses Spiel:</p>
                  <div className="flex gap-3 items-center">
                    <div className="font-mono text-2xl font-bold text-red-700 bg-white px-4 py-2 rounded border-2 border-red-300">
                      {adminPin}
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(adminPin);
                        alert("✅ Admin-PIN kopiert!");
                      }}
                      className="rounded-lg bg-red-600 px-3 py-2 text-white text-sm font-semibold hover:bg-red-700 transition"
                    >
                      📋 Kopieren
                    </button>
                  </div>
                  <p className="text-xs text-red-700 mt-2 font-semibold">⚠️ Speichere diese PIN sicher ab!</p>
                </div>
              )}
            </div>

            {/* Dashboard Link */}
            <div className="mt-8">
              <button
                onClick={() => router.push(`/spielleiter/${gameId}`)}
                className="w-full rounded-lg bg-neutral-600 px-6 py-3 text-white font-bold text-lg hover:bg-neutral-700 transition"
              >
                🎮 Zur Lobby
              </button>
            </div>
          </div>
        )}

        {/* View Toggle */}
        {view !== "pins" && (
          <div className="flex gap-2 rounded-lg bg-neutral-100 p-1">
            <button
              onClick={() => setView("list")}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition ${
                view === "list"
                  ? "bg-white text-neutral-700 shadow-sm"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              Aktive Spiele
            </button>
            <button
              onClick={() => setView("create")}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition ${
                view === "create"
                  ? "bg-white text-neutral-700 shadow-sm"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              Neues Spiel
            </button>
            <button
              onClick={() => setView("login")}
              className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition ${
                view === "login"
                  ? "bg-white text-neutral-700 shadow-sm"
                  : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              Mit PIN beitreten
            </button>
          </div>
        )}

        {/* Active Games List */}
        {view === "list" && (
          <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-neutral-200">
            <h2 className="text-xl font-semibold text-neutral-900 mb-4">Aktive Spiele</h2>
            {activeGames.length > 0 ? (
              <div className="space-y-3">
                {activeGames.map((game) => (
                  <div
                    key={game.id}
                    className="flex items-center justify-between rounded-lg border border-neutral-200 p-4 hover:border-neutral-400 hover:bg-neutral-50 transition"
                  >
                    <div>
                      <p className="font-semibold text-neutral-900">{game.gameName}</p>
                      <p className="text-sm text-neutral-600">
                        Status: {game.status === "lobby" ? "Lobby" : "Läuft"} • Periode: {game.period}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        // Prüfe ob Admin-PIN im localStorage ist
                        const storedPin = localStorage.getItem(`admin_pin_${game.id}`);
                        if (storedPin) {
                          router.push(`/spielleiter/${game.id}`);
                        } else {
                          setError("Bitte gib die Admin-PIN ein, um diesem Spiel beizutreten.");
                          setView("login");
                        }
                      }}
                      className="rounded-lg bg-neutral-600 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700 transition"
                    >
                      Öffnen
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-neutral-600 py-8">
                Keine aktiven Spiele gefunden. Erstelle ein neues Spiel!
              </p>
            )}
          </div>
        )}

        {/* Create View */}
        {view === "create" && (
          <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-neutral-200">
            <form onSubmit={handleCreateGame} className="flex flex-col gap-6">
              {/* Game Name */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-neutral-700">
                  Name des Spiels / der Lobby
                </label>
                <input
                  type="text"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  placeholder="z.B. Klasse 10a - Wirtschaft 2026"
                  className="rounded-lg border border-neutral-200 px-3 py-2 text-base text-neutral-900 shadow-sm focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                />
                <p className="text-xs text-neutral-500">Dieser Name hilft dir, deine Spiele zu organisieren.</p>
              </div>

              {/* Preset */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-neutral-700">
                  Schwierigkeitsstufe (Preset)
                </label>
                <div className="grid gap-2 sm:grid-cols-3">
                  {(["easy", "medium", "hard"] as const).map((p) => (
                    <label key={p} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="preset"
                        value={p}
                        checked={preset === p}
                        onChange={(e) => handlePresetChange(e.target.value as typeof preset)}
                        className="accent-neutral-600"
                      />
                      <span className="text-sm text-neutral-700">
                        {p === "easy" ? "Einfach" : p === "medium" ? "Mittel" : "Schwer"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Erweiterte Einstellungen Toggle */}
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-left text-sm font-semibold text-neutral-700 hover:underline"
              >
                {showAdvanced ? "▼" : "▶"} Erweiterte Einstellungen anpassen
              </button>

              {/* Erweiterte Einstellungen */}
              {showAdvanced && (
                <div className="grid gap-4 sm:grid-cols-2 rounded-lg bg-neutral-50 p-4">
                  <div>
                    <label className="text-xs font-semibold text-neutral-600">Startkapital (€)</label>
                    <input
                      type="number"
                      value={parameters.startingCapital}
                      onChange={(e) => handleParameterChange("startingCapital", parseInt(e.target.value))}
                      className="w-full rounded border border-neutral-200 px-2 py-1 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-neutral-600">Periode-Dauer (Min)</label>
                    <input
                      type="number"
                      value={parameters.periodDurationMinutes}
                      onChange={(e) => handleParameterChange("periodDurationMinutes", parseInt(e.target.value))}
                      className="w-full rounded border border-neutral-200 px-2 py-1 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-neutral-600">Marktanalyse-Kosten (€)</label>
                    <input
                      type="number"
                      value={parameters.marketAnalysisCost}
                      onChange={(e) => handleParameterChange("marketAnalysisCost", parseInt(e.target.value))}
                      className="w-full rounded border border-neutral-200 px-2 py-1 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-neutral-600">Negativzins (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={parameters.negativeCashInterestRate}
                      onChange={(e) => handleParameterChange("negativeCashInterestRate", parseFloat(e.target.value))}
                      className="w-full rounded border border-neutral-200 px-2 py-1 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-neutral-600">Lagerkosten pro Einheit (€)</label>
                    <input
                      type="number"
                      value={parameters.inventoryCostPerUnit}
                      onChange={(e) => handleParameterChange("inventoryCostPerUnit", parseInt(e.target.value))}
                      className="w-full rounded border border-neutral-200 px-2 py-1 text-sm mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-neutral-600">Preiselastizität</label>
                    <input
                      type="number"
                      step="0.1"
                      value={parameters.priceElasticityFactor}
                      onChange={(e) => handleParameterChange("priceElasticityFactor", parseFloat(e.target.value))}
                      className="w-full rounded border border-neutral-200 px-2 py-1 text-sm mt-1"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="flex items-center gap-2 text-sm text-neutral-700">
                      <input
                        type="checkbox"
                        checked={parameters.isRndEnabled}
                        onChange={(e) => handleParameterChange("isRndEnabled", e.target.checked)}
                        className="accent-neutral-600"
                      />
                      F&E-Investitionen aktivieren
                    </label>
                  </div>
                  
                  {/* Machine Depreciation Section */}
                  <div className="sm:col-span-2 border-t border-neutral-200 pt-4 mt-4">
                    <p className="text-xs font-semibold text-neutral-700 mb-3 uppercase tracking-wide">
                      🏭 Abschreibungen von Maschinen
                    </p>
                    <label className="flex items-center gap-2 text-sm text-neutral-700 mb-3">
                      <input
                        type="checkbox"
                        checked={parameters.machineDepreciationEnabled ?? false}
                        onChange={(e) => handleParameterChange("machineDepreciationEnabled", e.target.checked)}
                        className="accent-neutral-600"
                      />
                      Maschinenabschreibungen aktivieren
                    </label>
                    
                    {(parameters.machineDepreciationEnabled ?? false) && (
                      <div>
                        <label className="text-xs font-semibold text-neutral-600">
                          Abschreibungsrate pro Periode (%)
                        </label>
                        <div className="flex gap-2 items-center mt-1">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={(parameters.machineDepreciationRate ?? 0.1) * 100}
                            onChange={(e) => handleParameterChange("machineDepreciationRate", parseFloat(e.target.value) / 100)}
                            className="w-full rounded border border-neutral-200 px-2 py-1 text-sm"
                          />
                          <span className="text-xs text-neutral-500 min-w-fit">%</span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-2">
                          Standard: 10% pro Periode. Die Produktionskapazität reduziert sich entsprechend.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Hinweis */}
              <div className="rounded-lg bg-neutral-50 p-4 border border-neutral-200">
                <p className="text-sm text-neutral-700">
                  <strong>ℹ️ Hinweis:</strong> Nach dem Erstellen erhältst du zwei PINs: Eine Admin-PIN für dich und eine Gruppen-PIN für alle Teilnehmer. Die Gruppen treten mit der Gruppen-PIN bei und geben ihren Gruppennamen selbst ein.
                </p>
              </div>

              {/* Error */}
              {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">{error}</div>}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-neutral-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-700 disabled:bg-neutral-400"
              >
                {loading ? "Wird erstellt..." : "🚀 Lobby öffnen & PINs erhalten"}
              </button>
            </form>
          </div>
        )}

        {/* Login View */}
        {view === "login" && (
          <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-neutral-200">
            <form onSubmit={handleJoinGame} className="flex flex-col gap-4">
              <label className="flex flex-col gap-2 text-sm text-neutral-700">
                Admin-PIN
                <input
                  type="password"
                  placeholder="z.B. K7m2P9qL"
                  value={existingPin}
                  onChange={(e) => setExistingPin(e.target.value)}
                  className="rounded-lg border border-neutral-200 px-3 py-2 text-base text-neutral-900 shadow-sm focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                />
              </label>

              {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 border border-red-200">{error}</div>}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-700 disabled:bg-neutral-400"
              >
                {loading ? "Wird überprüft..." : "Zu Spiel beitreten"}
              </button>
            </form>
          </div>
        )}

        <Link
          href="/"
          className={`${ui.header.backLink} block text-center`}
        >
          ← Zurück zur Startseite
        </Link>
      </section>
    </main>
  );
}

