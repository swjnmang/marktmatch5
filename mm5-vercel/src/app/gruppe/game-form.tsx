"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, addDoc, serverTimestamp, updateDoc, onSnapshot, setDoc, getDocs } from "firebase/firestore";
import { checkPinFromLocalStorage } from "@/lib/auth";
import type { GameDocument, GroupState, Machine, PeriodDecision, SpecialTask } from "@/lib/types";

const MACHINE_OPTIONS: Machine[] = [
  { name: "SmartMini-Fertiger", cost: 5000, capacity: 100, variableCostPerUnit: 6 },
  { name: "KompaktPro-Produzent", cost: 12000, capacity: 250, variableCostPerUnit: 5 },
  { name: "FlexiTech-Assembler", cost: 18000, capacity: 350, variableCostPerUnit: 4.5 },
  { name: "MegaFlow-Manufaktur", cost: 25000, capacity: 500, variableCostPerUnit: 4 },
];

export function GruppeGameForm({ prefilledPin = "" }: { prefilledPin?: string }) {
  const params = useParams();
  const gameId = params.gameId as string;
  const [pin, setPin] = useState(prefilledPin);
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [joined, setJoined] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [groupData, setGroupData] = useState<GroupState | null>(null);
  const [game, setGame] = useState<GameDocument | null>(null);
  const [currentTask, setCurrentTask] = useState<SpecialTask | null>(null);
  const [storedGroupId, setStoredGroupId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSolo, setIsSolo] = useState(false);
  const [competitorInsights, setCompetitorInsights] = useState<Array<{name: string; price: number; soldUnits: number}>>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [production, setProduction] = useState(0);
  const [sellFromInventory, setSellFromInventory] = useState(0);
  const [price, setPrice] = useState(0);
  const [buyMarketAnalysis, setBuyMarketAnalysis] = useState(false);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [machineChoice, setMachineChoice] = useState("");
  const [machineLoading, setMachineLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);

  // Auto-calculate results in Solo mode when phase is "results" - only once per period
  useEffect(() => {
    const autoCalculate = async () => {
      if (!game || !gameId || game.phase !== "results" || calculating) return;
      
      const isSoloMode = localStorage.getItem(`solo_mode_${gameId}`);
      if (!isSoloMode) return;

      // Check if we already calculated this period by verifying ALL groups have lastResult with matching period
      const allGroupsSnapshot = await getDocs(collection(db, "games", gameId, "groups"));
      const allGroupsHaveResult = allGroupsSnapshot.docs.every(d => {
        const data = d.data() as GroupState;
        return data.lastResult && data.lastResult.period === game.period;
      });
      
      if (allGroupsHaveResult) {
        // Already calculated this period
        console.log(`[Solo] Period ${game.period} already calculated`);
        return;
      }

      setCalculating(true);
      try {
        // Get all groups and decisions with timeout
        const groupsSnapshot = await Promise.race([
          getDocs(collection(db, "games", gameId, "groups")),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout fetching groups")), 10000))
        ]);
        const allGroups = (groupsSnapshot as any).docs.map((d: any) => ({ id: d.id, ...d.data() } as GroupState));
        
        const decisionsSnapshot = await Promise.race([
          getDocs(collection(db, "games", gameId, "decisions")),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout fetching decisions")), 10000))
        ]);
        const allDecisions: Record<string, PeriodDecision> = {};
        (decisionsSnapshot as any).docs.forEach((d: any) => {
          allDecisions[d.id] = d.data() as PeriodDecision;
        });

        console.log(`[Solo] Calculating Period ${game.period}...`);

        // Calculate market results
        const { calculateMarketResults } = await import("@/lib/market-calculation");
        const results = await calculateMarketResults(game, allGroups, allDecisions);

        // Update each group with results
        for (const group of allGroups) {
          const result = results[group.id];
          if (!result) continue;

          const newCumulativeRnd = group.cumulativeRndInvestment + (allDecisions[group.id]?.rndInvestment || 0);
          const rndBenefitApplied = newCumulativeRnd >= game.parameters.rndBenefitThreshold;

          console.log(`[Solo] Updating ${group.name} (Period ${result.period}): Sold=${result.soldUnits}, Revenue=${result.revenue}`);

          await updateDoc(doc(db, "games", gameId, "groups", group.id), {
            capital: result.endingCapital,
            inventory: result.endingInventory,
            cumulativeProfit: group.cumulativeProfit + result.profit,
            cumulativeRndInvestment: newCumulativeRnd,
            rndBenefitApplied,
            lastResult: result,
            status: "waiting"
          });
        }
        
        // Force-refresh current group data after ALL updates complete
        if (groupId) {
          // Wait a bit for Firestore to propagate changes
          await new Promise(resolve => setTimeout(resolve, 500));
          
          const updatedGroupDoc = await getDoc(doc(db, "games", gameId, "groups", groupId));
          if (updatedGroupDoc.exists()) {
            const updatedData = { id: updatedGroupDoc.id, ...updatedGroupDoc.data() } as GroupState;
            console.log(`[Solo] Force-refreshed group data: period ${updatedData.lastResult?.period}, game.period=${game.period}`);
            setGroupData(updatedData);
          }
        }
        
        setCalculating(false);
      } catch (err: any) {
        console.error("Calculation error:", err);
        setError(`Berechnung fehlgeschlagen: ${err.message}`);
        // Reset calculating state even on error
        setCalculating(false);
      } finally {
        // Don't call setCalculating(false) here since we call it above
      }
    };

    autoCalculate();
  }, [game?.period, gameId, groupId, groupData?.lastResult?.period, calculating]);

  // Check localStorage on mount for existing group session (same device/browser)
  useEffect(() => {
    const existingGroupId = localStorage.getItem(`group_${gameId}`);
    const isSoloMode = localStorage.getItem(`solo_mode_${gameId}`);

    if (existingGroupId && isSoloMode) {
      setIsSolo(true);
      // In Solo mode, resume automatically
      const loadGroup = async () => {
        try {
          const groupDoc = await getDoc(doc(db, "games", gameId, "groups", existingGroupId));
          if (groupDoc.exists()) {
            setGroupId(existingGroupId);
            setGroupData({ id: groupDoc.id, ...groupDoc.data() } as GroupState);
            setJoined(true);
          } else {
            // If not found, fall back to manual resume option
            setStoredGroupId(existingGroupId);
          }
        } catch (err) {
          console.error("Error loading group:", err);
          setStoredGroupId(existingGroupId);
        }
      };
      loadGroup();
    } else if (existingGroupId) {
      // In group mode, offer explicit resume button
      setStoredGroupId(existingGroupId);
    }

    // Admin PIN might already be stored
    setIsAdmin(checkPinFromLocalStorage(gameId));
  }, [gameId]);

  // Load competitor insights for Solo mode when market analysis was purchased
  useEffect(() => {
    const loadInsights = async () => {
      if (!isSolo || !gameId || !groupId || !game || game.phase !== "results") return;
      if (!groupData?.lastResult || !(groupData.lastResult.marketAnalysisCost > 0)) return;
      setInsightsLoading(true);
      try {
        const groupsSnapshot = await getDocs(collection(db, "games", gameId, "groups"));
        const decisionsSnapshot = await getDocs(collection(db, "games", gameId, "decisions"));
        const decisionsMap: Record<string, PeriodDecision> = {};
        decisionsSnapshot.docs.forEach((d) => {
          decisionsMap[d.id] = d.data() as PeriodDecision;
        });

        const insights: Array<{name: string; price: number; soldUnits: number}> = [];
        groupsSnapshot.docs.forEach((docSnap) => {
          const gid = docSnap.id;
          if (gid === groupId) return; // skip self
          const data = docSnap.data() as any;
          const lr = data.lastResult;
          const dec = decisionsMap[gid];
          if (lr && dec) {
            insights.push({
              name: data.name || `Gruppe ${gid.substring(0, 4)}`,
              price: dec.price,
              soldUnits: lr.soldUnits || 0,
            });
          }
        });
        setCompetitorInsights(insights);
      } catch (err) {
        console.error("Error loading competitor insights", err);
      } finally {
        setInsightsLoading(false);
      }
    };
    loadInsights();
  }, [isSolo, gameId, groupId, game?.phase, groupData?.lastResult?.marketAnalysisCost]);

  // Load game data and listen to changes
  useEffect(() => {
    if (!gameId) return;
    
    const gameRef = doc(db, "games", gameId);
    const unsubscribe = onSnapshot(gameRef, (snapshot) => {
      if (snapshot.exists()) {
        setGame({ id: snapshot.id, ...snapshot.data() } as unknown as GameDocument);
      }
    });

    return () => unsubscribe();
  }, [gameId]);

  // Listen to group data changes
  useEffect(() => {
    if (!gameId || !groupId) return;

    const groupRef = doc(db, "games", gameId, "groups", groupId);
    const unsubscribe = onSnapshot(groupRef, (snapshot) => {
      if (snapshot.exists()) {
        setGroupData({ id: snapshot.id, ...snapshot.data() } as unknown as GroupState);
      }
    });

    return () => unsubscribe();
  }, [gameId, groupId]);

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

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const groupsRef = collection(db, "games", gameId, "groups");
      const newGroup: Omit<GroupState, "id"> = {
        name: groupName,
        capital: 50000,
        inventory: 0,
        cumulativeProfit: 0,
        machines: [],
        cumulativeRndInvestment: 0,
        rndBenefitApplied: false,
        status: "waiting",
      };
      const docRef = await addDoc(groupsRef, newGroup);
      localStorage.setItem(`group_${gameId}`, docRef.id);
      localStorage.setItem(`gameId_${docRef.id}`, gameId);
      setGroupId(docRef.id);
      setGroupData({ id: docRef.id, ...newGroup });
      setJoined(true);
    } catch (err: any) {
      setError(`Fehler: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleResumeSession = async () => {
    if (!storedGroupId) return;
    setLoading(true);
    setError("");
    try {
      const groupRef = doc(db, "games", gameId, "groups", storedGroupId);
      const groupDoc = await getDoc(groupRef);
      if (!groupDoc.exists()) {
        setError("Deine vorige Sitzung wurde nicht gefunden.");
        localStorage.removeItem(`group_${gameId}`);
        setStoredGroupId(null);
        return;
      }

      setGroupId(storedGroupId);
      setGroupData({ id: groupDoc.id, ...groupDoc.data() } as GroupState);
      setJoined(true);
      setIsAdmin(checkPinFromLocalStorage(gameId));
    } catch (err: any) {
      setError(`Fehler beim Wiederbeitritt: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupId || !groupData || !game) return;
    setDecisionLoading(true);
    setError("");
    try {
      const decision: PeriodDecision = {
        groupId,
        period: game.period,
        production,
        sellFromInventory,
        price,
        marketingEffort: 0,
        buyMarketAnalysis,
        rndInvestment: 0,
        newMachine: "",
        submittedAt: serverTimestamp() as any,
      };
      await setDoc(doc(db, "games", gameId, "decisions", groupId), decision);
      await updateDoc(doc(db, "games", gameId, "groups", groupId), { status: "submitted" });

      // Check if this is Solo mode
      const isSoloMode = localStorage.getItem(`solo_mode_${gameId}`);
      if (isSoloMode) {
        // Generate AI decisions
        const { generateAIDecision } = await import("@/lib/ai-opponent");
        const groupsRef = collection(db, "games", gameId, "groups");
        const allGroupsSnapshot = await getDocs(groupsRef);
        const aiGroups = allGroupsSnapshot.docs.filter(d => d.data().isAI === true);

        // Submit decisions for all AI groups
        for (const aiDoc of aiGroups) {
          const aiGroup = { id: aiDoc.id, ...aiDoc.data() } as GroupState;
          const aiDecision = generateAIDecision(aiGroup, game, game.period);
          await setDoc(doc(db, "games", gameId, "decisions", aiDoc.id), {
            ...aiDecision,
            submittedAt: serverTimestamp()
          });
          await updateDoc(doc(db, "games", gameId, "groups", aiDoc.id), { status: "submitted" });
        }

        // Transition to results phase (calculation will happen separately)
        await updateDoc(doc(db, "games", gameId), {
          phase: "results"
        });
      }
    } catch (err: any) {
      setError(`Fehler beim Einreichen: ${err.message}`);
    } finally {
      setDecisionLoading(false);
    }
  };

  const handleMachineSelect = async () => {
    if (!groupId || !gameId || !machineChoice) return;
    setMachineLoading(true);
    setError("");
    try {
      const selectedMachine = MACHINE_OPTIONS.find(m => m.name === machineChoice);
      if (!selectedMachine) throw new Error("Maschine nicht gefunden");
      
      // Update group with selected machine
      await updateDoc(doc(db, "games", gameId, "groups", groupId), {
        machines: [selectedMachine],
        capital: groupData!.capital - selectedMachine.cost,
        status: "ready"
      });

      // Check if this is Solo mode
      const isSoloMode = localStorage.getItem(`solo_mode_${gameId}`);
      if (isSoloMode) {
        // Auto-select machines for AI opponents and transition to decisions phase
        const groupsSnapshot = await getDoc(doc(db, "games", gameId));
        if (groupsSnapshot.exists()) {
          const groupsRef = collection(db, "games", gameId, "groups");
          const groupsQuery = await getDoc(doc(db, "games", gameId));
          
          // Get all groups
          const allGroupsSnapshot = await getDocs(groupsRef);
          const aiGroups = allGroupsSnapshot.docs.filter(
            d => d.data().isAI === true && d.data().status !== "ready"
          );

          // Set machines for AI groups
          const { selectAIMachine } = await import("@/lib/ai-opponent");
          for (const aiDoc of aiGroups) {
            const aiGroup = { id: aiDoc.id, ...aiDoc.data() } as GroupState;
            const aiMachineName = selectAIMachine(aiGroup, aiGroup.aiStrategy!);
            const aiMachine = MACHINE_OPTIONS.find(m => m.name === aiMachineName);
            if (aiMachine) {
              await updateDoc(doc(db, "games", gameId, "groups", aiDoc.id), {
                machines: [aiMachine],
                capital: aiGroup.capital - aiMachine.cost,
                status: "ready"
              });
            }
          }

          // Transition game to decisions phase
          await updateDoc(doc(db, "games", gameId), {
            phase: "decisions",
            period: 1
          });
        }
      }
    } catch (err: any) {
      setError(`Fehler beim Maschinenkauf: ${err.message}`);
    } finally {
      setMachineLoading(false);
    }
  };

  const handleNextPeriod = async () => {
    if (!gameId) return;
    setLoading(true);
    try {
      // Reset all groups to waiting status
      const groupsSnapshot = await getDocs(collection(db, "games", gameId, "groups"));
      for (const groupDoc of groupsSnapshot.docs) {
        await updateDoc(doc(db, "games", gameId, "groups", groupDoc.id), {
          status: "waiting"
        });
      }

      // Increment period and go back to decisions
      await updateDoc(doc(db, "games", gameId), {
        period: game!.period + 1,
        phase: "decisions"
      });

      // Reset form
      setProduction(0);
      setSellFromInventory(0);
      setPrice(0);
      setBuyMarketAnalysis(false);
    } catch (err: any) {
      setError(`Fehler: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReadyClick = async () => {
    if (!groupId || !gameId) return;
    setLoading(true);
    setError("");
    try {
      await updateDoc(doc(db, "games", gameId, "groups", groupId), {
        status: "ready"
      });
    } catch (err: any) {
      setError(`Fehler: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEndGame = async () => {
    if (!gameId || !confirm("Spiel wirklich beenden?")) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, "games", gameId), {
        status: "finished"
      });
      
      // Clear localStorage
      localStorage.removeItem(`group_${gameId}`);
      localStorage.removeItem(`solo_mode_${gameId}`);
      
      // Redirect to home
      window.location.href = "/";
    } catch (err: any) {
      setError(`Fehler: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Full-screen Task Modal when Special Task exists */}
      {currentTask && joined && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-2xl">
            <div className="flex gap-4">
              <div className="text-5xl flex-shrink-0">📋</div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-amber-900 mb-4">Spezialauftrag</h1>
                <h2 className="text-2xl font-semibold text-amber-800 mb-6">{currentTask.title}</h2>
                <div className="prose prose-sm max-w-none mb-8">
                  <p className="text-base text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {currentTask.description}
                  </p>
                </div>
                <div className="rounded-lg bg-amber-50 p-4 border border-amber-200">
                  <p className="text-sm font-semibold text-amber-900">
                    ⏰ Bitte bearbeitet diesen Auftrag zwischen den Perioden und kehrt dann zur Spielleitung zurück.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-14 sm:px-10">
        {/* Only show rest of UI if no special task is active */}
        {!currentTask && (
          <>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-600">Gruppe</p>
              <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
                {joined && groupData ? groupData.name : "Mit Code einer Lobby beitreten"}
              </h1>
              <p className="text-base text-slate-600">
                {joined && groupData
                  ? `Spiel-ID: ${gameId.substring(0, 8)}... • Kapital: €${groupData.capital.toLocaleString(
                      "de-DE"
                    )}`
                  : "Gib die Gruppen-PIN ein, die du von der Spielleitung erhalten hast. Du siehst nur die Daten deiner eigenen Gruppe."}
              </p>
            </div>

        <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-700 text-sm">{error}</div>
          )}

          {!joined && storedGroupId && (
            <div className="mb-4 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <div>
                <p className="text-sm font-semibold text-emerald-900">Vorherige Sitzung gefunden</p>
                <p className="text-xs text-emerald-800">Du kannst deine bestehende Gruppe auf diesem Gerät sofort fortsetzen.</p>
              </div>
              <button
                type="button"
                onClick={handleResumeSession}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Sitzung wieder aufnehmen
              </button>
            </div>
          )}

          {!joined && (
            <form onSubmit={handleJoin} className="flex flex-col gap-4">
              <label className="flex flex-col gap-2 text-sm text-slate-700">
                Gruppen-PIN (5 Zeichen)
                <input
                  type="text"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.toUpperCase())}
                  placeholder="PIN aus QR-Code oder manuell eingeben"
                  maxLength={5}
                  disabled={joined}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-base text-slate-900 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-700">
                Anzeigename der Gruppe
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="z.B. Team Alpha"
                  disabled={joined}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-base text-slate-900 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:bg-slate-100 disabled:cursor-not-allowed"
                />
              </label>
              <p className="text-xs text-slate-500">
                Deine Entscheidungen bleiben privat. Marktanalysen werden nur angezeigt, wenn deine
                Gruppe sie gekauft hat.
              </p>
              <button
                type="submit"
                disabled={loading || joined}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-sky-200"
              >
                {joined ? "Beitritt erfolgreich" : loading ? "Wird beigetreten..." : "Beitreten"}
              </button>
            </form>
          )}

          {joined && (
            <div className="flex flex-col gap-4">
              {/* Waiting for Game to Start */}
              {!game || game.status !== "in_progress" ? (
                <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
                  <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-sky-200 border-t-sky-600"></div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Warte auf Spielstart
                  </h3>
                  <p className="text-sm text-slate-600">
                    Die Spielleitung startet das Spiel gleich. Du wirst automatisch weitergeleitet.
                  </p>
                  <p className="text-xs text-slate-500">
                    Aktueller Status: {game ? (game.status === "lobby" ? "Warte auf Spielstart" : "Lädt...") : "Lädt..."}
                  </p>
                  <button
                    onClick={handleReadyClick}
                    disabled={loading || groupData?.status === "ready"}
                    className="mt-2 inline-flex items-center justify-center rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {groupData?.status === "ready" ? "✓ Bereit" : loading ? "Wird gespeichert..." : "Bereit"}
                  </button>
                </div>
              ) : (
                <>
                  {/* Machine Selection Phase */}
                  {game.phase === "machine_selection" &&
                    groupData &&
                    groupData.status !== "ready" && (
                      <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6">
                        <div>
                          <h3 className="text-lg font-semibold text-slate-900 mb-2">
                            Produktionsmaschine auswählen
                          </h3>
                          <p className="text-sm text-slate-600">
                            Wähle eine Produktionsmaschine für dein Unternehmen. Diese Entscheidung beeinflusst deine Produktionskapazität und Kostenstruktur.
                          </p>
                        </div>

                        <div className="grid gap-4 grid-cols-1">
                          {MACHINE_OPTIONS.map((m) => (
                            <label
                              key={m.name}
                              className={`flex cursor-pointer flex-col gap-3 rounded-lg border-2 p-4 transition ${
                                machineChoice === m.name
                                  ? "border-sky-500 bg-sky-50 ring-2 ring-sky-200"
                                  : "border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-3 pt-0.5">
                                  <input
                                    type="radio"
                                    name="machine"
                                    value={m.name}
                                    checked={machineChoice === m.name}
                                    onChange={() => setMachineChoice(m.name)}
                                    className="accent-sky-600 mt-1"
                                  />
                                  <div>
                                    <p className="font-semibold text-slate-900">{m.name}</p>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-2 rounded-lg bg-slate-50 p-3 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-slate-600">Einmalige Anschaffungskosten:</span>
                              <span className="font-semibold text-slate-900">
                                €{m.cost.toLocaleString("de-DE")}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">Maximale Produktionskapazität:</span>
                              <span className="font-semibold text-slate-900">
                                {m.capacity} Einheiten/Periode
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">Produktionskosten pro Einheit:</span>
                              <span className="font-semibold text-slate-900">
                                €{m.variableCostPerUnit.toLocaleString("de-DE")}
                              </span>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>

                    <div className="rounded-lg border border-sky-200 bg-sky-50 p-4">
                      <p className="text-sm text-slate-700 mb-1">
                        <span className="font-semibold">Verfügbares Kapital:</span>
                      </p>
                      <p className="text-2xl font-bold text-sky-900">
                        €{groupData ? groupData.capital.toLocaleString("de-DE") : "0"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleMachineSelect}
                      disabled={machineLoading || !machineChoice}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-base font-semibold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {machineLoading ? "Maschine wird gekauft..." : "Maschine kaufen & starten"}
                    </button>
                  </div>
                )}

              {/* Machine purchased and waiting */}
              {game.phase === "machine_selection" &&
                groupData &&
                groupData.status === "ready" && (
                  <div className="flex flex-col gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-6">
                    <div className="flex items-center gap-3 text-emerald-900">
                      <span className="text-2xl">✅</span>
                      <div>
                        <h3 className="text-lg font-semibold">Maschine erfolgreich gekauft</h3>
                        <p className="text-sm text-emerald-800">
                          Warte auf die Spielleitung, bis die nächste Phase startet.
                        </p>
                      </div>
                    </div>
                    {groupData.machines && groupData.machines.length > 0 && (
                      <div className="rounded-lg bg-white p-4 text-sm text-slate-800 shadow-sm">
                        <p className="font-semibold">Deine Maschine</p>
                        <p className="mt-1">{groupData.machines[0].name}</p>
                        <p className="text-slate-600">
                          Kapazität: {groupData.machines[0].capacity} Einheiten/Periode · Variable Kosten: €{groupData.machines[0].variableCostPerUnit.toLocaleString("de-DE")}
                        </p>
                      </div>
                    )}
                  </div>
                )}

              {/* Decisions Phase */}
              {game.phase === "decisions" &&
                groupData &&
                groupData.status !== "submitted" && (
                  <form onSubmit={handleDecisionSubmit} className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-2">
                        Entscheidungen Periode {game.period}
                      </h3>
                      <p className="text-sm text-slate-600 leading-relaxed">
                        Trefft eure strategischen Entscheidungen für diese Periode. Bestimmt die <strong>Produktionsmenge</strong>, die <strong>Verkaufsmengen aus dem Lager</strong> und den <strong>Verkaufspreis</strong>. Optional könnt ihr auch eine <strong>Marktanalyse</strong> kaufen, um mehr über die Konkurrenz zu erfahren.
                      </p>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="flex flex-col gap-1 text-sm text-slate-700">
                        Produktionsmenge
                        <input
                          type="number"
                          value={production === 0 ? "" : production}
                          onChange={(e) =>
                            setProduction(
                              e.target.value === "" ? 0 : Number(e.target.value)
                            )
                          }
                          min={0}
                          max={
                            groupData?.machines?.reduce((sum, m) => sum + m.capacity, 0) ||
                            0
                          }
                          placeholder="0"
                          className="rounded-lg border border-slate-200 px-3 py-2 text-base shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                        />
                        <span className="text-xs text-slate-500">
                          Max: {groupData?.machines?.reduce((sum, m) => sum + m.capacity, 0) || 0}{" "}
                          (Kapazität)
                        </span>
                      </label>
                      <label className="flex flex-col gap-1 text-sm text-slate-700">
                        Verkauf aus Lagerbestand
                        <input
                          type="number"
                          value={sellFromInventory === 0 ? "" : sellFromInventory}
                          onChange={(e) =>
                            setSellFromInventory(
                              e.target.value === "" ? 0 : Number(e.target.value)
                            )
                          }
                          min={0}
                          max={groupData?.inventory || 0}
                          placeholder="0"
                          className="rounded-lg border border-slate-200 px-3 py-2 text-base shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                        />
                        <span className="text-xs text-slate-500">
                          Lagerbestand: {groupData?.inventory || 0}
                        </span>
                      </label>
                      <label className="flex flex-col gap-1 text-sm text-slate-700">
                        Verkaufspreis (€)
                        <input
                          type="number"
                          value={price === 0 ? "" : price}
                          onChange={(e) =>
                            setPrice(e.target.value === "" ? 0 : Number(e.target.value))
                          }
                          min={0}
                          step={0.5}
                          className="rounded-lg border border-slate-200 px-3 py-2 text-base shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                        />
                      </label>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={buyMarketAnalysis}
                        onChange={(e) => setBuyMarketAnalysis(e.target.checked)}
                        className="accent-sky-600"
                      />
                      Marktanalyse kaufen (€{game.parameters.marketAnalysisCost})
                    </label>
                    <button
                      type="submit"
                      disabled={decisionLoading}
                      className="inline-flex w-fit items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {decisionLoading ? "Wird eingereicht..." : "Entscheidungen einreichen"}
                    </button>
                  </form>
                )}

              {/* Waiting for Results (hide when results available) */}
              {game.phase === "results" && (!groupData?.lastResult || groupData.lastResult.period !== game.period) && (
                  <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 text-center">
                    {error ? (
                      <>
                        <div className="mx-auto h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                          <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-semibold text-red-800">
                          Berechnung fehlgeschlagen
                        </h3>
                        <p className="text-sm text-red-600">
                          {error}
                        </p>
                        <button
                          onClick={() => {
                            setError("");
                          }}
                          className="mx-auto inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                        >
                          Erneut versuchen
                        </button>
                      </>
                    ) : (
                      <>
                        {localStorage.getItem(`solo_mode_${gameId}`) && calculating ? (
                          <>
                            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600"></div>
                            <h3 className="text-lg font-semibold text-slate-800">
                              Berechnung läuft...
                            </h3>
                            <p className="text-sm text-slate-600">
                              Die KI-Gegner haben ihre Entscheidungen getroffen. Die Marktberechnung wird durchgeführt.
                            </p>
                            <p className="text-xs text-slate-500">
                              Dies kann einige Sekunden dauern...
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                              <svg className="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-slate-800">
                              Berechnung der Periode {game.period} abgeschlossen
                            </h3>
                            <p className="text-sm text-slate-600">
                              Alle Gruppen haben ihre Entscheidungen eingereicht und die Marktberechnung ist fertig.
                            </p>
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}

              {/* Show results if available */}
              {groupData?.lastResult && game.phase === "results" && groupData.lastResult.period === game.period && (
                <div className="flex flex-col gap-4">
                  {/* 1. Box: Group Results */}
                  <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
                      <h3 className="text-xl font-bold text-slate-900">
                        Ergebnisse der Gruppe "{groupData.name}"
                      </h3>
                      <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                        Periode {groupData.lastResult.period}
                      </span>
                    </div>

                    {/* Performance Metrics - 2x2 Grid */}
                    <div className="grid gap-4 sm:grid-cols-2 mb-4">
                      <div className="rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 p-4 border border-slate-200">
                        <p className="text-xs font-semibold text-slate-600 uppercase">Verkaufte Einheiten</p>
                        <p className="mt-2 text-3xl font-bold text-slate-900">
                          {groupData.lastResult.soldUnits}
                        </p>
                      </div>
                      <div className="rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 border border-emerald-200">
                        <p className="text-xs font-semibold text-emerald-700 uppercase">Umsatz</p>
                        <p className="mt-2 text-3xl font-bold text-emerald-700">
                          €{groupData.lastResult.revenue.toLocaleString("de-DE")}
                        </p>
                      </div>
                      <div className="rounded-lg bg-gradient-to-br from-red-50 to-red-100 p-4 border border-red-200">
                        <p className="text-xs font-semibold text-red-700 uppercase">Gesamtkosten</p>
                        <p className="mt-2 text-3xl font-bold text-red-700">
                          €{groupData.lastResult.totalCosts.toLocaleString("de-DE")}
                        </p>
                      </div>
                      <div className="rounded-lg bg-gradient-to-br from-sky-50 to-sky-100 p-4 border-2 border-sky-300 ring-2 ring-sky-200 ring-offset-2">
                        <p className="text-xs font-semibold text-sky-700 uppercase">Gewinn / Verlust</p>
                        <p className={`mt-2 text-3xl font-bold ${groupData.lastResult.profit >= 0 ? 'text-sky-700' : 'text-red-700'}`}>
                          €{groupData.lastResult.profit.toLocaleString("de-DE")}
                        </p>
                      </div>
                    </div>

                    {/* Summary Info */}
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="grid gap-3 sm:grid-cols-3 text-sm">
                        <div>
                          <p className="text-xs font-semibold text-slate-600">Neues Kapital</p>
                          <p className="mt-1 text-lg font-bold text-slate-900">
                            €{groupData.lastResult.endingCapital.toLocaleString("de-DE")}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-600">Lagerbestand</p>
                          <p className="mt-1 text-lg font-bold text-slate-900">
                            {groupData.lastResult.endingInventory} Einh.
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-600">Kumulierter Gewinn</p>
                          <p className={`mt-1 text-lg font-bold ${groupData.cumulativeProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                            €{groupData.cumulativeProfit.toLocaleString("de-DE")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. Box: Market Report (Collapsible) */}
                  <details className="rounded-lg border border-sky-200 bg-sky-50 shadow-sm">
                    <summary className="cursor-pointer p-4 font-semibold text-sky-900 hover:bg-sky-100 transition rounded-lg flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span>📊</span>
                        <span>Marktbericht</span>
                      </span>
                      <span className="text-xs font-normal text-sky-700">▼ ausklappen</span>
                    </summary>
                    <div className="p-4 pt-2 space-y-3">
                      <div className="flex items-center justify-between rounded bg-white p-3 shadow-sm">
                        <span className="text-sm text-slate-600">Durchschnittspreis</span>
                        <span className="text-lg font-bold text-slate-900">
                          €{groupData.lastResult.averageMarketPrice?.toFixed(2) || "0.00"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded bg-white p-3 shadow-sm">
                        <span className="text-sm text-slate-600">Gesamtnachfrage</span>
                        <span className="text-lg font-bold text-slate-900">
                          {groupData.lastResult.totalMarketDemand || 0} Einheiten
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded bg-white p-3 shadow-sm">
                        <span className="text-sm text-slate-600">Mein Marktanteil</span>
                        <span className="text-lg font-bold text-sky-700">
                          {groupData.lastResult.marketShare?.toFixed(1) || "0.0"}%
                        </span>
                      </div>
                    </div>
                  </details>

                  {/* 3. Box: Competitor Analysis (Collapsible) */}
                  <details className="rounded-lg border border-amber-200 bg-amber-50 shadow-sm">
                    <summary className="cursor-pointer p-4 font-semibold text-amber-900 hover:bg-amber-100 transition rounded-lg flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span>🔎</span>
                        <span>Marktanalyse der Konkurrenz</span>
                      </span>
                      <span className="text-xs font-normal text-amber-700">▼ ausklappen</span>
                    </summary>
                    <div className="p-4 pt-2">
                      {groupData.lastResult.marketAnalysisCost > 0 ? (
                        isSolo ? (
                          insightsLoading ? (
                            <p className="text-sm text-amber-800">Analyse wird geladen...</p>
                          ) : competitorInsights.length > 0 ? (
                            <div className="space-y-2">
                              {competitorInsights.map((c) => (
                                <div key={c.name} className="rounded bg-white p-3 shadow-sm">
                                  <p className="text-xs font-semibold text-slate-600">{c.name}</p>
                                  <div className="mt-2 flex justify-between text-sm">
                                    <div>
                                      <p className="text-xs text-slate-500">Preis</p>
                                      <p className="font-semibold text-slate-900">€{c.price.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-slate-500">Verkauft</p>
                                      <p className="font-semibold text-slate-900">{c.soldUnits} Einh.</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-amber-800">Keine Konkurrenzdaten verfügbar.</p>
                          )
                        ) : (
                          <p className="text-sm text-amber-800 italic">Marktanalyse wurde von Ihrer Gruppe gekauft.</p>
                        )
                      ) : (
                        <p className="text-sm text-amber-700 italic">Es wurde keine Analyse von Ihrer Gruppe gekauft.</p>
                      )}
                    </div>
                  </details>

                  {/* Action Buttons */}
                  {(isAdmin || isSolo) && (
                    <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:gap-4">
                      <button
                        onClick={handleNextPeriod}
                        disabled={loading}
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-6 py-3 text-base font-semibold text-white shadow-md transition hover:bg-sky-700 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {loading ? "Lädt..." : "Nächste Periode starten →"}
                      </button>
                      <button
                        onClick={handleEndGame}
                        disabled={loading}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-base font-semibold text-white shadow-md transition hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        🏁 Spiel beenden
                      </button>
                    </div>
                  )}
                  
                  {!(isAdmin || isSolo) && (
                    <div className="rounded-lg border border-dashed border-amber-200 bg-amber-50 px-4 py-4 text-sm font-medium text-amber-800">
                      ⏳ Du wartest auf die Spielleitung, um die nächste Periode zu starten.
                    </div>
                  )}
                </div>
              )}
            </>
              )}
            </div>
          )}

          {!joined && (
            <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              Nach dem Beitritt siehst du hier:
              <ul className="mt-2 list-disc pl-5 text-slate-600">
                <li>Eigenes Kapital, Lager, Maschinen</li>
                <li>Entscheidungsformular pro Periode</li>
                <li>Ergebnisse deiner Gruppe nach Freigabe</li>
              </ul>
            </div>
          )}
        </div>

        <Link
          href="/"
          className="text-sm font-semibold text-sky-700 underline-offset-4 hover:underline"
        >
          Zurück zur Startseite
        </Link>
          </>
        )}
      </main>
    </>
  );
}
