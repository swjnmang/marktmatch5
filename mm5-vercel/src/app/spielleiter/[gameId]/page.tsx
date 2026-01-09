"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { db } from "@/lib/firebase";
import { doc, collection, onSnapshot, updateDoc, writeBatch, getDocs } from "firebase/firestore";
import { checkPinFromLocalStorage } from "@/lib/auth";
import type { GameDocument, GroupState, PeriodDecision } from "@/lib/types";
import { calculateMarket, type MarketCalculationInput } from "@/lib/gameLogic";

export default function GameDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameId = params.gameId as string;
  const showPinsParam = searchParams.get('showPins');

  const [game, setGame] = useState<GameDocument | null>(null);
  const [groups, setGroups] = useState<GroupState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isPinValid, setIsPinValid] = useState(false);
  const [startLoading, setStartLoading] = useState(false);
  const [startError, setStartError] = useState("");
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [calculateLoading, setCalculateLoading] = useState(false);
  const [showAdminPin, setShowAdminPin] = useState(false);

  const allGroupsReady = groups.length > 0 && groups.every((g) => g.status === "ready");
  const allGroupsSubmitted = groups.length > 0 && groups.every((g) => g.status === "submitted");
  const lobbyStartDisabled = game?.status !== "lobby" || groups.length === 0 || !allGroupsReady || startLoading;
  const canAdvanceAfterSelection =
    game?.status === "in_progress" && game.phase === "machine_selection" && allGroupsReady;
  const canCalculate = 
    game?.status === "in_progress" && game.phase === "decisions" && allGroupsSubmitted;

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
    const unsubscribeGame = onSnapshot(
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

    // Hole Gruppen aus Subcollection
    const unsubscribeGroups = onSnapshot(
      collection(db, "games", gameId, "groups"),
      (snapshot) => {
        const nextGroups = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as GroupState));
        setGroups(nextGroups);
      },
      (err) => {
        console.error("Error loading groups:", err);
        setError(`Fehler beim Laden der Gruppen: ${err.message}`);
      }
    );

    return () => {
      unsubscribeGame();
      unsubscribeGroups();
    };
  }, [gameId, router]);

  // Countdown für aktuelle Phase
  useEffect(() => {
    if (!game?.phaseEndsAt) {
      setTimeLeft(null);
      return;
    }

    const updateTime = () => {
      const remaining = game.phaseEndsAt! - Date.now();
      setTimeLeft(remaining > 0 ? remaining : 0);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [game?.phaseEndsAt]);

  const formattedTimeLeft = () => {
    if (timeLeft == null) return "";
    const totalSeconds = Math.floor(timeLeft / 1000);
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

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
    <main className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 px-4 py-6">
      <section className="mx-auto max-w-4xl space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {game.status === "lobby" ? "🎮 Lobby" : "Spiel-Dashboard"}
          </h1>
        </div>

        {/* PIN Display Card */}
        {game.status === "lobby" && (
          <div className="rounded-xl bg-gradient-to-br from-sky-50 to-blue-50 p-4 shadow-lg ring-2 ring-sky-300">
            <h2 className="text-lg font-bold text-slate-900 mb-3">Lobby-Verbindung</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4 items-center">
              {/* Gruppen-PIN mit QR */}
              <div className="flex justify-center">
                <div className="bg-white p-2 rounded-lg border-2 border-sky-300">
                  <QRCodeSVG 
                    value={`${typeof window !== 'undefined' ? window.location.origin : 'https://marktmatch5.vercel.app'}/gruppe/${gameId}?pin=${game.joinPin}`} 
                    size={140}
                    level="H"
                    includeMargin={false}
                  />
                </div>
              </div>

              {/* PIN zum Eingeben */}
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-600 mb-2">👥 Beitrittscode für Gruppen:</p>
                  <div className="flex gap-2 items-center">
                    <div className="font-mono text-3xl font-bold text-sky-700 bg-white px-4 py-2 rounded-lg border-2 border-sky-300">
                      {game.joinPin}
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(game.joinPin);
                        alert("✅ PIN kopiert!");
                      }}
                      className="rounded-lg bg-sky-600 px-3 py-2 text-sm text-white font-semibold hover:bg-sky-700 transition whitespace-nowrap"
                    >
                      📋
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    QR-Code scannen oder PIN eingeben
                  </p>
                </div>

                {/* Admin-PIN Bereich inline */}
                <div className="border-t pt-3">
                  <button
                    onClick={() => setShowAdminPin(!showAdminPin)}
                    className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center gap-2"
                  >
                    {showAdminPin ? "▼" : "▶"} 🔑 Admin-PIN
                  </button>
                  
                  {showAdminPin && game.adminPin && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex gap-2 items-center">
                        <div className="font-mono text-lg font-bold text-red-700 bg-white px-3 py-1 rounded border border-red-300">
                          {game.adminPin}
                        </div>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(game.adminPin);
                            alert("✅ Admin-PIN kopiert!");
                          }}
                          className="rounded bg-red-600 px-2 py-1 text-xs text-white font-semibold hover:bg-red-700 transition"
                        >
                          📋
                        </button>
                      </div>
                      <p className="text-xs text-red-700 mt-1">⚠️ Nur für Spielleitung</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Game Info + Groups Combined */}
        <div className="rounded-xl bg-white p-4 shadow-lg ring-1 ring-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-slate-900">
              {game.status === "lobby" ? "Wartende Gruppen" : "Spielstand"}
            </h2>
            <div className="flex gap-2 text-xs">
              {game.status === "lobby" && (
                <>
                  <span className="rounded-lg bg-emerald-50 px-2 py-1 text-emerald-700 border border-emerald-200">
                    ✓ {groups.filter((g) => g.status === "ready").length}
                  </span>
                  <span className="rounded-lg bg-amber-50 px-2 py-1 text-amber-700 border border-amber-200">
                    ⏳ {groups.filter((g) => g.status !== "ready").length}
                  </span>
                </>
              )}
              {game.status === "in_progress" && (
                <>
                  <span className="rounded-lg bg-sky-50 px-2 py-1 text-sky-700 border border-sky-200">
                    P{game.period}
                  </span>
                  <span className="rounded-lg bg-indigo-50 px-2 py-1 text-indigo-700 border border-indigo-200">
                    {game.phase === "machine_selection" ? "Maschinen" : game.phase === "decisions" ? "Entscheidungen" : "Ergebnisse"}
                  </span>
                  {timeLeft != null && (
                    <span className="rounded-lg bg-amber-50 px-2 py-1 text-amber-700 border border-amber-200">
                      {formattedTimeLeft()}
                    </span>
                  )}
                  {game.phase === "decisions" && (
                    <span className="rounded-lg bg-emerald-50 px-2 py-1 text-emerald-700 border border-emerald-200">
                      {groups.filter((g) => g.status === "submitted").length}/{groups.length}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {groups.length > 0 ? (
              groups.map((group, index) => (
                <div
                  key={group.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 hover:border-sky-400 hover:bg-sky-50 transition"
                >
                  <div>
                    <p className="font-semibold text-sm text-slate-900">
                      {group.name || `Gruppe ${index + 1}`}
                    </p>
                    <div className="flex gap-3 text-xs text-slate-600">
                      <span>{group.status === "ready" ? "✓ Bereit" : group.status === "submitted" ? "✓ Eingereicht" : "⏳ Wartend"}</span>
                      {group.selectedMachine && (
                        <span>• {group.selectedMachine}</span>
                      )}
                    </div>
                  </div>
                  {game.status !== "lobby" && (
                    <div className="text-right text-xs text-slate-600">
                      <p>€{group.capital.toLocaleString("de-DE")}</p>
                      <p className="text-slate-500">Lager: {group.inventory}</p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-center text-slate-600 py-4 text-sm">
                {game.status === "lobby" 
                  ? "Noch keine Gruppen beigetreten. Teile den Gruppen-PIN!" 
                  : "Keine Gruppen vorhanden"}
              </p>
            )}
          </div>
        </div>

        {/* Actions - Kompakt */}
        <div className="rounded-xl bg-white p-4 shadow-lg ring-1 ring-slate-200">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-slate-900">Aktionen</h2>
              <p className="text-xs text-slate-600 mt-1">
                {game.status === "lobby"
                  ? "Starte das Spiel, wenn alle Gruppen bereit sind."
                  : game.phase === "machine_selection"
                  ? "Aktiviere die Entscheidungsphase, wenn alle Gruppen ihre Maschine gewählt haben."
                  : game.phase === "decisions"
                  ? "Berechne die Ergebnisse, wenn alle Gruppen eingereicht haben."
                  : game.phase === "results"
                  ? "Starte die nächste Periode."
                  : "Verwalte den Spielablauf."}
              </p>
              {startError && (
                <div className="mt-2 rounded bg-red-50 p-2 text-xs text-red-700">{startError}</div>
              )}
            </div>

          {/* Lobby Start Button */}
          {game.status === "lobby" && (
            <button
              disabled={lobbyStartDisabled}
              onClick={async () => {
                if (!game) return;
                setStartLoading(true);
                setStartError("");
                try {
                  const endsAt = Date.now() + (game.parameters?.periodDurationMinutes || 10) * 60 * 1000;
                  const batch = writeBatch(db);
                  batch.update(doc(db, "games", gameId), {
                    status: "in_progress",
                    period: 1,
                    phase: "machine_selection",
                    phaseEndsAt: endsAt,
                  });
                  groups.forEach((g) => {
                    batch.update(doc(db, "games", gameId, "groups", g.id), {
                      status: "selecting",
                      machines: [],
                      selectedMachine: "",
                    });
                  });
                  await batch.commit();
                } catch (err: any) {
                  console.error("Error starting game:", err);
                  setStartError(`Fehler beim Starten: ${err.message}`);
                } finally {
                  setStartLoading(false);
                }
              }}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {startLoading ? "Startet..." : `🚀 Spiel starten`}
            </button>
          )}

          {/* Advance to Decisions Phase */}
          {game.status === "in_progress" && game.phase === "machine_selection" && (
            <button
              disabled={!canAdvanceAfterSelection || startLoading}
              onClick={async () => {
                if (!game) return;
                setStartLoading(true);
                setStartError("");
                try {
                  const endsAt = Date.now() + (game.parameters?.periodDurationMinutes || 10) * 60 * 1000;
                  const batch = writeBatch(db);
                  batch.update(doc(db, "games", gameId), {
                    phase: "decisions",
                    phaseEndsAt: endsAt,
                  });
                  groups.forEach((g) => {
                    batch.update(doc(db, "games", gameId, "groups", g.id), { status: "waiting" });
                  });
                  await batch.commit();
                } catch (err: any) {
                  console.error("Error advancing phase:", err);
                  setStartError(`Fehler: ${err.message}`);
                } finally {
                  setStartLoading(false);
                }
              }}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {startLoading ? "Nächste..." : "▶️ Entscheidungsphase"}
            </button>
          )}

          {/* Calculate Results */}
          {game.status === "in_progress" && game.phase === "decisions" && (
            <button
              disabled={!canCalculate || calculateLoading}
              onClick={async () => {
                if (!game) return;
                setCalculateLoading(true);
                setStartError("");
                try {
                  // Hole alle Entscheidungen
                  const decisionsSnapshot = await getDocs(collection(db, "games", gameId, "decisions"));
                  const decisions: { [groupId: string]: PeriodDecision } = {};
                  decisionsSnapshot.forEach((doc) => {
                    decisions[doc.id] = doc.data() as PeriodDecision;
                  });

                  // Baue Eingaben für Marktberechnung
                  const inputs: MarketCalculationInput[] = groups.map((group) => ({
                    groupId: group.id,
                    decision: decisions[group.id],
                    groupState: group,
                  }));

                  // Berechne Markt
                  const results = calculateMarket(game.parameters, game.period, inputs);

                  // Aktualisiere Gruppen mit Ergebnissen
                  const batch = writeBatch(db);
                  results.forEach((result) => {
                    batch.update(doc(db, "games", gameId, "groups", result.groupId), {
                      capital: result.newCapital,
                      inventory: result.newInventory,
                      cumulativeProfit: result.newCumulativeProfit,
                      cumulativeRndInvestment: result.newCumulativeRndInvestment,
                      rndBenefitApplied: result.newRndBenefitApplied,
                      machines: result.newMachines,
                      status: "calculated",
                      lastResult: result.result,
                    });
                  });

                  // Setze Phase auf "results"
                  batch.update(doc(db, "games", gameId), {
                    phase: "results",
                    phaseEndsAt: null,
                  });

                  await batch.commit();
                } catch (err: any) {
                  console.error("Error calculating results:", err);
                  setStartError(`Fehler bei Berechnung: ${err.message}`);
                } finally {
                  setCalculateLoading(false);
                }
              }}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {calculateLoading ? "Berechne..." : "🔢 Ergebnisse"}
            </button>
          )}

          {/* Next Period */}
          {game.status === "in_progress" && game.phase === "results" && (
            <button
              disabled={startLoading}
              onClick={async () => {
                if (!game) return;
                setStartLoading(true);
                setStartError("");
                try {
                  const endsAt = Date.now() + (game.parameters?.periodDurationMinutes || 10) * 60 * 1000;
                  const batch = writeBatch(db);
                  batch.update(doc(db, "games", gameId), {
                    period: game.period + 1,
                    phase: "decisions",
                    phaseEndsAt: endsAt,
                  });
                  groups.forEach((g) => {
                    batch.update(doc(db, "games", gameId, "groups", g.id), { status: "waiting" });
                  });
                  await batch.commit();
                } catch (err: any) {
                  console.error("Error starting next period:", err);
                  setStartError(`Fehler: ${err.message}`);
                } finally {
                  setStartLoading(false);
                }
              }}
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              {startLoading ? "Startet..." : `⏭️ Periode ${game.period + 1}`}
            </button>
          )}
          </div>
        </div>

        <Link href="/spielleiter" className="text-sm font-semibold text-sky-700 hover:underline">
          ← Zurück zur Übersicht
        </Link>
      </section>
    </main>
  );
}
