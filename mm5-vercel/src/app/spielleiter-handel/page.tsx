"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { generateAdminPin, generateGroupCode, savePinToLocalStorage } from "@/lib/auth";
import { PRESET_PARAMETERS_HANDEL, QUALITY_TIER_OPTIONS } from "@/lib/presets-handel";
import type { GameParametersHandel, HandelPreset } from "@/lib/types-handel";
import { ui } from "@/lib/ui";

export default function SpielleiterHandelPage() {
  const router = useRouter();
  const [view, setView] = useState<"login" | "create" | "pins" | "list">("create");
  const [preset, setPreset] = useState<HandelPreset>("easy");
  const [parameters, setParameters] = useState<GameParametersHandel>(PRESET_PARAMETERS_HANDEL.easy);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [existingPin, setExistingPin] = useState("");
  const [gameId, setGameId] = useState<string>("");
  const [adminPin, setAdminPin] = useState<string>("");
  const [joinPin, setJoinPin] = useState<string>("");
  const [showAdminPin, setShowAdminPin] = useState(false);
  const [gameName, setGameName] = useState("");
  const [activeGames, setActiveGames] = useState<Array<{ id: string; gameName: string; status: string; period: number }>>([]);

  const handlePresetChange = (newPreset: HandelPreset) => {
    setPreset(newPreset);
    setParameters(PRESET_PARAMETERS_HANDEL[newPreset]);
  };

  useEffect(() => {
    const q = query(collection(db, "games_handel"), where("status", "in", ["lobby", "in_progress"]));
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
        gameName: gameName.trim() || "Mein Handelsspiel",
        adminPin: newAdminPin,
        joinPin: newJoinPin,
        parameters,
        qualityTiers: QUALITY_TIER_OPTIONS[preset],
        period: 0,
        status: "lobby" as const,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "games_handel"), gameDoc);
      savePinToLocalStorage(newAdminPin, docRef.id);

      setGameId(docRef.id);
      setAdminPin(newAdminPin);
      setJoinPin(newJoinPin);
      setView("pins");
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

      const gamesSnapshot = await getDocs(collection(db, "games_handel"));
      let foundGameId = "";

      gamesSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.adminPin === normalizedPin) foundGameId = doc.id;
      });

      if (!foundGameId) {
        setError("Ungültige Admin-PIN. Kein Spiel gefunden.");
        setLoading(false);
        return;
      }

      savePinToLocalStorage(normalizedPin, foundGameId);
      router.push(`/spielleiter-handel/${foundGameId}`);
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
      <section className="relative mx-auto flex w-full max-w-2xl flex-col gap-8 px-4 py-10 sm:px-6 sm:py-14">
        <div className="text-center space-y-2">
          <p className={ui.header.kicker}>Handelsunternehmen</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-neutral-900">Spiel erstellen &amp; verwalten</h1>
          <p className={ui.header.subtitle}>
            Konfiguriere ein neues Handels-Planspiel oder tritt einem bestehenden bei.
          </p>
        </div>

        {view === "pins" && (
          <div className="rounded-2xl bg-white p-5 sm:p-8 shadow-lg ring-2 ring-emerald-200">
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-6">Lobby erstellt!</h2>

            <div className="space-y-4 mb-8">
              <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start">
                <div className="bg-white p-2 rounded-xl border-2 border-neutral-300 flex-none">
                  <QRCodeSVG
                    value={`${typeof window !== "undefined" ? window.location.origin : "https://marktmatch5.vercel.app"}/gruppe-handel/${gameId}?pin=${joinPin}`}
                    size={140}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <div className="flex-1 w-full">
                  <p className="text-sm font-semibold text-neutral-600 mb-2">Gruppen-PIN (zum Beitreten)</p>
                  <div className="flex flex-wrap gap-3 items-center">
                    <div className="font-mono text-3xl sm:text-4xl font-bold text-neutral-700 bg-neutral-50 px-5 py-3 rounded-xl border-2 border-neutral-300">
                      {joinPin}
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(joinPin);
                        alert("PIN kopiert!");
                      }}
                      className="rounded-xl bg-neutral-700 px-4 py-3 text-white font-semibold hover:bg-neutral-800 transition"
                    >
                      Kopieren
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      const link = `${window.location.origin}/gruppe-handel/${gameId}?pin=${joinPin}`;
                      navigator.clipboard.writeText(link);
                      alert("Beitritts-Link kopiert!");
                    }}
                    className="mt-3 w-full sm:w-auto rounded-xl border-2 border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700 hover:border-neutral-500 hover:bg-neutral-50 transition"
                  >
                    Link kopieren (zum Teilen)
                  </button>
                  <p className="text-xs text-neutral-600 mt-2">
                    Gruppen scannen den QR-Code, öffnen den geteilten Link oder geben die PIN unter „Spiel beitreten" ein.
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-neutral-200 pt-6">
              <button
                onClick={() => setShowAdminPin(!showAdminPin)}
                className="text-sm font-semibold text-neutral-700 hover:text-neutral-900"
              >
                {showAdminPin ? "▼" : "▶"} Admin-PIN (versteckt)
              </button>

              {showAdminPin && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-xs text-neutral-600 mb-2">Dein Admin-PIN für dieses Spiel:</p>
                  <div className="flex flex-wrap gap-3 items-center">
                    <div className="font-mono text-2xl font-bold text-red-700 bg-white px-4 py-2 rounded-lg border-2 border-red-300">
                      {adminPin}
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(adminPin);
                        alert("Admin-PIN kopiert!");
                      }}
                      className="rounded-lg bg-red-600 px-3 py-2 text-white text-sm font-semibold hover:bg-red-700 transition"
                    >
                      Kopieren
                    </button>
                  </div>
                  <p className="text-xs text-red-700 mt-2 font-semibold">Speichere diese PIN sicher ab!</p>
                </div>
              )}
            </div>

            <div className="mt-8">
              <button
                onClick={() => router.push(`/spielleiter-handel/${gameId}`)}
                className="w-full rounded-xl bg-emerald-600 px-6 py-4 text-white font-bold text-lg hover:bg-emerald-700 transition"
              >
                Zur Lobby
              </button>
            </div>
          </div>
        )}

        {view !== "pins" && (
          <div className="flex gap-1 rounded-xl bg-neutral-100 p-1">
            {(["list", "create", "login"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                  view === v ? "bg-white text-neutral-800 shadow-sm" : "text-neutral-600 hover:text-neutral-900"
                }`}
              >
                {v === "list" ? "Aktive Spiele" : v === "create" ? "Neues Spiel" : "Mit PIN beitreten"}
              </button>
            ))}
          </div>
        )}

        {view === "list" && (
          <div className="rounded-2xl bg-white p-4 sm:p-6 shadow-lg ring-1 ring-neutral-200">
            <h2 className="text-lg font-semibold text-neutral-900 mb-4">Aktive Handelsspiele</h2>
            {activeGames.length > 0 ? (
              <div className="flex flex-col gap-3">
                {activeGames.map((game) => (
                  <div
                    key={game.id}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between rounded-xl border border-neutral-200 p-4 hover:border-neutral-400 transition"
                  >
                    <div>
                      <p className="font-semibold text-neutral-900">{game.gameName}</p>
                      <p className="text-sm text-neutral-600">
                        Status: {game.status === "lobby" ? "Lobby" : "Läuft"} · Periode: {game.period}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const storedPin = localStorage.getItem(`admin_pin_${game.id}`);
                        if (storedPin) {
                          router.push(`/spielleiter-handel/${game.id}`);
                        } else {
                          setError("Bitte gib die Admin-PIN ein, um diesem Spiel beizutreten.");
                          setView("login");
                        }
                      }}
                      className="rounded-lg bg-neutral-700 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 transition"
                    >
                      Öffnen
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-neutral-600 py-8">Keine aktiven Handelsspiele. Erstelle ein neues!</p>
            )}
          </div>
        )}

        {view === "create" && (
          <div className="rounded-2xl bg-white p-4 sm:p-6 shadow-lg ring-1 ring-neutral-200">
            <form onSubmit={handleCreateGame} className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-neutral-700">Name des Spiels / der Lobby</label>
                <input
                  type="text"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  placeholder="z.B. Klasse 10a - Handel 2026"
                  className="rounded-xl border border-neutral-200 px-3 py-3 text-base text-neutral-900 shadow-sm focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-neutral-700">Schwierigkeitsstufe</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(["easy", "medium", "hard"] as const).map((p) => (
                    <label
                      key={p}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-3 cursor-pointer transition ${
                        preset === p ? "border-emerald-500 bg-emerald-50" : "border-neutral-200"
                      }`}
                    >
                      <input
                        type="radio"
                        name="preset"
                        value={p}
                        checked={preset === p}
                        onChange={(e) => handlePresetChange(e.target.value as HandelPreset)}
                        className="accent-emerald-600"
                      />
                      <span className="text-sm text-neutral-700">
                        {p === "easy" ? "Leicht" : p === "medium" ? "Mittel" : "Schwer"}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-4 text-sm text-neutral-600 space-y-1">
                <p>
                  Startkapital: <strong>€{parameters.startingCapital.toLocaleString("de-DE")}</strong>
                </p>
                <p>
                  Qualitätsstufen: <strong>{QUALITY_TIER_OPTIONS[preset].map((t) => t.name).join(", ")}</strong>
                </p>
              </div>

              <div className="rounded-xl bg-neutral-50 p-4 border border-neutral-200">
                <p className="text-sm text-neutral-700">
                  Nach dem Erstellen erhältst du eine Admin-PIN für dich und eine Gruppen-PIN für alle Teilnehmer.
                </p>
              </div>

              {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 border border-red-200">{error}</div>}

              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-emerald-600 px-4 py-4 text-base font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:bg-neutral-400"
              >
                {loading ? "Wird erstellt..." : "Lobby öffnen & PINs erhalten"}
              </button>
            </form>
          </div>
        )}

        {view === "login" && (
          <div className="rounded-2xl bg-white p-4 sm:p-6 shadow-lg ring-1 ring-neutral-200">
            <form onSubmit={handleJoinGame} className="flex flex-col gap-4">
              <label className="flex flex-col gap-2 text-sm text-neutral-700">
                Admin-PIN
                <input
                  type="password"
                  placeholder="z.B. K7m2P9qL"
                  value={existingPin}
                  onChange={(e) => setExistingPin(e.target.value)}
                  className="rounded-xl border border-neutral-200 px-3 py-3 text-base text-neutral-900 shadow-sm focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                />
              </label>

              {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 border border-red-200">{error}</div>}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-700 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-800 disabled:bg-neutral-400"
              >
                {loading ? "Wird überprüft..." : "Zu Spiel beitreten"}
              </button>
            </form>
          </div>
        )}

        <Link href="/" className={`${ui.header.backLink} block text-center`}>
          ← Zurück zur Startseite
        </Link>
      </section>
    </main>
  );
}
