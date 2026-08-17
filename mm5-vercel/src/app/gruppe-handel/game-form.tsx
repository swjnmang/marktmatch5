"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, addDoc, serverTimestamp, updateDoc, onSnapshot, setDoc } from "firebase/firestore";
import type {
  GameDocumentHandel,
  GroupStateHandel,
  PeriodDecisionHandel,
  QualityTierDefinition,
  TierId,
  TierRecord,
} from "@/lib/types-handel";
import { TIER_IDS, emptyTierRecord } from "@/lib/types-handel";
import { validateDecisionHandel, effectivePurchaseUnitPrice } from "@/lib/gameLogic-handel";
import { PeriodTimer } from "@/components/PeriodTimer";
import { saveSession, updateSessionActivity, getSession, isDeviceAuthorized } from "@/lib/session-utils";

export function GruppeGameFormHandel({ prefilledPin = "" }: { prefilledPin?: string }) {
  const params = useParams();
  const gameId = params.gameId as string;

  const [game, setGame] = useState<GameDocumentHandel | null>(null);
  const [groups, setGroups] = useState<GroupStateHandel[]>([]);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [groupData, setGroupData] = useState<GroupStateHandel | null>(null);
  const [joined, setJoined] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [acknowledging, setAcknowledging] = useState(false);

  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [buyingTier, setBuyingTier] = useState<TierId | null>(null);

  const [purchaseInputs, setPurchaseInputs] = useState<TierRecord>(emptyTierRecord());
  const [sellFromInventoryByTier, setSellFromInventoryByTier] = useState<TierRecord>(emptyTierRecord());
  const [pricesByTier, setPricesByTier] = useState<TierRecord>(emptyTierRecord());
  const [marketingEffort, setMarketingEffort] = useState(0);
  const [buyMarketAnalysis, setBuyMarketAnalysis] = useState(false);
  const [negotiationInvestment, setNegotiationInvestment] = useState(0);

  // Session-Resume: auf demselben Gerät automatisch wieder anmelden
  useEffect(() => {
    const session = getSession(gameId);
    if (session && isDeviceAuthorized(gameId)) {
      (async () => {
        try {
          const groupDoc = await getDoc(doc(db, "games_handel", gameId, "groups", session.groupId));
          if (groupDoc.exists()) {
            setGroupId(session.groupId);
            setGroupData({ id: groupDoc.id, ...groupDoc.data() } as GroupStateHandel);
            setJoined(true);
            updateSessionActivity(gameId);
          }
        } finally {
          setCheckingSession(false);
        }
      })();
    } else {
      setCheckingSession(false);
    }
  }, [gameId]);

  useEffect(() => {
    if (!gameId) return;
    const unsubGame = onSnapshot(doc(db, "games_handel", gameId), (snap) => {
      if (snap.exists()) setGame(snap.data() as GameDocumentHandel);
    });
    const unsubGroups = onSnapshot(collection(db, "games_handel", gameId, "groups"), (snap) => {
      setGroups(snap.docs.map((d) => ({ id: d.id, ...d.data() } as GroupStateHandel)));
    });
    return () => {
      unsubGame();
      unsubGroups();
    };
  }, [gameId]);

  // Eigene Gruppendaten live aktuell halten
  useEffect(() => {
    if (!groupId) return;
    const g = groups.find((x) => x.id === groupId);
    if (g) setGroupData(g);
  }, [groups, groupId]);

  // Keep-alive
  useEffect(() => {
    if (!joined || !gameId) return;
    updateSessionActivity(gameId);
    const interval = setInterval(() => updateSessionActivity(gameId), 30000);
    return () => clearInterval(interval);
  }, [joined, gameId]);

  // Formular für jede neue Periode zurücksetzen
  useEffect(() => {
    setPurchaseInputs(emptyTierRecord());
    setSellFromInventoryByTier(emptyTierRecord());
    setPricesByTier(emptyTierRecord());
    setMarketingEffort(0);
    setBuyMarketAnalysis(false);
    setNegotiationInvestment(0);
  }, [game?.period]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) {
      setError("Bitte gib einen Gruppennamen ein.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const gameDoc = await getDoc(doc(db, "games_handel", gameId));
      if (!gameDoc.exists()) throw new Error("Spiel nicht gefunden");
      const gameData = gameDoc.data() as GameDocumentHandel;

      const newGroup: Omit<GroupStateHandel, "id"> = {
        name: groupName.trim(),
        capital: gameData.parameters.startingCapital,
        inventory: emptyTierRecord(),
        currentPeriodPurchases: emptyTierRecord(),
        currentPeriodPurchaseCosts: emptyTierRecord(),
        cumulativeProfit: 0,
        cumulativeNegotiationInvestment: 0,
        negotiationBenefitApplied: false,
        status: "waiting",
        lastActivityTime: Date.now(),
        instructionsAcknowledged: false,
      };
      const docRef = await addDoc(collection(db, "games_handel", gameId, "groups"), newGroup);
      saveSession(docRef.id, gameId);
      setGroupId(docRef.id);
      setGroupData({ id: docRef.id, ...newGroup });
      setJoined(true);
    } catch (err: any) {
      setError(`Fehler: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledgeInstructions = async () => {
    if (!groupId) return;
    setAcknowledging(true);
    try {
      await updateDoc(doc(db, "games_handel", gameId, "groups", groupId), {
        instructionsAcknowledged: true,
      });
    } finally {
      setAcknowledging(false);
    }
  };

  const handleBuyTier = async (tier: QualityTierDefinition) => {
    if (!groupId || !groupData || !game) return;
    const qty = purchaseInputs[tier.id] || 0;
    if (qty <= 0) {
      setError("Bitte gebt zuerst eine Menge größer als 0 ein.");
      return;
    }
    setBuyingTier(tier.id);
    setError("");
    try {
      const unitPrice = effectivePurchaseUnitPrice(tier, qty, groupData.negotiationBenefitApplied, game.parameters);
      const cost = Math.round(qty * unitPrice * 100) / 100;
      await updateDoc(doc(db, "games_handel", gameId, "groups", groupId), {
        capital: groupData.capital - cost,
        [`currentPeriodPurchases.${tier.id}`]: qty,
        [`currentPeriodPurchaseCosts.${tier.id}`]: cost,
        lastActivityTime: Date.now(),
      });
      updateSessionActivity(gameId);
    } catch (err: any) {
      setError(`Fehler beim Einkaufen: ${err.message}`);
    } finally {
      setBuyingTier(null);
    }
  };

  const handleUndoTier = async (tierId: TierId) => {
    if (!groupId || !groupData) return;
    setBuyingTier(tierId);
    setError("");
    try {
      const refund = groupData.currentPeriodPurchaseCosts[tierId] || 0;
      await updateDoc(doc(db, "games_handel", gameId, "groups", groupId), {
        capital: groupData.capital + refund,
        [`currentPeriodPurchases.${tierId}`]: 0,
        [`currentPeriodPurchaseCosts.${tierId}`]: 0,
      });
    } catch (err: any) {
      setError(`Fehler beim Zurücknehmen: ${err.message}`);
    } finally {
      setBuyingTier(null);
    }
  };

  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !groupData || !game) return;
    setDecisionLoading(true);
    setError("");
    try {
      const decision: PeriodDecisionHandel = {
        groupId,
        period: game.period,
        sellFromInventoryByTier,
        pricesByTier,
        marketingEffort: game.period >= 5 ? marketingEffort : 0,
        buyMarketAnalysis,
        negotiationInvestment,
        submittedAt: serverTimestamp() as any,
      };

      const validation = validateDecisionHandel(decision, groupData, game.qualityTiers, game.parameters, game.period);
      if (!validation.valid) throw new Error(validation.errors.join(" "));

      await setDoc(doc(db, "games_handel", gameId, "decisions", groupId), decision);
      await updateDoc(doc(db, "games_handel", gameId, "groups", groupId), {
        status: "submitted",
        lastActivityTime: Date.now(),
      });
      updateSessionActivity(gameId);
    } catch (err: any) {
      setError(`Fehler beim Einreichen: ${err.message}`);
    } finally {
      setDecisionLoading(false);
    }
  };

  const shell = "min-h-screen bg-gradient-to-br from-neutral-100 via-neutral-100 to-neutral-200 px-3 py-6 sm:px-4 sm:py-10";
  const container = "mx-auto flex w-full max-w-md flex-col gap-4";

  if (checkingSession) {
    return (
      <main className={shell}>
        <div className={container}>
          <p className="text-center text-neutral-600">Wird geladen...</p>
        </div>
      </main>
    );
  }

  // --- Beitritts-Formular ---
  if (!joined) {
    return (
      <main className={shell}>
        <div className={container}>
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Handelsunternehmen</p>
            <h1 className="text-2xl font-bold text-neutral-900 mt-1">Wie heißt eure Gruppe?</h1>
          </div>
          <form onSubmit={handleJoin} className="rounded-2xl bg-white p-5 shadow-md flex flex-col gap-4">
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="z.B. Handelshaus Nord"
              autoFocus
              disabled={loading}
              className="w-full px-4 py-3 border-2 border-neutral-300 rounded-xl text-lg text-center focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-neutral-100"
            />
            {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-800 border border-red-200">{error}</div>}
            <button
              type="submit"
              disabled={loading || !groupName.trim()}
              className="w-full rounded-xl bg-emerald-600 py-3.5 font-bold text-white hover:bg-emerald-700 transition disabled:bg-neutral-300"
            >
              {loading ? "Tritt bei..." : "Spiel beitreten"}
            </button>
          </form>
          <Link href="/gruppe-handel" className="text-center text-sm text-neutral-600 hover:underline">
            ← Anderen PIN eingeben
          </Link>
        </div>
      </main>
    );
  }

  if (!game || !groupData) {
    return (
      <main className={shell}>
        <div className={container}>
          <p className="text-center text-neutral-600">Spiel wird geladen...</p>
        </div>
      </main>
    );
  }

  // --- Spielanleitung: muss direkt nach dem Beitreten einmal bestätigt werden ---
  if (!groupData.instructionsAcknowledged) {
    return (
      <main className={shell}>
        <div className={container}>
          <div className="rounded-2xl border-2 border-emerald-300 bg-white p-6 shadow-md">
            <div className="text-center mb-4">
              <div className="text-4xl mb-2">🛒</div>
              <h1 className="text-2xl font-bold text-neutral-900">Willkommen, {groupData.name}!</h1>
              <p className="text-sm text-neutral-600 mt-1">So funktioniert euer Handelsunternehmen</p>
            </div>

            <div className="flex flex-col gap-3 text-sm text-neutral-700">
              <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-3">
                <p className="font-semibold text-neutral-900 mb-1">🛍️ Einkaufen</p>
                <p>
                  Ihr kauft Ware bei einem Großhändler in drei Qualitätsstufen (Standard-, Marken- und
                  Premiumware). Jeder Einkauf kostet sofort Geld - eure Kaufsumme wird direkt vom Kapital
                  abgezogen.
                </p>
              </div>
              <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-3">
                <p className="font-semibold text-neutral-900 mb-1">💰 Verkaufen</p>
                <p>
                  Danach legt ihr für jede Qualitätsstufe einen Verkaufspreis fest. Wer günstiger UND
                  hochwertiger anbietet als die Konkurrenz, verkauft mehr.
                </p>
              </div>
              <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-3">
                <p className="font-semibold text-neutral-900 mb-1">📦 Lager</p>
                <p>
                  Unverkaufte Ware bleibt im Lager und kostet euch jede Periode etwas Geld, bis ihr sie
                  verkauft.
                </p>
              </div>
              <div className="rounded-xl bg-neutral-50 border border-neutral-200 p-3">
                <p className="font-semibold text-neutral-900 mb-1">🏆 Ziel</p>
                <p>Gewinnt am meisten Geld über alle Perioden zusammen - das entscheidet die Rangliste.</p>
              </div>
            </div>

            {error && <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800 border border-red-200">{error}</div>}

            <button
              onClick={handleAcknowledgeInstructions}
              disabled={acknowledging}
              className="mt-5 w-full rounded-xl bg-emerald-600 py-4 font-bold text-white hover:bg-emerald-700 transition disabled:bg-neutral-300"
            >
              {acknowledging ? "..." : "✓ Verstanden, los geht's!"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // --- Spiel beendet ---
  if (game.status === "finished") {
    const ranking = [...groups].sort((a, b) => (b.cumulativeProfit || 0) - (a.cumulativeProfit || 0));
    const myRank = ranking.findIndex((g) => g.id === groupId) + 1;
    return (
      <main className={shell}>
        <div className={container}>
          <div className="rounded-2xl bg-white p-6 shadow-md text-center">
            <h1 className="text-2xl font-bold text-neutral-900 mb-2">Spiel beendet!</h1>
            <p className="text-neutral-600 mb-4">
              {groupData.name} landete auf Platz {myRank} von {ranking.length}.
            </p>
            <div className="flex flex-col gap-2">
              {ranking.map((g, idx) => (
                <div
                  key={g.id}
                  className={`flex items-center justify-between rounded-xl p-3 border-2 ${
                    g.id === groupId ? "border-emerald-400 bg-emerald-50" : "border-neutral-200"
                  }`}
                >
                  <span className="font-semibold text-neutral-900">
                    {idx + 1}. {g.name}
                  </span>
                  <span className="font-bold text-neutral-900">
                    €{(g.cumulativeProfit || 0).toLocaleString("de-DE")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  // --- Lobby: warten auf Spielstart ---
  if (game.status === "lobby") {
    return (
      <main className={shell}>
        <div className={container}>
          <div className="rounded-2xl bg-white p-6 shadow-md text-center">
            <h1 className="text-xl font-bold text-neutral-900 mb-2">Bereit, {groupData.name}!</h1>
            <p className="text-neutral-600 mb-4">Warte, bis der Spielleiter das Spiel startet...</p>
            <p className="text-sm text-neutral-500">{groups.length} Gruppe(n) sind bereits beigetreten.</p>
          </div>
        </div>
      </main>
    );
  }

  // --- Ergebnisse ---
  if (game.phase === "results") {
    const lastResult = groupData.lastResult;
    if (!lastResult || lastResult.period !== game.period) {
      return (
        <main className={shell}>
          <div className={container}>
            <div className="rounded-2xl bg-white p-6 shadow-md text-center text-neutral-600">
              Ergebnisse werden berechnet...
            </div>
          </div>
        </main>
      );
    }

    const hasMarketInfo = lastResult.totalMarketDemand > 0 || lastResult.averageMarketPrice > 0;

    return (
      <main className={shell}>
        <div className={container}>
          <div className="rounded-2xl bg-white p-5 shadow-md">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Periode {lastResult.period} - Ergebnis</p>
            <h1 className="text-2xl font-bold text-neutral-900 mt-1 mb-4">{groupData.name}</h1>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                <p className="text-xs text-emerald-700 font-semibold">Gewinn</p>
                <p className="text-xl font-bold text-emerald-900">€{lastResult.profit.toLocaleString("de-DE")}</p>
              </div>
              <div className="rounded-xl bg-sky-50 border border-sky-200 p-3">
                <p className="text-xs text-sky-700 font-semibold">Kapital</p>
                <p className="text-xl font-bold text-sky-900">€{lastResult.endingCapital.toLocaleString("de-DE")}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 mb-4">
              {game.qualityTiers.map((tier) => (
                <div key={tier.id} className="rounded-xl border border-neutral-200 p-3">
                  <p className="font-semibold text-sm text-neutral-900">{tier.name}</p>
                  <div className="grid grid-cols-3 gap-2 text-xs text-neutral-600 mt-1">
                    <span>Verkauft: {lastResult.soldUnitsByTier[tier.id]}</span>
                    <span>Umsatz: €{lastResult.revenueByTier[tier.id].toLocaleString("de-DE")}</span>
                    <span>Lager: {lastResult.endingInventoryByTier[tier.id]}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-sm text-neutral-700 flex flex-col gap-1 border-t border-neutral-200 pt-3">
              <div className="flex justify-between"><span>Umsatz</span><span>€{lastResult.revenue.toLocaleString("de-DE")}</span></div>
              <div className="flex justify-between"><span>Einkaufskosten</span><span>€{lastResult.purchaseCosts.toLocaleString("de-DE")}</span></div>
              <div className="flex justify-between"><span>Lagerkosten</span><span>€{lastResult.inventoryCost.toLocaleString("de-DE")}</span></div>
              {lastResult.negotiationCost > 0 && (
                <div className="flex justify-between"><span>Einkaufsverhandlung</span><span>€{lastResult.negotiationCost.toLocaleString("de-DE")}</span></div>
              )}
              {lastResult.marketingCost > 0 && (
                <div className="flex justify-between"><span>Marketing</span><span>€{lastResult.marketingCost.toLocaleString("de-DE")}</span></div>
              )}
              {lastResult.marketAnalysisCost > 0 && (
                <div className="flex justify-between"><span>Marktanalyse</span><span>€{lastResult.marketAnalysisCost.toLocaleString("de-DE")}</span></div>
              )}
              {lastResult.interest > 0 && (
                <div className="flex justify-between text-red-700"><span>Negativzinsen</span><span>€{lastResult.interest.toLocaleString("de-DE")}</span></div>
              )}
            </div>

            {hasMarketInfo && (
              <div className="mt-4 rounded-xl bg-neutral-50 border border-neutral-200 p-3 text-sm text-neutral-700">
                <p className="font-semibold text-neutral-900 mb-1">Marktbericht</p>
                <p>Gesamtnachfrage: {lastResult.totalMarketDemand} Stk.</p>
                <p>Ø Marktpreis: €{lastResult.averageMarketPrice.toFixed(2)}</p>
                <p>Dein Marktanteil: {lastResult.marketShare?.toFixed(1)}%</p>
              </div>
            )}
          </div>
          <p className="text-center text-sm text-neutral-500">Warte auf den Spielleiter für die nächste Periode...</p>
        </div>
      </main>
    );
  }

  // --- Bereits abgegeben ---
  if (groupData.status === "submitted") {
    const submittedCount = groups.filter((g) => g.status === "submitted").length;
    return (
      <main className={shell}>
        <div className={container}>
          <div className="rounded-2xl bg-white p-6 shadow-md text-center">
            <h1 className="text-xl font-bold text-neutral-900 mb-2">Entscheidung abgegeben</h1>
            <p className="text-neutral-600">Warte auf die anderen Gruppen...</p>
            <p className="text-sm text-neutral-500 mt-2">{submittedCount}/{groups.length} Gruppen bereit</p>
          </div>
        </div>
      </main>
    );
  }

  // --- Einkauf & Verkauf: das kombinierte Perioden-Formular ---
  const inventoryEmpty = TIER_IDS.every((t) => groupData.inventory[t] === 0);
  const totalPurchasedThisPeriod = TIER_IDS.reduce((sum, t) => sum + (groupData.currentPeriodPurchases[t] || 0), 0);
  const period1Blocked = game.period === 1 && inventoryEmpty && totalPurchasedThisPeriod <= 0;

  const totalCommittedPending = negotiationInvestment + (game.period >= 5 ? marketingEffort : 0);
  const negotiationProgress = Math.min(
    100,
    Math.round((groupData.cumulativeNegotiationInvestment / game.parameters.purchaseNegotiationThreshold) * 100)
  );

  return (
    <main className={shell}>
      <div className={container}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Periode {game.period}</p>
            <h1 className="text-xl font-bold text-neutral-900">{groupData.name}</h1>
          </div>
          <PeriodTimer deadline={game.phaseEndsAt} />
        </div>

        <div className="rounded-2xl bg-white p-4 grid grid-cols-2 gap-3 shadow-sm">
          <div>
            <p className="text-xs text-neutral-500">Kapital (live)</p>
            <p className="text-lg font-bold text-neutral-900">€{groupData.capital.toLocaleString("de-DE")}</p>
          </div>
          <div>
            <p className="text-xs text-neutral-500">Noch offen (Verhandlung + Marketing)</p>
            <p className={`text-lg font-bold ${totalCommittedPending > groupData.capital ? "text-red-600" : "text-neutral-900"}`}>
              €{Math.round(totalCommittedPending).toLocaleString("de-DE")}
            </p>
          </div>
        </div>

        {period1Blocked && (
          <div className="rounded-xl bg-amber-50 border border-amber-300 p-3 text-sm text-amber-800">
            Euer Lager ist leer - kauft zuerst mindestens eine Qualitätsstufe ein, sonst habt ihr nichts zu verkaufen.
          </div>
        )}

        <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500 mt-2">Einkauf</h2>
        {game.qualityTiers.map((tier) => {
          const boughtQty = groupData.currentPeriodPurchases[tier.id] || 0;
          const boughtCost = groupData.currentPeriodPurchaseCosts[tier.id] || 0;
          const alreadyBought = boughtQty > 0;
          const inputQty = purchaseInputs[tier.id] || 0;
          const unitPrice = effectivePurchaseUnitPrice(tier, inputQty || 1, groupData.negotiationBenefitApplied, game.parameters);
          const nextDiscount = tier.volumeDiscounts.find((d) => inputQty < d.minQuantity);
          const isBuying = buyingTier === tier.id;

          return (
            <div key={tier.id} className="rounded-2xl bg-white p-4 shadow-sm border border-neutral-200">
              <div className="flex items-center justify-between mb-2">
                <p className="font-semibold text-neutral-900">{tier.name}</p>
                <p className="text-xs text-neutral-500">Lager: {groupData.inventory[tier.id]} Stk.</p>
              </div>

              {alreadyBought ? (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">✓ Gekauft: {boughtQty} Stk.</p>
                    <p className="text-xs text-emerald-700">€{boughtCost.toLocaleString("de-DE")} bereits bezahlt</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleUndoTier(tier.id)}
                    disabled={isBuying}
                    className="text-xs font-semibold text-neutral-500 hover:text-red-600 underline whitespace-nowrap"
                  >
                    Rückgängig
                  </button>
                </div>
              ) : (
                <>
                  <label className="block text-xs text-neutral-600 mb-1">Einkaufsmenge</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min={0}
                      value={inputQty || ""}
                      onChange={(e) =>
                        setPurchaseInputs((prev) => ({ ...prev, [tier.id]: Math.max(0, parseInt(e.target.value) || 0) }))
                      }
                      className="flex-1 px-3 py-2.5 border border-neutral-300 rounded-lg text-lg"
                      placeholder="0"
                    />
                    <button
                      type="button"
                      onClick={() => handleBuyTier(tier)}
                      disabled={isBuying || inputQty <= 0}
                      className="rounded-lg bg-emerald-600 px-4 text-sm font-bold text-white hover:bg-emerald-700 transition disabled:bg-neutral-300 whitespace-nowrap"
                    >
                      {isBuying ? "..." : "Einkaufen"}
                    </button>
                  </div>
                  <p className="text-xs text-neutral-500 mt-1">
                    €{unitPrice.toFixed(2)}/Stk. {inputQty > 0 && `(≈ €${Math.round(inputQty * unitPrice).toLocaleString("de-DE")} gesamt)`}
                    {nextDiscount && ` · ab ${nextDiscount.minQuantity} Stk. −${Math.round(nextDiscount.discountPercent * 100)}%`}
                  </p>
                </>
              )}
            </div>
          );
        })}

        {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-800 border border-red-200">{error}</div>}

        <form onSubmit={handleDecisionSubmit} className="flex flex-col gap-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500 mt-2">Verkauf</h2>
          {game.qualityTiers.map((tier) => {
            const boughtQty = groupData.currentPeriodPurchases[tier.id] || 0;
            const availableToSell = boughtQty + groupData.inventory[tier.id];
            return (
              <div key={tier.id} className="rounded-2xl bg-white p-4 shadow-sm border border-neutral-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-neutral-900">{tier.name}</p>
                  {availableToSell > 0 && (
                    <p className="text-xs text-neutral-500">
                      Verfügbar: {availableToSell} Stk.
                      {boughtQty > 0 && ` (${boughtQty} neu + ${groupData.inventory[tier.id]} Lager)`}
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-neutral-600 mb-1">Verkaufspreis (€)</label>
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={pricesByTier[tier.id] || ""}
                      onChange={(e) =>
                        setPricesByTier((prev) => ({ ...prev, [tier.id]: Math.max(0, parseFloat(e.target.value) || 0) }))
                      }
                      className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg text-lg"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-neutral-600 mb-1">
                      Aus Lager verkaufen (max. {groupData.inventory[tier.id]})
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={groupData.inventory[tier.id]}
                      value={sellFromInventoryByTier[tier.id] || ""}
                      onChange={(e) =>
                        setSellFromInventoryByTier((prev) => ({
                          ...prev,
                          [tier.id]: Math.max(0, Math.min(groupData.inventory[tier.id], parseInt(e.target.value) || 0)),
                        }))
                      }
                      disabled={groupData.inventory[tier.id] === 0}
                      className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg text-lg disabled:bg-neutral-100"
                      placeholder="0"
                    />
                  </div>
                </div>
              </div>
            );
          })}

          <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500 mt-2">Weitere Investitionen</h2>

          <div className="rounded-2xl bg-white p-4 shadow-sm border border-neutral-200">
            <p className="font-semibold text-neutral-900 mb-1">Einkaufsverhandlung</p>
            <p className="text-xs text-neutral-600 mb-2">
              Steckt über die Zeit (auch über mehrere Perioden verteilt) insgesamt{" "}
              €{game.parameters.purchaseNegotiationThreshold.toLocaleString("de-DE")} in Verhandlungen mit dem
              Großhändler. Sobald ihr diese Summe erreicht habt, bekommt ihr dauerhaft{" "}
              {Math.round(game.parameters.purchaseNegotiationDiscount * 100)}% Rabatt auf jeden Einkauf.
            </p>
            {groupData.negotiationBenefitApplied ? (
              <p className="text-sm font-semibold text-emerald-700 mb-2">✓ Rabatt ist bereits aktiv!</p>
            ) : (
              <div className="mb-2">
                <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${negotiationProgress}%` }} />
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  Bisher investiert: €{groupData.cumulativeNegotiationInvestment.toLocaleString("de-DE")} von €
                  {game.parameters.purchaseNegotiationThreshold.toLocaleString("de-DE")}
                </p>
              </div>
            )}
            <input
              type="number"
              min={0}
              value={negotiationInvestment || ""}
              onChange={(e) => setNegotiationInvestment(Math.max(0, parseInt(e.target.value) || 0))}
              className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg text-lg"
              placeholder="0"
            />
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm border border-neutral-200">
            <p className="font-semibold text-neutral-900 mb-1">Marktanalyse</p>
            <p className="text-xs text-neutral-600 mb-2">
              €{game.parameters.marketAnalysisCost.toLocaleString("de-DE")} für Marktanteil, Ø Marktpreis und Gesamtnachfrage im Ergebnis.
            </p>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={buyMarketAnalysis}
                onChange={(e) => setBuyMarketAnalysis(e.target.checked)}
                className="accent-emerald-600 w-5 h-5"
              />
              <span className="text-sm text-neutral-700">Marktanalyse kaufen</span>
            </label>
          </div>

          {game.period >= 5 ? (
            <div className="rounded-2xl bg-white p-4 shadow-sm border border-neutral-200">
              <p className="font-semibold text-neutral-900 mb-1">Marketing</p>
              <p className="text-xs text-neutral-600 mb-2">Erhöht euren Marktanteil zusätzlich zu Preis und Qualität.</p>
              <input
                type="number"
                min={0}
                value={marketingEffort || ""}
                onChange={(e) => setMarketingEffort(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full px-3 py-2.5 border border-neutral-300 rounded-lg text-lg"
                placeholder="0"
              />
            </div>
          ) : (
            <p className="text-xs text-neutral-500 text-center">Marketing ist erst ab Periode 5 wirksam.</p>
          )}

          <button
            type="submit"
            disabled={decisionLoading}
            className="w-full rounded-xl bg-emerald-600 py-4 font-bold text-white hover:bg-emerald-700 transition disabled:bg-neutral-300 mb-6"
          >
            {decisionLoading ? "Wird eingereicht..." : "Entscheidung einreichen"}
          </button>
        </form>
      </div>
    </main>
  );
}
