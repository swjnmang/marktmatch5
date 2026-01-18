"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react/no-unescaped-entities */

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { db } from "@/lib/firebase";
import { doc, collection, onSnapshot, updateDoc, writeBatch, getDocs, setDoc, deleteDoc, getDoc, type Timestamp } from "firebase/firestore";
import { checkPinFromLocalStorage } from "@/lib/auth";
import { PREDEFINED_TASKS } from "@/lib/special-tasks";
import type { GameDocument, GroupState, PeriodDecision, SpecialTask } from "@/lib/types";
import { calculateMarket, type MarketCalculationInput } from "@/lib/gameLogic";
import { PeriodTimer } from "@/components/PeriodTimer";
import { SpielleiterDashboard } from "@/components/SpielleiterDashboard";
// import { SessionManagementPanel } from "@/components/SessionManagementPanel"; // Removed: Using group edit modal instead

export default function GameDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const gameId = params.gameId as string;
  const showPinsParam = searchParams.get('showPins');

  const [game, setGame] = useState<GameDocument | null>(null);
  const [groups, setGroups] = useState<GroupState[]>([]);
  const [currentTask, setCurrentTask] = useState<SpecialTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isPinValid, setIsPinValid] = useState(false);
  const [startLoading, setStartLoading] = useState(false);
  const [startError, setStartError] = useState("");
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [calculateLoading, setCalculateLoading] = useState(false);
  const [showAdminPin, setShowAdminPin] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [customTaskTitle, setCustomTaskTitle] = useState("");
  const [customTaskDesc, setCustomTaskDesc] = useState("");
  const [taskLoading, setTaskLoading] = useState(false);
  const [allowMachinePurchaseNext, setAllowMachinePurchaseNext] = useState(false);
  const [demandBoostNext, setDemandBoostNext] = useState(false);
  const [freeMarketAnalysisNext, setFreeMarketAnalysisNext] = useState(false);
  const [noInventoryCostsNext, setNoInventoryCostsNext] = useState(false);
  const [allowRnDNext, setAllowRnDNext] = useState(false);
  const [rndThresholdNext, setRndThresholdNext] = useState(10000);
  const [customEventNext, setCustomEventNext] = useState("");
  const [showEndGameModal, setShowEndGameModal] = useState(false);
  const [showRankingModal, setShowRankingModal] = useState(false);
  const [showConfirmEndModal, setShowConfirmEndModal] = useState(false);
  const [endGameLoading, setEndGameLoading] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [showActionsModalForNextPeriod, setShowActionsModalForNextPeriod] = useState(false);
  const [showSpecialSection, setShowSpecialSection] = useState(false);
  const [showActionsSection, setShowActionsSection] = useState(false);
  const [showGroupEditModal, setShowGroupEditModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupState | null>(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const allGroupsReady = groups.length > 0 && groups.every((g) => g.status === "ready");
  const allGroupsSubmitted = groups.length > 0 && groups.every((g) => g.status === "submitted");
  const allGroupsAcknowledged = groups.length > 0 && groups.every((g) => g.instructionsAcknowledged === true);
  const lobbyStartDisabled = game?.status !== "lobby" || groups.length === 0 || !allGroupsReady || startLoading;
  const canAdvanceAfterSelection =
    game?.status === "in_progress" && game.phase === "machine_selection" && allGroupsReady && allGroupsAcknowledged;
  const canCalculate = 
    game?.status === "in_progress" && game.phase === "decisions" && allGroupsSubmitted;

  const getRanking = (): Array<{ name: string; capital: number; period: number; profit: number }> => {
    return [...groups]
      .map(g => ({
        name: g.name,
        capital: g.capital,
        period: game?.period || 1,
        profit: g.cumulativeProfit || 0
      }))
      .sort((a, b) => b.profit - a.profit);
  };

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
          const next = docSnap.data() as GameDocument;
          setGame(next);
          setAllowMachinePurchaseNext(!!next.parameters?.allowMachinePurchaseNextPeriod);
          setDemandBoostNext(!!next.parameters?.demandBoostNextPeriod);
          setFreeMarketAnalysisNext(!!next.parameters?.freeMarketAnalysisNextPeriod);
          setNoInventoryCostsNext(!!next.parameters?.noInventoryCostsNextPeriod);
          setAllowRnDNext(!!next.activePeriodActions?.allowRnD);
          setRndThresholdNext(next.activePeriodActions?.rndThreshold || 10000);
          setCustomEventNext(next.parameters?.customEventNextPeriod || "");
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

  // Lade aktuelle Spezialaufgabe
  useEffect(() => {
    if (!gameId) return;
    
    const unsubscribeTask = onSnapshot(
      collection(db, "games", gameId, "specialTasks"),
      (snapshot) => {
        const tasks = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as SpecialTask));
        // Nur die neueste Task anzeigen
        if (tasks.length > 0) {
          setCurrentTask(tasks[0]);
        } else {
          setCurrentTask(null);
        }
      }
    );

    return () => unsubscribeTask();
  }, [gameId]);

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

  // Sende Spezialauftrag
  const handleSendTask = async () => {
    if (!gameId || !game) return;
    
    setTaskLoading(true);
    setStartError("");
    
    try {
      // Bestimme Titel und Beschreibung
      let title = "";
      let description = "";
      
      if (selectedTaskId === "custom") {
        title = customTaskTitle;
        description = customTaskDesc;
      } else {
        const predefined = PREDEFINED_TASKS.find(t => t.id === selectedTaskId);
        if (predefined) {
          title = predefined.title;
          description = predefined.description;
        }
      }
      
      if (!title || !description) {
        throw new Error("Bitte Titel und Beschreibung ausfüllen");
      }
      
      // Lösche alte Tasks dieser Periode
      const oldTasksSnapshot = await getDocs(
        collection(db, "games", gameId, "specialTasks")
      );
      const batch = writeBatch(db);
      oldTasksSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      // Erstelle neue Task
      const newTask: SpecialTask = {
        id: Date.now().toString(),
        period: game.period,
        title,
        description,
        createdAt: new Date() as unknown as Timestamp
      };
      
      batch.set(
        doc(db, "games", gameId, "specialTasks", newTask.id),
        newTask
      );
      
      await batch.commit();
      
      // Schließe Modal und reset Felder
      setShowTaskModal(false);
      setSelectedTaskId("");
      setCustomTaskTitle("");
      setCustomTaskDesc("");
    } catch (err: any) {
      console.error("Error sending task:", err);
      setStartError(`Fehler beim Absenden: ${err.message}`);
    } finally {
      setTaskLoading(false);
    }
  };

  // Lösche Spezialauftrag
  const handleDeleteTask = async () => {
    if (!gameId || !currentTask) return;
    
    setTaskLoading(true);
    try {
      await deleteDoc(doc(db, "games", gameId, "specialTasks", currentTask.id));
    } catch (err: any) {
      console.error("Error deleting task:", err);
      setStartError(`Fehler beim Löschen: ${err.message}`);
    } finally {
      setTaskLoading(false);
    }
  };

  if (!isPinValid) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-neutral-100 via-neutral-100 to-neutral-200 px-4 py-10">
        <section className="mx-auto max-w-2xl text-center">
          <p className="text-neutral-600">Authentifizierung erforderlich...</p>
        </section>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-neutral-100 via-neutral-100 to-neutral-200 px-4 py-10">
        <section className="mx-auto max-w-4xl">
          <div className="text-center text-neutral-600">Spiel wird geladen...</div>
        </section>
      </main>
    );
  }

  if (error || !game) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-neutral-100 via-neutral-100 to-neutral-200 px-4 py-10">
        <section className="mx-auto max-w-4xl">
          <div className="rounded-lg bg-red-50 p-4 text-red-700">{error || "Spiel nicht gefunden"}</div>
          <Link href="/spielleiter" className="mt-4 text-neutral-700 hover:underline">
            ← Zurück zur Startseite
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-100 via-neutral-100 to-neutral-200 px-4 py-6">
      <section className="mx-auto max-w-4xl space-y-4">
        {/* Game Finished - Show End Screen */}
        {game.status === "finished" && (
          <>
            {/* Header */}
            <div>
              <h1 className="text-3xl font-bold text-neutral-800">🎉 Spiel beendet!</h1>
            </div>

            {/* Finish Screen */}
            <div className="rounded-2xl border-3 border-emerald-400 bg-gradient-to-br from-emerald-50 to-emerald-100 p-8 shadow-lg">
              <div className="text-center mb-8">
                <h2 className="text-4xl font-bold text-emerald-900 mb-4">Das Unternehmensplanspiel ist vorbei!</h2>
                <p className="text-emerald-800 text-lg">
                  Herzlichen Glückwunsch - Periode {game.period} erfolgreich abgeschlossen.
                </p>
              </div>

              {/* Ranking */}
              <div className="bg-white rounded-lg p-6 border border-emerald-300 shadow-sm mb-6">
                <h3 className="text-2xl font-bold text-neutral-900 mb-6 text-center">📊 Abschlussranking</h3>
                <div className="space-y-3">
                  {groups
                    .slice()
                    .sort((a, b) => (b.cumulativeProfit || 0) - (a.cumulativeProfit || 0))
                    .map((group, index) => {
                      const medalEmoji = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "•";
                      
                      return (
                        <div
                          key={group.id}
                          className={`flex items-center justify-between p-4 rounded-lg border-2 transition ${
                            index === 0
                              ? "bg-amber-50 border-amber-400"
                              : "bg-neutral-50 border-neutral-200"
                          }`}
                        >
                          <div className="flex items-center gap-4 flex-1">
                            <span className="text-3xl font-bold w-8 text-center">
                              {medalEmoji}
                            </span>
                            <div>
                              <p className={`font-semibold text-lg ${index === 0 ? "text-amber-900" : "text-neutral-900"}`}>
                                #{index + 1} {group.name}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-2xl font-bold ${index === 0 ? "text-amber-600" : "text-neutral-900"}`}>
                              €{(group.cumulativeProfit || 0).toLocaleString("de-DE")}
                            </p>
                            <p className="text-xs text-neutral-600">Gesamtgewinn</p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-center">
                <Link
                  href="/spielleiter"
                  className="rounded-lg bg-neutral-600 px-6 py-3 text-base font-semibold text-white shadow-md transition hover:bg-neutral-700"
                >
                  ← Zurück zur Übersicht
                </Link>
                <button
                  onClick={async () => {
                    if (!confirm("Möchtest du das Spiel wirklich zurücksetzen und neu starten?")) return;
                    setStartLoading(true);
                    try {
                      const batch = writeBatch(db);
                      
                      // Reset game status
                      batch.update(doc(db, "games", gameId), {
                        status: "lobby",
                        period: 0,
                        phase: "none",
                        phaseEndsAt: null,
                        allowMachinePurchase: false,
                      });
                      
                      // Reset all groups
                      groups.forEach((g) => {
                        batch.update(doc(db, "games", gameId, "groups", g.id), {
                          status: "waiting",
                          machines: [],
                          capital: game.parameters.startingCapital,
                          inventory: 0,
                          cumulativeProfit: 0,
                          cumulativeRndInvestment: 0,
                          rndBenefitApplied: false,
                          lastResult: null,
                          instructionsAcknowledged: false,
                        });
                      });
                      
                      await batch.commit();
                      alert("✓ Spiel wurde zurückgesetzt!");
                    } catch (err: any) {
                      alert(`Fehler: ${err.message}`);
                    } finally {
                      setStartLoading(false);
                    }
                  }}
                  disabled={startLoading}
                  className="rounded-lg bg-emerald-600 px-6 py-3 text-base font-semibold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  🔄 Spiel neu starten
                </button>
              </div>
            </div>

            <Link
              href="/spielleiter"
              className="text-sm font-semibold text-neutral-700 underline-offset-4 hover:underline"
            >
              ← Zur Spielleiter-Startseite
            </Link>
          </>
        )}

        {/* Normal dashboard - only show if not finished */}
        {game.status !== "finished" && (
          <>
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-neutral-800">
            {game.status === "lobby" ? "🎮 Lobby" : "Spiel-Dashboard"}
          </h1>
        </div>

        {/* PIN Display Card */}
        {game.status === "lobby" && (
          <div className="rounded-xl bg-white p-4 shadow-md ring-2 border-2 border-neutral-300">
            <h2 className="text-lg font-bold text-neutral-900 mb-3">Lobby-Verbindung</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4 items-center">
              {/* Gruppen-PIN mit QR */}
              <div className="flex justify-center">
                <div className="bg-white p-2 rounded-lg border-2 border-neutral-300">
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
                  <p className="text-xs font-semibold text-neutral-600 mb-2">👥 Beitrittscode für Gruppen:</p>
                  <div className="flex gap-2 items-center">
                    <div className="font-mono text-3xl font-bold text-neutral-800 bg-white px-4 py-2 rounded-lg border-2 border-neutral-300">
                      {game.joinPin}
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(game.joinPin);
                        alert("✅ PIN kopiert!");
                      }}
                      className="rounded-lg bg-neutral-400 px-3 py-2 text-sm text-white font-semibold hover:bg-neutral-600 transition whitespace-nowrap"
                    >
                      📋
                    </button>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    QR-Code scannen oder PIN eingeben
                  </p>
                </div>

                {/* Share Link */}
                <div>
                  <p className="text-xs font-semibold text-neutral-600 mb-2">🔗 Direkt-Link zum Beitreten:</p>
                  <div className="flex gap-2 items-center">
                    <input
                      type="text"
                      readOnly
                      value={`${typeof window !== 'undefined' ? window.location.origin : 'https://marktmatch5.vercel.app'}/gruppe/${gameId}?pin=${game.joinPin}`}
                      className="flex-1 text-xs bg-white px-3 py-2 rounded-lg border border-neutral-300 text-neutral-700 font-mono"
                    />
                    <button
                      onClick={() => {
                        const link = `${typeof window !== 'undefined' ? window.location.origin : 'https://marktmatch5.vercel.app'}/gruppe/${gameId}?pin=${game.joinPin}`;
                        navigator.clipboard.writeText(link);
                        alert("✅ Link kopiert!");
                      }}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white font-semibold hover:bg-emerald-700 transition whitespace-nowrap"
                    >
                      📋
                    </button>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    Link direkt teilen - PIN ist automatisch eingefügt
                  </p>
                </div>

                {/* Admin-PIN Bereich inline */}
                <div className="border-t pt-3">
                  <button
                    onClick={() => setShowAdminPin(!showAdminPin)}
                    className="text-xs font-semibold text-neutral-700 hover:text-neutral-900 flex items-center gap-2"
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

        {/* NEW Modern Dashboard for In-Progress Games */}
        {game.status === "in_progress" && (
          <SpielleiterDashboard
            game={game}
            groups={groups}
            onStartPeriod={async () => {
              if (!game) return;
              setStartLoading(true);
              setStartError("");
              try {
                const endsAt = Date.now() + (game.parameters?.periodDurationMinutes || 10) * 60 * 1000;
                const batch = writeBatch(db);

                // Intelligente Phase-Verwaltung basierend auf aktuellem Status
                if (game.phase === "machine_selection") {
                  // Nach Maschinenwahl → Entscheidungsphase starten
                  // WICHTIG: Status der Gruppen NICHT ändern! Sie bleiben "ready"
                  batch.update(doc(db, "games", gameId), {
                    phase: "decisions",
                    phaseEndsAt: endsAt,
                    periodDeadline: endsAt,
                  });
                } else if (game.phase === "decisions") {
                  // Wenn alle Gruppen entschieden haben → Auswertung starten (phase: "results")
                  if (!allGroupsSubmitted) {
                    throw new Error("Nicht alle Gruppen haben entschieden!");
                  }
                  
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
                  const results = calculateMarket(game.parameters, game.period, inputs, game.activePeriodActions);

                  // Aktualisiere Gruppen mit Ergebnissen
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
                    periodDeadline: null,
                    allowMachinePurchase: false,
                  });
                } else if (game.phase === "results") {
                  // Nach Auswertung → Nächste Periode starten
                  const actionsForNextPeriod = {
                    period: game.period + 1,
                    allowMachinePurchase: allowMachinePurchaseNext,
                    demandBoost: demandBoostNext,
                    freeMarketAnalysis: freeMarketAnalysisNext,
                    noInventoryCosts: noInventoryCostsNext,
                    allowRnD: allowRnDNext,
                    rndThreshold: rndThresholdNext,
                    customEvent: customEventNext.trim(),
                  };

                  // Determine next phase:
                  // - Period 1 OR allowMachinePurchaseNext: go to machine_selection
                  // - Period 2+ without machine purchase: skip to decisions
                  const nextPhase = (game.period === 1 || allowMachinePurchaseNext) ? "machine_selection" : "decisions";
                  const nextStatus = (game.period === 1 || allowMachinePurchaseNext) ? "selecting" : "waiting";

                  batch.update(doc(db, "games", gameId), {
                    period: game.period + 1,
                    phase: nextPhase,
                    phaseEndsAt: endsAt,
                    allowMachinePurchase: allowMachinePurchaseNext,
                    activePeriodActions: actionsForNextPeriod,
                    "parameters.allowMachinePurchaseNextPeriod": false,
                    "parameters.demandBoostNextPeriod": false,
                    "parameters.freeMarketAnalysisNextPeriod": false,
                    "parameters.noInventoryCostsNextPeriod": false,
                    "parameters.customEventNextPeriod": "",
                  });
                  groups.forEach((g) => {
                    batch.update(doc(db, "games", gameId, "groups", g.id), { 
                      status: nextStatus,
                      selectedMachine: "",
                      machines: [],
                      // DO NOT reset instructionsAcknowledged! Groups should skip welcome screen in next periods
                    });
                  });
                  setAllowMachinePurchaseNext(false);
                  setDemandBoostNext(false);
                  setFreeMarketAnalysisNext(false);
                  setNoInventoryCostsNext(false);
                  setAllowRnDNext(false);
                  setRndThresholdNext(10000);
                  setCustomEventNext("");
                }

                await batch.commit();
              } catch (err: any) {
                console.error("Error in period progression:", err);
                setStartError(`Fehler: ${err.message}`);
              } finally {
                setStartLoading(false);
              }
            }}
            onEditGroup={(group) => {
              setEditingGroup(group);
              setEditGroupName(group.name || "");
              setShowGroupEditModal(true);
            }}
            onShowSettings={() => setShowSettingsModal(true)}
            onShowRanking={() => setShowRankingModal(true)}
            onShowSpecialTasks={() => setShowTaskModal(true)}
            onShowActions={() => setShowActionsModalForNextPeriod(true)}
            onEndGame={() => setShowConfirmEndModal(true)}
            startLoading={startLoading}
          />
        )}

        {/* Lobby - Compact Group List */}
        {game.status === "lobby" && (
          <div className="rounded-xl bg-white p-4 shadow-lg ring-1 ring-neutral-200">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-neutral-900">
                Wartende Gruppen ({groups.length})
              </h2>
              <div className="flex gap-2 text-xs">
                <span className="rounded-lg bg-emerald-50 px-2 py-1 text-emerald-700 border border-emerald-200">
                  ✓ {groups.filter((g) => g.status === "ready").length}
                </span>
                <span className="rounded-lg bg-amber-50 px-2 py-1 text-amber-700 border border-amber-200">
                  ⏳ {groups.filter((g) => g.status !== "ready").length}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {groups.length > 0 ? (
                groups.map((group) => (
                  <div
                    key={group.id}
                    className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 hover:bg-neutral-100 transition"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="text-sm">
                        <span className="font-semibold text-neutral-900">
                          Gruppe: {group.name || `Gruppe`}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-semibold ${
                        group.status === "ready"
                          ? "text-emerald-700"
                          : "text-amber-700"
                      }`}>
                        {group.status === "ready" ? "✓ Bereit" : "⏳ Wartend"}
                      </span>
                      <button
                        onClick={() => {
                          setEditingGroup(group);
                          setEditGroupName(group.name || "");
                          setShowGroupEditModal(true);
                        }}
                        className="rounded px-3 py-1 text-xs font-semibold text-white bg-neutral-600 hover:bg-neutral-700 transition whitespace-nowrap"
                        title="Gruppe bearbeiten"
                      >
                        ⚙️ Einstellungen
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-neutral-600 py-4 text-sm">
                  Noch keine Gruppen beigetreten. Teile den Gruppen-PIN!
                </p>
              )}
            </div>
          </div>
        )}

        {/* Settings & Actions - Vertical Layout (Only for Lobby) */}
        {game.status === "lobby" && (
        <div className="rounded-xl bg-white p-4 shadow-lg ring-1 ring-neutral-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-neutral-900">Einstellungen & Aktionen</h2>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="rounded-lg bg-neutral-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-700 transition"
            >
              ⚙️ Spieleinstellungen
            </button>
          </div>
          
          <p className="text-xs text-neutral-600 mb-4">
            {game.status === "lobby"
              ? "Starte das Spiel, wenn alle Gruppen bereit sind."
              : game.phase === "machine_selection"
              ? "Aktiviere die Entscheidungsphase, wenn alle Gruppen ihre Maschine gewählt haben."
              : game.phase === "decisions"
              ? "Warte auf Entscheidungen aller Gruppen."
              : game.phase === "results"
              ? "Starte die nächste Periode."
              : "Verwalte den Spielablauf."}
          </p>
          
          {startError && (
            <div className="mb-4 rounded bg-red-50 p-2 text-xs text-red-700">{startError}</div>
          )}

          {/* Special Tasks Section (collapsible) */}
          <div className="pt-4 border-t border-neutral-200">
            <button
              type="button"
              onClick={() => setShowSpecialSection((v) => !v)}
              aria-expanded={showSpecialSection}
              className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left hover:bg-neutral-50"
            >
              <h3 className="text-sm font-semibold text-neutral-900">📋 Spezialaufträge an Gruppen schicken</h3>
              <span className="text-xs text-neutral-500">{showSpecialSection ? "Ausklappen schließen" : "Ausklappen"}</span>
            </button>
            {showSpecialSection && (
              <div className="mt-2">
                <p className="text-xs text-neutral-600 mb-3">
                  Spezialaufträge werden allen Gruppen als <strong>große Vollbild-Meldung</strong> angezeigt und müssen bestätigt werden. 
                  Sie können jederzeit gesendet werden (auch vor Periode 1). 
                  Empfehlung: <span className="font-semibold text-amber-800">"Unternehmensplakat gestalten"</span> vor Spielstart.
                </p>
                {currentTask ? (
                  <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-amber-900">{currentTask.title}</h4>
                        <p className="mt-2 text-sm text-amber-800 whitespace-pre-wrap">{currentTask.description}</p>
                      </div>
                      <button
                        onClick={handleDeleteTask}
                        disabled={taskLoading}
                        className="ml-4 rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-200 disabled:opacity-50"
                      >
                        Löschen
                      </button>
                    </div>
                    <p className="mt-3 text-xs text-amber-700">✓ Wird den Gruppen als Vollbild-Overlay angezeigt</p>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedTaskId("");
                      setCustomTaskTitle("");
                      setCustomTaskDesc("");
                      setShowTaskModal(true);
                    }}
                    className="w-full rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 px-4 py-3 text-sm font-semibold text-neutral-700 transition hover:border-neutral-400 hover:bg-neutral-100"
                  >
                    + Spezialauftrag auswählen
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Session Management Panel removed - using group edit modal instead */}
        </div>
        )}

        <div className="flex flex-col gap-2">
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
              className="rounded-lg bg-neutral-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-700 disabled:bg-neutral-300 disabled:cursor-not-allowed"
            >
              {startLoading ? "Startet..." : `🚀 Spiel starten`}
            </button>
          )}

          {/* SpielleiterDashboard Component handles all other period transitions */}
        </div>

        {/* Special Task Modal */}
        {showTaskModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl">
              <div className="sticky top-0 border-b border-neutral-200 bg-white px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-neutral-900">Spezialauftrag auswählen</h2>
                <button
                  onClick={() => setShowTaskModal(false)}
                  className="text-neutral-500 hover:text-neutral-700"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Predefined Tasks */}
                <div>
                  <label className="block text-sm font-semibold text-neutral-900 mb-3">Vorgefertigte Aufträge:</label>
                  <div className="space-y-2">
                    {PREDEFINED_TASKS.map((task) => (
                      <label
                        key={task.id}
                        className="flex items-start gap-3 rounded-lg border border-neutral-200 p-3 cursor-pointer hover:bg-neutral-50"
                      >
                        <input
                          type="radio"
                          name="task"
                          value={task.id}
                          checked={selectedTaskId === task.id}
                          onChange={(e) => {
                            setSelectedTaskId(e.target.value);
                            setCustomTaskTitle("");
                            setCustomTaskDesc("");
                          }}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <p className="font-semibold text-neutral-900">{task.title}</p>
                          <p className="text-xs text-neutral-600 line-clamp-2">{task.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-neutral-200"></div>
                  <span className="text-xs text-neutral-600">oder</span>
                  <div className="flex-1 h-px bg-neutral-200"></div>
                </div>

                {/* Custom Task */}
                <div>
                  <label className="block text-sm font-semibold text-neutral-900 mb-2">Eigener Auftrag:</label>
                  <label className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3 cursor-pointer hover:bg-neutral-50 mb-3">
                    <input
                      type="radio"
                      name="task"
                      value="custom"
                      checked={selectedTaskId === "custom"}
                      onChange={() => setSelectedTaskId("custom")}
                    />
                    <span className="text-sm text-neutral-700">Benutzerdefinierten Auftrag eingeben</span>
                  </label>

                  {selectedTaskId === "custom" && (
                    <div className="space-y-3 ml-8">
                      <input
                        type="text"
                        placeholder="Auftrags-Titel"
                        value={customTaskTitle}
                        onChange={(e) => setCustomTaskTitle(e.target.value)}
                        className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                      />
                      <textarea
                        placeholder="Auftrags-Beschreibung..."
                        value={customTaskDesc}
                        onChange={(e) => setCustomTaskDesc(e.target.value)}
                        rows={6}
                        className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm"
                      />
                    </div>
                  )}
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowTaskModal(false)}
                    className="flex-1 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={handleSendTask}
                    disabled={taskLoading || !selectedTaskId || (selectedTaskId === "custom" && (!customTaskTitle || !customTaskDesc))}
                    className="flex-1 rounded-lg bg-neutral-600 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700 disabled:bg-neutral-300 disabled:cursor-not-allowed"
                  >
                    {taskLoading ? "Wird gesendet..." : "Auftrag senden"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Ranking Modal */}
        {showRankingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
              <div className="sticky top-0 border-b border-neutral-200 bg-white px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-neutral-900">Ranking - Periode {game?.period}</h2>
                <button
                  onClick={() => setShowRankingModal(false)}
                  className="text-neutral-500 hover:text-neutral-700"
                >
                  ✕
                </button>
              </div>

              <div className="p-6">
                <div className="space-y-3">
                  {getRanking().map((team, idx) => (
                    <div
                      key={team.name}
                      className={`flex items-center justify-between rounded-lg p-4 ${
                        idx === 0
                          ? "border-2 border-amber-400 bg-amber-50"
                          : idx === 1
                          ? "border-2 border-gray-300 bg-gray-50"
                          : idx === 2
                          ? "border-2 border-amber-700 bg-amber-50"
                          : "border border-neutral-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-2xl font-bold">
                          {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}.`}
                        </span>
                        <div>
                          <p className="font-semibold text-neutral-900">{team.name}</p>
                          <p className="text-sm text-neutral-600">Kumulativer Gewinn: €{team.profit.toLocaleString("de-DE")}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-neutral-900">€{team.capital.toLocaleString("de-DE")}</p>
                        <p className="text-xs text-neutral-500">Kapital</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setShowRankingModal(false)}
                    className="flex-1 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                  >
                    Schließen
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Confirm End Game Modal */}
        {showConfirmEndModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
              <div className="border-b border-neutral-200 px-6 py-4">
                <h2 className="text-lg font-semibold text-neutral-900">Spiel wirklich beenden?</h2>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm text-neutral-700">
                  Sind Sie sicher, dass Sie das Spiel jetzt beenden möchten? 
                </p>
                <ul className="text-sm text-neutral-600 space-y-2 list-disc list-inside">
                  <li>Gruppen können sich danach nicht mehr anmelden</li>
                  <li>Das Ranking wird als Abschlussstand gespeichert</li>
                  <li>Das Spiel kann nicht wiederhergestellt werden</li>
                </ul>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowConfirmEndModal(false)}
                    className="flex-1 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                  >
                    Abbrechen
                  </button>
                  <button
                    onClick={async () => {
                      setEndGameLoading(true);
                      try {
                        await updateDoc(doc(db, "games", gameId), {
                          status: "finished",
                          phase: "results"
                        });
                        setShowConfirmEndModal(false);
                      } catch (err: any) {
                        console.error("Error ending game:", err);
                        setStartError(`Fehler beim Beenden: ${err.message}`);
                      } finally {
                        setEndGameLoading(false);
                      }
                    }}
                    disabled={endGameLoading}
                    className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-neutral-300 disabled:cursor-not-allowed"
                  >
                    {endGameLoading ? "Wird beendet..." : "Ja, beenden"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* End Game Modal (old) - kept for backwards compatibility but replaced */}
        {showEndGameModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
              <div className="sticky top-0 border-b border-neutral-200 bg-white px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-neutral-900">Spiel beenden - Abschlussbilanz</h2>
                <button
                  onClick={() => setShowEndGameModal(false)}
                  className="text-neutral-500 hover:text-neutral-700"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-4">🏆 Abschlussranking - Periode {game?.period}</h3>
                  <div className="space-y-3">
                    {getRanking().map((team, idx) => (
                      <div
                        key={team.name}
                        className={`flex items-center justify-between rounded-lg p-4 ${
                          idx === 0
                            ? "border-2 border-amber-400 bg-amber-50"
                            : idx === 1
                            ? "border-2 border-gray-300 bg-gray-50"
                            : idx === 2
                            ? "border-2 border-amber-700 bg-amber-50"
                            : "border border-neutral-200 bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <span className="text-2xl font-bold">
                            {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}.`}
                          </span>
                          <div>
                            <p className="font-semibold text-neutral-900">{team.name}</p>
                            <p className="text-sm text-neutral-600">Kumulativer Gewinn: €{team.profit.toLocaleString("de-DE")}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-neutral-900">€{team.capital.toLocaleString("de-DE")}</p>
                          <p className="text-xs text-neutral-500">Kapital</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                  <p className="text-sm text-neutral-800">
                    <strong>ℹ️ Hinweis:</strong> Das Spiel wird nach Bestätigung beendet. Die Gruppen können sich danach nicht mehr anmelden.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowEndGameModal(false)}
                    className="flex-1 rounded-lg border border-neutral-300 px-4 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                  >
                    Zurück
                  </button>
                  <button
                    onClick={async () => {
                      setEndGameLoading(true);
                      try {
                        await updateDoc(doc(db, "games", gameId), {
                          status: "finished",
                          phase: "results"
                        });
                        setShowEndGameModal(false);
                      } catch (err: any) {
                        console.error("Error ending game:", err);
                        setStartError(`Fehler beim Beenden: ${err.message}`);
                      } finally {
                        setEndGameLoading(false);
                      }
                    }}
                    disabled={endGameLoading}
                    className="flex-1 rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-neutral-300 disabled:cursor-not-allowed"
                  >
                    {endGameLoading ? "Wird beendet..." : "✓ Spiel jetzt beenden"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Settings Modal */}
        {showSettingsModal && game && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
              <div className="sticky top-0 border-b border-neutral-200 bg-white px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-neutral-900">⚙️ Spieleinstellungen</h2>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="text-neutral-500 hover:text-neutral-700"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div className="rounded-lg bg-neutral-50 p-4 border border-neutral-200">
                  <p className="text-sm text-neutral-800">
                    💡 <strong>Hinweis:</strong> Änderungen werden sofort übernommen. Einige Einstellungen (Startkapital, Basis-Nachfrage) können nur vor Spielstart geändert werden.
                  </p>
                </div>

                {/* Periodendauer */}
                <div>
                  <label className="block text-sm font-semibold text-neutral-900 mb-2">
                    ⏱️ Periodendauer (Minuten)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    defaultValue={game.parameters.periodDurationMinutes}
                    onBlur={async (e) => {
                      const value = parseInt(e.target.value);
                      if (value > 0 && value <= 60) {
                        setSettingsLoading(true);
                        try {
                          await updateDoc(doc(db, "games", gameId), {
                            "parameters.periodDurationMinutes": value
                          });
                        } catch (err: any) {
                          alert(`Fehler: ${err.message}`);
                        } finally {
                          setSettingsLoading(false);
                        }
                      }
                    }}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-600"
                  />
                  <p className="text-xs text-neutral-600 mt-1">Zeit, die Gruppen für Entscheidungen haben</p>
                </div>

                {/* Marktanalyse-Kosten */}
                <div>
                  <label className="block text-sm font-semibold text-neutral-900 mb-2">
                    📊 Marktanalyse-Kosten (€)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10000"
                    step="100"
                    defaultValue={game.parameters.marketAnalysisCost}
                    onBlur={async (e) => {
                      const value = parseInt(e.target.value);
                      if (value >= 0) {
                        setSettingsLoading(true);
                        try {
                          await updateDoc(doc(db, "games", gameId), {
                            "parameters.marketAnalysisCost": value
                          });
                        } catch (err: any) {
                          alert(`Fehler: ${err.message}`);
                        } finally {
                          setSettingsLoading(false);
                        }
                      }
                    }}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-600"
                  />
                  <p className="text-xs text-neutral-600 mt-1">Preis für Wettbewerbsinformationen</p>
                </div>

                {/* Lagerkosten */}
                <div>
                  <label className="block text-sm font-semibold text-neutral-900 mb-2">
                    📦 Lagerkosten pro Einheit (€)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.5"
                    defaultValue={game.parameters.inventoryCostPerUnit}
                    onBlur={async (e) => {
                      const value = parseFloat(e.target.value);
                      if (value >= 0) {
                        setSettingsLoading(true);
                        try {
                          await updateDoc(doc(db, "games", gameId), {
                            "parameters.inventoryCostPerUnit": value
                          });
                        } catch (err: any) {
                          alert(`Fehler: ${err.message}`);
                        } finally {
                          setSettingsLoading(false);
                        }
                      }
                    }}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-600"
                  />
                  <p className="text-xs text-neutral-600 mt-1">Kosten für unverkaufte Produkte im Lager</p>
                </div>

                {/* Negativzins */}
                <div>
                  <label className="block text-sm font-semibold text-neutral-900 mb-2">
                    💸 Negativzins-Satz (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="0.5"
                    step="0.01"
                    defaultValue={game.parameters.negativeCashInterestRate * 100}
                    onBlur={async (e) => {
                      const value = parseFloat(e.target.value) / 100;
                      if (value >= 0 && value <= 0.5) {
                        setSettingsLoading(true);
                        try {
                          await updateDoc(doc(db, "games", gameId), {
                            "parameters.negativeCashInterestRate": value
                          });
                        } catch (err: any) {
                          alert(`Fehler: ${err.message}`);
                        } finally {
                          setSettingsLoading(false);
                        }
                      }
                    }}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-600"
                  />
                  <p className="text-xs text-neutral-600 mt-1">Zinsen bei negativem Kapital (z.B. 10 = 10%)</p>
                </div>

                {/* Nur vor Spielstart änderbar */}
                {game.status === "lobby" && (
                  <>
                    <div className="border-t border-neutral-200 pt-6">
                      <h3 className="text-sm font-semibold text-neutral-900 mb-4">
                        🔒 Nur vor Spielstart änderbar
                      </h3>
                    </div>

                    {/* Startkapital */}
                    <div>
                      <label className="block text-sm font-semibold text-neutral-900 mb-2">
                        💰 Startkapital (€)
                      </label>
                      <input
                        type="number"
                        min="10000"
                        max="100000"
                        step="1000"
                        defaultValue={game.parameters.startingCapital}
                        onBlur={async (e) => {
                          const value = parseInt(e.target.value);
                          if (value >= 10000) {
                            setSettingsLoading(true);
                            try {
                              // Update game parameters
                              await updateDoc(doc(db, "games", gameId), {
                                "parameters.startingCapital": value
                              });
                              
                              // IMPORTANT: Also update all existing groups that haven't started yet
                              // (i.e., groups with capital still at the old starting value or haven't made decisions)
                              const groupsRef = collection(db, "games", gameId, "groups");
                              const groupsSnapshot = await getDocs(groupsRef);
                              const batch = writeBatch(db);
                              
                              groupsSnapshot.docs.forEach((groupDoc) => {
                                const groupData = groupDoc.data() as GroupState;
                                // Update capital if group hasn't made any decisions yet (status is "waiting" or "ready")
                                if (groupData.status === "waiting" || groupData.status === "ready") {
                                  batch.update(groupDoc.ref, { capital: value });
                                }
                              });
                              
                              await batch.commit();
                            } catch (err: any) {
                              alert(`Fehler: ${err.message}`);
                            } finally {
                              setSettingsLoading(false);
                            }
                          }
                        }}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-600"
                      />
                      <p className="text-xs text-neutral-600 mt-1">Anfangskapital für alle Gruppen</p>
                    </div>

                    {/* Marktkapazität */}
                    <div>
                      <label className="block text-sm font-semibold text-neutral-900 mb-2">
                        📊 Marktkapazität (% der Gesamtproduktion)
                      </label>
                      <input
                        type="number"
                        min="0.1"
                        max="1"
                        step="0.1"
                        defaultValue={game.parameters.initialMarketSaturationFactor}
                        onBlur={async (e) => {
                          const value = parseFloat(e.target.value);
                          if (value >= 0.1 && value <= 1) {
                            setSettingsLoading(true);
                            try {
                              await updateDoc(doc(db, "games", gameId), {
                                "parameters.initialMarketSaturationFactor": value
                              });
                            } catch (err: any) {
                              alert(`Fehler: ${err.message}`);
                            } finally {
                              setSettingsLoading(false);
                            }
                          }
                        }}
                        className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-600"
                      />
                      <p className="text-xs text-neutral-600 mt-1">
                        <strong>Auswirkung:</strong> Der Markt kann maximal diesen Prozentsatz der Gesamtproduktionskapazität aufnehmen. 
                        Beispiel: Bei 4 Gruppen mit je 100 Einheiten Kapazität = 400 Einheiten gesamt. Bei 70% können nur 280 Einheiten verkauft werden 
                        → <strong>zwingender Wettbewerb</strong>. Niedrigere Werte (z.B. 60%) verstärken den Kampf um Marktanteile.
                      </p>
                    </div>

                  </>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowSettingsModal(false)}
                    disabled={settingsLoading}
                    className="flex-1 rounded-lg bg-neutral-600 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700 disabled:bg-neutral-300 disabled:cursor-not-allowed"
                  >
                    {settingsLoading ? "Speichert..." : "✓ Schließen"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        </>
        )}

        {/* Actions for Next Period Modal */}
        {showActionsModalForNextPeriod && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
              <h3 className="mb-4 text-lg font-bold text-neutral-900">⚡ Aktionen für nächste Periode konfigurieren</h3>

              <div className="space-y-4">
                {/* Maschinenkauf */}
                <div className="flex items-start gap-3 border border-neutral-200 rounded-lg p-4">
                  <input
                    type="checkbox"
                    checked={allowMachinePurchaseNext}
                    onChange={(e) => setAllowMachinePurchaseNext(e.target.checked)}
                    className="mt-1 accent-neutral-600"
                  />
                  <div className="flex-1">
                    <label className="text-sm font-semibold text-neutral-900 cursor-pointer">🏭 Maschinenkauf erlauben</label>
                    <p className="text-xs text-neutral-600 mt-1">Gruppen dürfen in der nächsten Periode eine zusätzliche Maschine kaufen</p>
                  </div>
                </div>

                {/* Demand Boost */}
                <div className="flex items-start gap-3 border border-neutral-200 rounded-lg p-4">
                  <input
                    type="checkbox"
                    checked={demandBoostNext}
                    onChange={(e) => setDemandBoostNext(e.target.checked)}
                    className="mt-1 accent-neutral-600"
                  />
                  <div className="flex-1">
                    <label className="text-sm font-semibold text-neutral-900 cursor-pointer">📈 Nachfrage-Boost</label>
                    <p className="text-xs text-neutral-600 mt-1">Erhöht die Marktnachfrage in der nächsten Periode um 30%</p>
                  </div>
                </div>

                {/* Free Market Analysis */}
                <div className="flex items-start gap-3 border border-neutral-200 rounded-lg p-4">
                  <input
                    type="checkbox"
                    checked={freeMarketAnalysisNext}
                    onChange={(e) => setFreeMarketAnalysisNext(e.target.checked)}
                    className="mt-1 accent-neutral-600"
                  />
                  <div className="flex-1">
                    <label className="text-sm font-semibold text-neutral-900 cursor-pointer">📊 Kostenlose Marktanalyse</label>
                    <p className="text-xs text-neutral-600 mt-1">Alle Gruppen erhalten kostenlos Konkurrenz- und Marktdaten</p>
                  </div>
                </div>

                {/* No Inventory Costs */}
                <div className="flex items-start gap-3 border border-neutral-200 rounded-lg p-4">
                  <input
                    type="checkbox"
                    checked={noInventoryCostsNext}
                    onChange={(e) => setNoInventoryCostsNext(e.target.checked)}
                    className="mt-1 accent-neutral-600"
                  />
                  <div className="flex-1">
                    <label className="text-sm font-semibold text-neutral-900 cursor-pointer">📦 Keine Lagerkosten</label>
                    <p className="text-xs text-neutral-600 mt-1">Lagergebühren fallen in dieser Periode nicht an</p>
                  </div>
                </div>

                {/* Allow R&D */}
                <div className="flex items-start gap-3 border border-neutral-200 rounded-lg p-4">
                  <input
                    type="checkbox"
                    checked={allowRnDNext}
                    onChange={(e) => setAllowRnDNext(e.target.checked)}
                    className="mt-1 accent-neutral-600"
                  />
                  <div className="flex-1">
                    <label className="text-sm font-semibold text-neutral-900 cursor-pointer">🔬 F&E aktivieren</label>
                    <p className="text-xs text-neutral-600 mt-1">Gruppen können in F&E investieren</p>
                    {allowRnDNext && (
                      <div className="mt-2">
                        <label className="text-xs font-semibold text-neutral-700">F&E Schwellwert: €{rndThresholdNext.toLocaleString("de-DE")}</label>
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          value={rndThresholdNext}
                          onChange={(e) => setRndThresholdNext(parseInt(e.target.value))}
                          className="w-full mt-1 px-2 py-1 border border-neutral-300 rounded text-sm"
                        />
                        <p className="text-xs text-neutral-600 mt-1">Gruppen erhalten 10% Kostenreduktion wenn F&E-Investition {'>='} Schwellwert</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Custom Event */}
                <div className="border border-neutral-200 rounded-lg p-4">
                  <label className="text-sm font-semibold text-neutral-900 block mb-2">📢 Custom Event Nachricht</label>
                  <textarea
                    value={customEventNext}
                    onChange={(e) => setCustomEventNext(e.target.value)}
                    placeholder="z.B. 'Neue Konkurrenz tritt in den Markt ein' oder leer lassen für kein Event"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-600 text-sm"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 mt-6 border-t">
                <button
                  onClick={() => setShowActionsModalForNextPeriod(false)}
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                >
                  ✓ Speichern & Schließen
                </button>
                <button
                  onClick={() => {
                    setAllowMachinePurchaseNext(false);
                    setDemandBoostNext(false);
                    setFreeMarketAnalysisNext(false);
                    setNoInventoryCostsNext(false);
                    setAllowRnDNext(false);
                    setRndThresholdNext(10000);
                    setCustomEventNext("");
                  }}
                  className="px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100 rounded-lg transition border border-neutral-300"
                >
                  🔄 Zurücksetzen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Group Edit Modal */}
        {showGroupEditModal && editingGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
              <h3 className="mb-4 text-lg font-bold text-neutral-900">
                👥 {editingGroup.name || "Gruppe"} - Verwaltung
              </h3>

              <div className="space-y-6">
                {/* Unternehmenskennzahlen */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-bold text-blue-900 mb-3">📊 Unternehmenskennzahlen</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-neutral-600">Kapital</p>
                      <p className="font-bold text-neutral-900">€ {editingGroup.capital?.toLocaleString("de-DE") || 0}</p>
                    </div>
                    <div>
                      <p className="text-neutral-600">Gewinn (kumulativ)</p>
                      <p className="font-bold text-neutral-900">€ {editingGroup.cumulativeProfit?.toLocaleString("de-DE") || 0}</p>
                    </div>
                    <div>
                      <p className="text-neutral-600">Lager</p>
                      <p className="font-bold text-neutral-900">{editingGroup.inventory || 0} E.</p>
                    </div>
                    <div>
                      <p className="text-neutral-600">Maschinen</p>
                      <p className="font-bold text-neutral-900">{editingGroup.machines?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-neutral-600">R&D Investition</p>
                      <p className="font-bold text-neutral-900">€ {editingGroup.cumulativeRndInvestment?.toLocaleString("de-DE") || 0}</p>
                    </div>
                    <div>
                      <p className="text-neutral-600">R&D Vorteil</p>
                      <p className="font-bold text-neutral-900">{editingGroup.rndBenefitApplied ? "✓ Aktiv" : "✗ Inaktiv"}</p>
                    </div>
                  </div>

                  {/* Machines List */}
                  {editingGroup.machines && editingGroup.machines.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-blue-200">
                      <p className="text-xs font-semibold text-blue-900 mb-2">🔧 Maschinen:</p>
                      <div className="space-y-1">
                        {editingGroup.machines.map((machine, idx) => (
                          <div key={idx} className="text-xs text-neutral-700">
                            • <strong>{machine.name}</strong> - Kapazität: {machine.capacity} E., Kosten: €{machine.cost}, Variable Kosten: €{machine.variableCostPerUnit}/E.
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Rename Group */}
                <div className="border-t border-neutral-200 pt-4">
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">
                    📝 Gruppenname ändern
                  </label>
                  <input
                    type="text"
                    value={editGroupName}
                    onChange={(e) => setEditGroupName(e.target.value)}
                    placeholder="z.B. Team A, Gruppe 1"
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-600"
                  />
                  <button
                    onClick={async () => {
                      if (!editingGroup || !editGroupName.trim()) return;
                      setEditLoading(true);
                      try {
                        await updateDoc(doc(db, "games", gameId, "groups", editingGroup.id), {
                          name: editGroupName.trim()
                        });
                        setShowGroupEditModal(false);
                      } catch (err: any) {
                        alert(`Fehler beim Speichern: ${err.message}`);
                      } finally {
                        setEditLoading(false);
                      }
                    }}
                    disabled={editLoading || !editGroupName.trim()}
                    className="mt-2 w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-neutral-300 disabled:cursor-not-allowed"
                  >
                    {editLoading ? "Speichert..." : "✓ Speichern"}
                  </button>
                </div>

                {/* Delete Group */}
                <div className="border-t border-neutral-200 pt-4">
                  <p className="text-sm text-neutral-600 mb-3">
                    ⚠️ <strong>Warnung:</strong> Die Gruppe wird aus dem Spiel entfernt und kann nicht wiederhergestellt werden.
                  </p>
                  <button
                    onClick={async () => {
                      if (!editingGroup || !window.confirm(`Gruppe "${editingGroup.name}" wirklich aus dem Spiel entfernen?`)) return;
                      setEditLoading(true);
                      try {
                        // Delete group from database
                        await deleteDoc(doc(db, "games", gameId, "groups", editingGroup.id));
                        setShowGroupEditModal(false);
                      } catch (err: any) {
                        alert(`Fehler beim Löschen: ${err.message}`);
                      } finally {
                        setEditLoading(false);
                      }
                    }}
                    disabled={editLoading}
                    className="w-full rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-neutral-300 disabled:cursor-not-allowed"
                  >
                    {editLoading ? "Wird entfernt..." : "🗑️ Aus Spiel entfernen"}
                  </button>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setShowGroupEditModal(false)}
                  disabled={editLoading}
                  className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
                >
                  Schließen
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}