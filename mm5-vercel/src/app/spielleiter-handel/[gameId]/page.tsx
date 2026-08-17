"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { db } from "@/lib/firebase";
import { doc, collection, onSnapshot, updateDoc, writeBatch, getDocs, deleteDoc } from "firebase/firestore";
import { checkPinFromLocalStorage } from "@/lib/auth";
import type { GameDocumentHandel, GroupStateHandel, PeriodActionsHandel, PeriodDecisionHandel } from "@/lib/types-handel";
import { emptyTierRecord, TIER_IDS } from "@/lib/types-handel";
import { calculateMarketHandel, type MarketCalculationInputHandel } from "@/lib/gameLogic-handel";
import { SpielleiterDashboardHandel } from "@/components/SpielleiterDashboardHandel";

export default function GameDashboardHandelPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.gameId as string;

  const [game, setGame] = useState<GameDocumentHandel | null>(null);
  const [groups, setGroups] = useState<GroupStateHandel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isPinValid, setIsPinValid] = useState(false);
  const [startLoading, setStartLoading] = useState(false);
  const [startError, setStartError] = useState("");
  const [showAdminPin, setShowAdminPin] = useState(false);

  const [showRankingModal, setShowRankingModal] = useState(false);
  const [showConfirmEndModal, setShowConfirmEndModal] = useState(false);
  const [endGameLoading, setEndGameLoading] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [showActionsModal, setShowActionsModal] = useState(false);
  const [actionsSaveLoading, setActionsSaveLoading] = useState(false);
  const [showGroupEditModal, setShowGroupEditModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupStateHandel | null>(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const [demandBoostNext, setDemandBoostNext] = useState(false);
  const [freeMarketAnalysisNext, setFreeMarketAnalysisNext] = useState(false);
  const [noInventoryCostsNext, setNoInventoryCostsNext] = useState(false);
  const [allowNegotiationNext, setAllowNegotiationNext] = useState(false);
  const [negotiationThresholdNext, setNegotiationThresholdNext] = useState(2000);
  const [customEventNext, setCustomEventNext] = useState("");

  const allGroupsSubmitted = groups.length > 0 && groups.every((g) => g.status === "submitted");
  const lobbyStartDisabled = game?.status !== "lobby" || groups.length === 0 || startLoading;

  const getRanking = () =>
    [...groups]
      .map((g) => ({ name: g.name, capital: g.capital, profit: g.cumulativeProfit || 0 }))
      .sort((a, b) => b.profit - a.profit);

  useEffect(() => {
    if (!gameId) return;

    const pinValid = checkPinFromLocalStorage(gameId, "");
    if (!pinValid) {
      router.push("/spielleiter-handel");
      return;
    }
    setIsPinValid(true);

    const unsubscribeGame = onSnapshot(
      doc(db, "games_handel", gameId),
      (docSnap) => {
        if (docSnap.exists()) {
          const next = docSnap.data() as GameDocumentHandel;
          setGame(next);
          setDemandBoostNext(!!next.parameters?.demandBoostNextPeriod);
          setFreeMarketAnalysisNext(!!next.parameters?.freeMarketAnalysisNextPeriod);
          setNoInventoryCostsNext(!!next.parameters?.noInventoryCostsNextPeriod);
          setAllowNegotiationNext(!!next.parameters?.allowNegotiationNextPeriod);
          setNegotiationThresholdNext(
            next.parameters?.negotiationThresholdNextPeriod || next.parameters?.purchaseNegotiationThreshold || 2000
          );
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

    const unsubscribeGroups = onSnapshot(
      collection(db, "games_handel", gameId, "groups"),
      (snapshot) => {
        setGroups(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as GroupStateHandel)));
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

  const handleStartPeriod = async () => {
    if (!game) return;
    setStartLoading(true);
    setStartError("");
    try {
      const endsAt = Date.now() + (game.parameters?.periodDurationMinutes || 10) * 60 * 1000;
      const batch = writeBatch(db);

      if (game.phase === "decisions") {
        if (!allGroupsSubmitted) throw new Error("Nicht alle Gruppen haben ihre Entscheidung abgegeben!");

        const decisionsSnapshot = await getDocs(collection(db, "games_handel", gameId, "decisions"));
        const decisions: { [groupId: string]: PeriodDecisionHandel } = {};
        decisionsSnapshot.forEach((d) => {
          decisions[d.id] = d.data() as PeriodDecisionHandel;
        });

        const inputs: MarketCalculationInputHandel[] = groups.map((group) => ({
          groupId: group.id,
          decision: decisions[group.id],
          groupState: group,
        }));

        const results = calculateMarketHandel(game.parameters, game.qualityTiers, game.period, inputs, game.activePeriodActions);

        results.forEach((result) => {
          batch.update(doc(db, "games_handel", gameId, "groups", result.groupId), {
            capital: result.newCapital,
            inventory: result.newInventory,
            cumulativeProfit: result.newCumulativeProfit,
            cumulativeNegotiationInvestment: result.newCumulativeNegotiationInvestment,
            negotiationBenefitApplied: result.newNegotiationBenefitApplied,
            status: "calculated",
            lastResult: result.result,
          });
        });

        batch.update(doc(db, "games_handel", gameId), {
          phase: "results",
          phaseEndsAt: null,
          periodDeadline: null,
        });
      } else if (game.phase === "results") {
        const actionsForNextPeriod: PeriodActionsHandel = {
          period: game.period + 1,
          demandBoost: demandBoostNext,
          freeMarketAnalysis: freeMarketAnalysisNext,
          noInventoryCosts: noInventoryCostsNext,
          allowNegotiation: allowNegotiationNext,
          negotiationThreshold: negotiationThresholdNext,
          customEvent: customEventNext.trim(),
        };

        batch.update(doc(db, "games_handel", gameId), {
          period: game.period + 1,
          phase: "decisions",
          phaseEndsAt: endsAt,
          periodDeadline: endsAt,
          activePeriodActions: actionsForNextPeriod,
          "parameters.demandBoostNextPeriod": false,
          "parameters.freeMarketAnalysisNextPeriod": false,
          "parameters.noInventoryCostsNextPeriod": false,
          "parameters.allowNegotiationNextPeriod": false,
          "parameters.customEventNextPeriod": "",
        });
        groups.forEach((g) => {
          batch.update(doc(db, "games_handel", gameId, "groups", g.id), { status: "waiting" });
        });
        setDemandBoostNext(false);
        setFreeMarketAnalysisNext(false);
        setNoInventoryCostsNext(false);
        setAllowNegotiationNext(false);
        setCustomEventNext("");
      }

      await batch.commit();
    } catch (err: any) {
      console.error("Error in period progression:", err);
      setStartError(`Fehler: ${err.message}`);
    } finally {
      setStartLoading(false);
    }
  };

  const handleStartGame = async () => {
    if (!game) return;
    setStartLoading(true);
    setStartError("");
    try {
      const endsAt = Date.now() + (game.parameters?.periodDurationMinutes || 10) * 60 * 1000;
      const batch = writeBatch(db);
      batch.update(doc(db, "games_handel", gameId), {
        status: "in_progress",
        period: 1,
        phase: "decisions",
        phaseEndsAt: endsAt,
        periodDeadline: endsAt,
      });
      groups.forEach((g) => {
        batch.update(doc(db, "games_handel", gameId, "groups", g.id), { status: "waiting" });
      });
      await batch.commit();
    } catch (err: any) {
      console.error("Error starting game:", err);
      setStartError(`Fehler beim Starten: ${err.message}`);
    } finally {
      setStartLoading(false);
    }
  };

  if (!isPinValid) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-neutral-100 via-neutral-100 to-neutral-200 px-4 py-10">
        <section className="mx-auto max-w-2xl text-center text-neutral-600">Authentifizierung erforderlich...</section>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-neutral-100 via-neutral-100 to-neutral-200 px-4 py-10">
        <section className="mx-auto max-w-2xl text-center text-neutral-600">Spiel wird geladen...</section>
      </main>
    );
  }

  if (error || !game) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-neutral-100 via-neutral-100 to-neutral-200 px-4 py-10">
        <section className="mx-auto max-w-2xl">
          <div className="rounded-xl bg-red-50 p-4 text-red-700">{error || "Spiel nicht gefunden"}</div>
          <Link href="/spielleiter-handel" className="mt-4 inline-block text-neutral-700 hover:underline">
            ← Zurück zur Startseite
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-neutral-100 via-neutral-100 to-neutral-200 px-3 py-5 sm:px-4 sm:py-8">
      <section className="mx-auto max-w-2xl flex flex-col gap-4">
        {/* Spiel beendet */}
        {game.status === "finished" && (
          <>
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-800">Spiel beendet!</h1>
            <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-5 sm:p-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl sm:text-3xl font-bold text-emerald-900 mb-2">Handelsplanspiel abgeschlossen</h2>
                <p className="text-emerald-800">Periode {game.period} erfolgreich abgeschlossen.</p>
              </div>

              <div className="bg-white rounded-xl p-4 sm:p-6 border border-emerald-200 mb-6">
                <h3 className="text-lg font-bold text-neutral-900 mb-4 text-center">Abschlussranking</h3>
                <div className="flex flex-col gap-2">
                  {getRanking().map((team, idx) => (
                    <div
                      key={team.name}
                      className={`flex items-center justify-between rounded-xl p-3 sm:p-4 border-2 ${
                        idx === 0 ? "border-amber-400 bg-amber-50" : "border-neutral-200 bg-neutral-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl font-bold w-6 text-center">
                          {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}.`}
                        </span>
                        <span className="font-semibold text-neutral-900">{team.name}</span>
                      </div>
                      <span className="text-lg font-bold text-neutral-900">
                        €{team.profit.toLocaleString("de-DE")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/spielleiter-handel"
                  className="rounded-xl bg-neutral-700 px-6 py-3 text-center font-semibold text-white hover:bg-neutral-800 transition"
                >
                  ← Zurück zur Übersicht
                </Link>
                <button
                  onClick={async () => {
                    if (!confirm("Spiel wirklich zurücksetzen und neu starten?")) return;
                    setStartLoading(true);
                    try {
                      const batch = writeBatch(db);
                      batch.update(doc(db, "games_handel", gameId), {
                        status: "lobby",
                        period: 0,
                        phase: "decisions",
                        phaseEndsAt: null,
                        periodDeadline: null,
                      });
                      groups.forEach((g) => {
                        batch.update(doc(db, "games_handel", gameId, "groups", g.id), {
                          status: "waiting",
                          capital: game.parameters.startingCapital,
                          inventory: emptyTierRecord(),
                          cumulativeProfit: 0,
                          cumulativeNegotiationInvestment: 0,
                          negotiationBenefitApplied: false,
                          lastResult: null,
                        });
                      });
                      await batch.commit();
                      alert("Spiel wurde zurückgesetzt!");
                    } catch (err: any) {
                      alert(`Fehler: ${err.message}`);
                    } finally {
                      setStartLoading(false);
                    }
                  }}
                  disabled={startLoading}
                  className="rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-60"
                >
                  Spiel neu starten
                </button>
              </div>
            </div>
          </>
        )}

        {/* Laufendes Spiel */}
        {game.status !== "finished" && (
          <>
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-800">
              {game.status === "lobby" ? "Lobby" : "Spiel-Dashboard"}
            </h1>

            {game.status === "lobby" && (
              <div className="rounded-2xl bg-white p-4 sm:p-5 border-2 border-neutral-300">
                <h2 className="text-lg font-bold text-neutral-900 mb-3">Lobby-Verbindung</h2>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="bg-white p-2 rounded-xl border-2 border-neutral-300 flex-none self-center sm:self-start">
                    <QRCodeSVG
                      value={`${typeof window !== "undefined" ? window.location.origin : "https://marktmatch5.vercel.app"}/gruppe-handel/${gameId}?pin=${game.joinPin}`}
                      size={120}
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-neutral-600 mb-1">Gruppen-PIN</p>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-2xl font-bold text-neutral-800 bg-neutral-50 px-4 py-2 rounded-xl border border-neutral-300">
                        {game.joinPin}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(game.joinPin);
                        }}
                        className="rounded-lg bg-neutral-700 px-3 py-2 text-xs font-semibold text-white hover:bg-neutral-800"
                      >
                        Kopieren
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        const link = `${window.location.origin}/gruppe-handel/${gameId}?pin=${game.joinPin}`;
                        navigator.clipboard.writeText(link);
                      }}
                      className="mt-2 rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold text-neutral-700 hover:border-neutral-500 hover:bg-neutral-50 transition"
                    >
                      Link kopieren (zum Teilen)
                    </button>
                    <p className="text-xs text-neutral-500 mt-2">Gruppen scannen den QR-Code, öffnen den Link oder geben die PIN ein.</p>
                  </div>
                  <div className="flex-1">
                    <button
                      onClick={() => setShowAdminPin((v) => !v)}
                      className="text-xs font-semibold text-neutral-600 hover:text-neutral-900"
                    >
                      {showAdminPin ? "▼" : "▶"} Admin-PIN anzeigen
                    </button>
                    {showAdminPin && (
                      <p className="font-mono text-lg font-bold text-red-700 mt-1">{game.adminPin}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {game.status === "lobby" && (
              <div className="rounded-2xl bg-white p-4 sm:p-5 border border-neutral-200">
                <h2 className="text-base font-bold text-neutral-900 mb-3">
                  Wartende Gruppen ({groups.length})
                </h2>
                <div className="flex flex-col gap-2 mb-4">
                  {groups.length > 0 ? (
                    groups.map((group) => (
                      <div
                        key={group.id}
                        className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2"
                      >
                        <span className="font-semibold text-sm text-neutral-900">{group.name}</span>
                        <button
                          onClick={() => {
                            setEditingGroup(group);
                            setEditGroupName(group.name || "");
                            setShowGroupEditModal(true);
                          }}
                          className="rounded-lg bg-neutral-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800"
                        >
                          Bearbeiten
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-neutral-500 text-center py-4">
                      Noch keine Gruppen beigetreten. Teile den Gruppen-PIN!
                    </p>
                  )}
                </div>

                {startError && (
                  <div className="mb-3 rounded-lg bg-red-50 p-2 text-xs text-red-700">{startError}</div>
                )}

                <button
                  disabled={lobbyStartDisabled}
                  onClick={handleStartGame}
                  className={`w-full rounded-xl py-3.5 font-bold text-white transition ${
                    lobbyStartDisabled ? "bg-neutral-300 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700"
                  }`}
                >
                  {startLoading ? "Startet..." : "Spiel starten"}
                </button>
              </div>
            )}

            {game.status === "in_progress" && (
              <>
                {startError && (
                  <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{startError}</div>
                )}
                <SpielleiterDashboardHandel
                  game={game}
                  groups={groups}
                  tierDefinitions={game.qualityTiers}
                  onStartPeriod={handleStartPeriod}
                  onEditGroup={(group) => {
                    setEditingGroup(group);
                    setEditGroupName(group.name || "");
                    setShowGroupEditModal(true);
                  }}
                  onShowSettings={() => setShowSettingsModal(true)}
                  onShowRanking={() => setShowRankingModal(true)}
                  onShowActions={() => setShowActionsModal(true)}
                  onEndGame={() => setShowConfirmEndModal(true)}
                  startLoading={startLoading}
                />
              </>
            )}

            <Link href="/spielleiter-handel" className="text-sm font-semibold text-neutral-700 hover:underline text-center">
              ← Zur Spielleiter-Startseite
            </Link>
          </>
        )}

        {/* Ranking Modal */}
        {showRankingModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl">
              <div className="sticky top-0 border-b border-neutral-200 bg-white px-5 py-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-neutral-900">Ranking - Periode {game.period}</h2>
                <button onClick={() => setShowRankingModal(false)} className="text-neutral-500 hover:text-neutral-700">
                  ✕
                </button>
              </div>
              <div className="p-4 sm:p-5 flex flex-col gap-2">
                {getRanking().map((team, idx) => (
                  <div
                    key={team.name}
                    className={`flex items-center justify-between rounded-xl p-3 border-2 ${
                      idx === 0 ? "border-amber-400 bg-amber-50" : "border-neutral-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-bold">
                        {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}.`}
                      </span>
                      <span className="font-semibold text-neutral-900">{team.name}</span>
                    </div>
                    <span className="font-bold text-neutral-900">€{team.capital.toLocaleString("de-DE")}</span>
                  </div>
                ))}
                <button
                  onClick={() => setShowRankingModal(false)}
                  className="mt-2 rounded-lg border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                >
                  Schließen
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Confirm End Modal */}
        {showConfirmEndModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-xl bg-white shadow-xl p-5">
              <h2 className="text-lg font-semibold text-neutral-900 mb-3">Spiel wirklich beenden?</h2>
              <p className="text-sm text-neutral-700 mb-4">
                Gruppen können sich danach nicht mehr anmelden, das Ranking wird als Abschlussstand gespeichert.
              </p>
              <div className="flex gap-3">
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
                      await updateDoc(doc(db, "games_handel", gameId), { status: "finished" });
                      setShowConfirmEndModal(false);
                    } catch (err: any) {
                      setStartError(`Fehler beim Beenden: ${err.message}`);
                    } finally {
                      setEndGameLoading(false);
                    }
                  }}
                  disabled={endGameLoading}
                  className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-neutral-300"
                >
                  {endGameLoading ? "Wird beendet..." : "Ja, beenden"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settings Modal */}
        {showSettingsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl">
              <div className="sticky top-0 border-b border-neutral-200 bg-white px-5 py-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-neutral-900">Spieleinstellungen</h2>
                <button onClick={() => setShowSettingsModal(false)} className="text-neutral-500 hover:text-neutral-700">
                  ✕
                </button>
              </div>
              <div className="p-4 sm:p-5 flex flex-col gap-4">
                {[
                  { key: "periodDurationMinutes", label: "Periodendauer (Minuten)", step: 1, parse: parseInt },
                  { key: "marketAnalysisCost", label: "Marktanalyse-Kosten (€)", step: 100, parse: parseInt },
                  { key: "inventoryCostPerUnit", label: "Lagerkosten pro Einheit (€)", step: 0.5, parse: parseFloat },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="block text-sm font-semibold text-neutral-900 mb-1">{f.label}</label>
                    <input
                      type="number"
                      step={f.step}
                      defaultValue={(game.parameters as any)[f.key]}
                      onBlur={async (e) => {
                        const value = f.parse(e.target.value);
                        if (isNaN(value) || value < 0) return;
                        setSettingsLoading(true);
                        try {
                          await updateDoc(doc(db, "games_handel", gameId), { [`parameters.${f.key}`]: value });
                        } finally {
                          setSettingsLoading(false);
                        }
                      }}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-500"
                    />
                  </div>
                ))}

                {game.status === "lobby" && (
                  <div>
                    <label className="block text-sm font-semibold text-neutral-900 mb-1">Startkapital (€)</label>
                    <input
                      type="number"
                      step={1000}
                      defaultValue={game.parameters.startingCapital}
                      onBlur={async (e) => {
                        const value = parseInt(e.target.value);
                        if (isNaN(value) || value < 0) return;
                        setSettingsLoading(true);
                        try {
                          const batch = writeBatch(db);
                          batch.update(doc(db, "games_handel", gameId), { "parameters.startingCapital": value });
                          groups.forEach((g) => {
                            if (g.status === "waiting") batch.update(doc(db, "games_handel", gameId, "groups", g.id), { capital: value });
                          });
                          await batch.commit();
                        } finally {
                          setSettingsLoading(false);
                        }
                      }}
                      className="w-full px-3 py-2 border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-500"
                    />
                  </div>
                )}

                <button
                  onClick={() => setShowSettingsModal(false)}
                  disabled={settingsLoading}
                  className="mt-2 rounded-lg bg-neutral-700 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-60"
                >
                  {settingsLoading ? "Speichert..." : "Schließen"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Actions Modal */}
        {showActionsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl p-5">
              <h3 className="mb-4 text-lg font-bold text-neutral-900">Ereignisse für nächste Periode</h3>
              <div className="flex flex-col gap-3">
                <label className="flex items-start gap-3 border border-neutral-200 rounded-xl p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={demandBoostNext}
                    onChange={(e) => setDemandBoostNext(e.target.checked)}
                    className="mt-1 accent-emerald-600"
                  />
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">Nachfrage-Boost</p>
                    <p className="text-xs text-neutral-600">Erhöht die Marktnachfrage um 30%.</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 border border-neutral-200 rounded-xl p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={freeMarketAnalysisNext}
                    onChange={(e) => setFreeMarketAnalysisNext(e.target.checked)}
                    className="mt-1 accent-emerald-600"
                  />
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">Kostenlose Marktanalyse</p>
                    <p className="text-xs text-neutral-600">Alle Gruppen erhalten kostenlos Marktdaten.</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 border border-neutral-200 rounded-xl p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={noInventoryCostsNext}
                    onChange={(e) => setNoInventoryCostsNext(e.target.checked)}
                    className="mt-1 accent-emerald-600"
                  />
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">Keine Lagerkosten</p>
                    <p className="text-xs text-neutral-600">Lagergebühren fallen in dieser Periode nicht an.</p>
                  </div>
                </label>
                <label className="flex items-start gap-3 border border-neutral-200 rounded-xl p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowNegotiationNext}
                    onChange={(e) => setAllowNegotiationNext(e.target.checked)}
                    className="mt-1 accent-emerald-600"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-neutral-900">Einkaufsverhandlung aktivieren</p>
                    <p className="text-xs text-neutral-600">Gruppen können Rabatte beim Großhändler verhandeln.</p>
                    {allowNegotiationNext && (
                      <input
                        type="number"
                        step={500}
                        value={negotiationThresholdNext}
                        onChange={(e) => setNegotiationThresholdNext(parseInt(e.target.value) || 0)}
                        className="mt-2 w-full px-2 py-1 border border-neutral-300 rounded text-sm"
                      />
                    )}
                  </div>
                </label>
                <div className="border border-neutral-200 rounded-xl p-3">
                  <label className="block text-sm font-semibold text-neutral-900 mb-1">Sonderereignis (Text)</label>
                  <textarea
                    value={customEventNext}
                    onChange={(e) => setCustomEventNext(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm"
                    placeholder="z.B. 'Neuer Großhändler tritt in den Markt ein'"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4 mt-4 border-t border-neutral-200">
                <button
                  onClick={async () => {
                    setActionsSaveLoading(true);
                    try {
                      await updateDoc(doc(db, "games_handel", gameId), {
                        "parameters.demandBoostNextPeriod": demandBoostNext,
                        "parameters.freeMarketAnalysisNextPeriod": freeMarketAnalysisNext,
                        "parameters.noInventoryCostsNextPeriod": noInventoryCostsNext,
                        "parameters.allowNegotiationNextPeriod": allowNegotiationNext,
                        "parameters.negotiationThresholdNextPeriod": negotiationThresholdNext,
                        "parameters.customEventNextPeriod": customEventNext.trim(),
                      });
                      setShowActionsModal(false);
                    } finally {
                      setActionsSaveLoading(false);
                    }
                  }}
                  disabled={actionsSaveLoading}
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {actionsSaveLoading ? "Speichert..." : "Speichern & Schließen"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Group Edit Modal */}
        {showGroupEditModal && editingGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white shadow-xl p-5">
              <h3 className="mb-4 text-lg font-bold text-neutral-900">{editingGroup.name || "Gruppe"} - Verwaltung</h3>

              <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 mb-4">
                <h4 className="text-sm font-bold text-sky-900 mb-3">Unternehmenskennzahlen</h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-neutral-600">Kapital</p>
                    <p className="font-bold text-neutral-900">€{editingGroup.capital?.toLocaleString("de-DE") || 0}</p>
                  </div>
                  <div>
                    <p className="text-neutral-600">Gewinn (kumulativ)</p>
                    <p className="font-bold text-neutral-900">
                      €{editingGroup.cumulativeProfit?.toLocaleString("de-DE") || 0}
                    </p>
                  </div>
                  {TIER_IDS.map((tier) => (
                    <div key={tier}>
                      <p className="text-neutral-600">Lager ({tier})</p>
                      <p className="font-bold text-neutral-900">{editingGroup.inventory?.[tier] || 0} Stk.</p>
                    </div>
                  ))}
                  <div>
                    <p className="text-neutral-600">Einkaufsverhandlung</p>
                    <p className="font-bold text-neutral-900">
                      {editingGroup.negotiationBenefitApplied ? "Aktiv" : "Inaktiv"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-neutral-200 pt-4 mb-4">
                <label className="block text-sm font-semibold text-neutral-700 mb-2">Gruppenname ändern</label>
                <input
                  type="text"
                  value={editGroupName}
                  onChange={(e) => setEditGroupName(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
                />
                <button
                  onClick={async () => {
                    if (!editingGroup || !editGroupName.trim()) return;
                    setEditLoading(true);
                    try {
                      await updateDoc(doc(db, "games_handel", gameId, "groups", editingGroup.id), {
                        name: editGroupName.trim(),
                      });
                      setShowGroupEditModal(false);
                    } finally {
                      setEditLoading(false);
                    }
                  }}
                  disabled={editLoading || !editGroupName.trim()}
                  className="mt-2 w-full rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:bg-neutral-300"
                >
                  {editLoading ? "Speichert..." : "Speichern"}
                </button>
              </div>

              <div className="border-t border-neutral-200 pt-4 mb-4">
                <button
                  onClick={async () => {
                    if (!editingGroup || !window.confirm(`Gruppe "${editingGroup.name}" wirklich entfernen?`)) return;
                    setEditLoading(true);
                    try {
                      await deleteDoc(doc(db, "games_handel", gameId, "groups", editingGroup.id));
                      setShowGroupEditModal(false);
                    } finally {
                      setEditLoading(false);
                    }
                  }}
                  disabled={editLoading}
                  className="w-full rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:bg-neutral-300"
                >
                  {editLoading ? "Wird entfernt..." : "Aus Spiel entfernen"}
                </button>
              </div>

              <button
                onClick={() => setShowGroupEditModal(false)}
                disabled={editLoading}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Schließen
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
