"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, react/no-unescaped-entities */

import { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, addDoc, serverTimestamp, updateDoc, onSnapshot, setDoc, getDocs } from "firebase/firestore";
import { checkPinFromLocalStorage } from "@/lib/auth";
import type { GameDocument, GroupState, Machine, PeriodDecision, SpecialTask } from "@/lib/types";
import { PeriodTimer } from "@/components/PeriodTimer";
import GameAnalytics from "@/components/GameAnalytics";

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
  const [showWelcome, setShowWelcome] = useState(false);
  const [showNameInput, setShowNameInput] = useState(false);
  const [tempGroupName, setTempGroupName] = useState("");
  const [groupId, setGroupId] = useState<string | null>(null);
  const [groupData, setGroupData] = useState<GroupState | null>(null);
  const [game, setGame] = useState<GameDocument | null>(null);
  const [currentTask, setCurrentTask] = useState<SpecialTask | null>(null);
  const [storedGroupId, setStoredGroupId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSolo, setIsSolo] = useState(false);
  const [competitorInsights, setCompetitorInsights] = useState<Array<{name: string; price: number; soldUnits: number; production: number; endingInventory: number}>>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [production, setProduction] = useState(0);
  const [sellFromInventory, setSellFromInventory] = useState(0);
  const [price, setPrice] = useState(0);
  const [buyMarketAnalysis, setBuyMarketAnalysis] = useState(false);
  const [rndInvestment, setRndInvestment] = useState(0);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [machineChoice, setMachineChoice] = useState("");
  const [machineLoading, setMachineLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [currentDecision, setCurrentDecision] = useState<PeriodDecision | null>(null);
  const [otherGroups, setOtherGroups] = useState<GroupState[]>([]);
  const [showDataMenu, setShowDataMenu] = useState(false);

  const activeActions = game?.activePeriodActions;
  const showActiveActions =
    !!activeActions &&
    activeActions.period === game?.period &&
    (
      activeActions.allowMachinePurchase ||
      activeActions.demandBoost ||
      activeActions.freeMarketAnalysis ||
      activeActions.noInventoryCosts ||
      (activeActions.customEvent?.trim() ?? "") !== ""
    );

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

  // Load competitor insights when market analysis was purchased (solo & multiplayer)
  useEffect(() => {
    const loadInsights = async () => {
      if (!gameId || !groupId || !game || game.phase !== "results") return;
      const hasFreeAnalysis =
        game.activePeriodActions?.period === game.period &&
        game.activePeriodActions?.freeMarketAnalysis;
      if (!groupData?.lastResult || !(groupData.lastResult.marketAnalysisCost > 0 || hasFreeAnalysis)) return;
      setInsightsLoading(true);
      try {
        const groupsSnapshot = await getDocs(collection(db, "games", gameId, "groups"));
        const decisionsSnapshot = await getDocs(collection(db, "games", gameId, "decisions"));
        const decisionsMap: Record<string, PeriodDecision> = {};
        decisionsSnapshot.docs.forEach((d) => {
          const dd = d.data() as PeriodDecision;
          if (dd.period === game.period) {
            decisionsMap[d.id] = dd;
          }
        });

        const insights: Array<{name: string; price: number; soldUnits: number; production: number; endingInventory: number}> = [];
        groupsSnapshot.docs.forEach((docSnap) => {
          const gid = docSnap.id;
          if (gid === groupId) return; // skip self
          const data = docSnap.data() as any;
          const lr = data.lastResult;
          const dec = decisionsMap[gid];
          if (lr) {
            const price = lr.price ?? dec?.price ?? 0;
            insights.push({
              name: data.name || `Gruppe ${gid.substring(0, 4)}`,
              price,
              soldUnits: lr.soldUnits || 0,
              production: dec?.production ?? 0,
              endingInventory: lr.endingInventory ?? (data.inventory ?? 0),
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
  }, [gameId, groupId, game?.phase, game?.activePeriodActions?.freeMarketAnalysis, game?.activePeriodActions?.period, game?.period, groupData?.lastResult?.marketAnalysisCost]);

  // Load current decision for results display
  useEffect(() => {
    const loadDecision = async () => {
      if (!gameId || !groupId || !game || game.phase !== "results") return;
      try {
        const decisionDoc = await getDoc(doc(db, "games", gameId, "decisions", groupId));
        if (decisionDoc.exists()) {
          setCurrentDecision(decisionDoc.data() as PeriodDecision);
        }
      } catch (err) {
        console.error("Error loading decision:", err);
      }
    };
    loadDecision();
  }, [gameId, groupId, game?.phase]);

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

  // Load all groups in the game (for lobby view and other groups status)
  useEffect(() => {
    if (!gameId) return;

    const unsubscribeGroups = onSnapshot(
      collection(db, "games", gameId, "groups"),
      (snapshot) => {
        const allGroups = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as GroupState));
        setOtherGroups(allGroups);
      }
    );

    return () => unsubscribeGroups();
  }, [gameId]);

  // Listen to group data changes
  useEffect(() => {
    if (!gameId || !groupId) return;

    const groupRef = doc(db, "games", gameId, "groups", groupId);
    const unsubscribe = onSnapshot(groupRef, (snapshot) => {
      if (snapshot.exists()) {
        const newData = { id: snapshot.id, ...snapshot.data() } as unknown as GroupState;
        console.log(`[Listener] Group data updated: period=${newData.lastResult?.period}, capital=${newData.capital}`);
        
        // Don't override during calculation to prevent race conditions
        if (!calculating) {
          setGroupData(newData);
        } else {
          console.log(`[Listener] Skipping update during calculation`);
        }
      }
    });

    return () => unsubscribe();
  }, [gameId, groupId, calculating]);

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
        name: "", // Wird später beim Name-Input gesetzt
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
      setShowWelcome(true);
      setShowNameInput(false);
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
      setShowWelcome(true);
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
        rndInvestment,
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
    if (!groupId || !gameId || !machineChoice || !groupData) return;
    setMachineLoading(true);
    setError("");
    try {
      const selectedMachine = MACHINE_OPTIONS.find(m => m.name === machineChoice);
      if (!selectedMachine) throw new Error("Maschine nicht gefunden");

      // Zusätzlicher Kauf in laufender Periode
      const isAdditionalPurchase = game?.phase !== "machine_selection";

      if (isAdditionalPurchase) {
        const newCapital = groupData.capital - selectedMachine.cost;
        if (newCapital < 0) {
          throw new Error("Nicht genug Kapital für den Maschinenkauf.");
        }

        await updateDoc(doc(db, "games", gameId, "groups", groupId), {
          machines: [...groupData.machines, selectedMachine],
          capital: newCapital,
        });
        return;
      }
      
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex gap-4">
              <div className="text-5xl flex-shrink-0">📋</div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-amber-900 mb-4">Spezialauftrag</h1>
                <h2 className="text-2xl font-semibold text-amber-800 mb-6">{currentTask.title}</h2>
                <div className="prose prose-sm max-w-none mb-8">
                  <p className="text-base text-neutral-700 whitespace-pre-wrap leading-relaxed">
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

      {/* Game Instructions Modal - Shows once at game start */}
      {joined && 
       groupData && 
       game?.status === "in_progress" && 
       !groupData.instructionsAcknowledged && 
       !currentTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl bg-gradient-to-br from-neutral-50 to-white p-8 shadow-2xl my-8 max-h-[90vh] overflow-y-auto border-2 border-neutral-200">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">🎯</div>
              <h1 className="text-3xl font-bold text-neutral-900 mb-2">Willkommen zu MarktMatch!</h1>
              <p className="text-lg text-neutral-600">Digitales Unternehmensplanspiel</p>
            </div>

            <div className="space-y-6 text-left">
              <div className="rounded-lg bg-white p-5 shadow-sm border border-neutral-200">
                <h2 className="text-xl font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                  <span className="text-2xl">🏭</span>
                  Spielziel
                </h2>
                <p className="text-neutral-700 leading-relaxed">
                  Führt euer Unternehmen zum Erfolg! Trefft kluge Entscheidungen über <strong>Produktion</strong>, <strong>Preise</strong> und <strong>Investitionen</strong>. Euer Ziel: Am Ende des Spiels das meiste Kapital erwirtschaften.
                </p>
              </div>

              <div className="rounded-lg bg-white p-5 shadow-sm border border-neutral-200">
                <h2 className="text-xl font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                  <span className="text-2xl">⚙️</span>
                  Spielablauf
                </h2>
                <ul className="space-y-2 text-neutral-700">
                  <li className="flex gap-2">
                    <span className="font-semibold text-neutral-600">1.</span>
                    <span><strong>Maschinenauswahl:</strong> Wählt eure Produktionsmaschine (Balance zwischen Kosten und Kapazität)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-neutral-600">2.</span>
                    <span><strong>Entscheidungen:</strong> Jede Periode legt ihr Produktionsmenge, Verkaufspreis und optionale Investitionen fest</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="font-semibold text-neutral-600">3.</span>
                    <span><strong>Ergebnisse:</strong> Seht eure Verkaufszahlen, Gewinn und aktuelle Marktposition</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-lg bg-white p-5 shadow-sm border border-neutral-200">
                <h2 className="text-xl font-semibold text-neutral-900 mb-3 flex items-center gap-2">
                  <span className="text-2xl">💡</span>
                  Wichtige Hinweise
                </h2>
                <ul className="space-y-2 text-neutral-700">
                  <li className="flex gap-2">
                    <span>•</span>
                    <span><strong>Marktanalyse</strong> (optional): Zeigt euch Preise, Verkäufe, Produktion und Lagerbestand der Konkurrenz</span>
                  </li>
                  <li className="flex gap-2">
                    <span>•</span>
                    <span><strong>Lager:</strong> Unverkaufte Produkte lagert ihr für die nächste Periode (Lagerkosten beachten!)</span>
                  </li>
                  <li className="flex gap-2">
                    <span>•</span>
                    <span><strong>Negativzinsen:</strong> Bei negativem Kapital fallen Zinsen an</span>
                  </li>
                  <li className="flex gap-2">
                    <span>•</span>
                    <span><strong>Spezialaufträge:</strong> Die Spielleitung kann jederzeit besondere Aufgaben verteilen</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-lg bg-gradient-to-r from-emerald-100 to-emerald-50 p-5 border-2 border-emerald-300">
                <p className="text-center text-emerald-900 font-semibold">
                  🚀 Bereit? Klickt auf "Verstanden" und wählt eure Maschine aus!
                </p>
              </div>
            </div>

            <button
              onClick={async () => {
                if (!gameId || !groupId) return;
                try {
                  await updateDoc(doc(db, "games", gameId, "groups", groupId), {
                    instructionsAcknowledged: true,
                  });
                } catch (err) {
                  console.error("Error acknowledging instructions:", err);
                }
              }}
              className="mt-6 w-full rounded-lg bg-neutral-600 px-6 py-4 text-lg font-semibold text-white shadow-lg transition hover:bg-neutral-700 focus:outline-none focus:ring-4 focus:ring-neutral-200"
            >
              ✓ Verstanden, los geht's!
            </button>
          </div>
        </div>
      )}

      <main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-14 sm:px-10">
        {/* Only show rest of UI if no special task is active */}
        {!currentTask && (
          <>
            <div className="flex flex-col gap-2">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-neutral-600">Gruppe</p>
              <h1 className="text-3xl font-semibold text-neutral-900 sm:text-4xl">
                {joined && groupData ? groupData.name : "Mit Code einer Lobby beitreten"}
              </h1>
              <p className="text-base text-neutral-600">
                {joined && groupData
                  ? `Kapital: €${groupData.capital.toLocaleString("de-DE")}`
                  : "Gib die Gruppen-PIN ein, die du von der Spielleitung erhalten hast. Du siehst nur die Daten deiner eigenen Gruppe."}
              </p>
            </div>

            {showActiveActions && activeActions && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Aktionen dieser Periode</p>
                    <h3 className="text-lg font-semibold text-amber-900">⚡ Sonderregeln aktiv</h3>
                  </div>
                  <span className="text-xs font-semibold text-amber-800">Nur Periode {game?.period}</span>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-amber-900">
                  {activeActions.allowMachinePurchase && (
                    <div className="flex items-start gap-2">
                      <span>🏭</span>
                      <span>Maschinenkauf ist in dieser Periode erlaubt.</span>
                    </div>
                  )}
                  {activeActions.demandBoost && (
                    <div className="flex items-start gap-2">
                      <span>📈</span>
                      <span>Nachfrage +30% (Sonderimpuls vom Spielleiter).</span>
                    </div>
                  )}
                  {activeActions.freeMarketAnalysis && (
                    <div className="flex items-start gap-2">
                      <span>📊</span>
                      <span>Marktanalyse ist kostenlos und automatisch für alle freigeschaltet.</span>
                    </div>
                  )}
                  {activeActions.noInventoryCosts && (
                    <div className="flex items-start gap-2">
                      <span>📦</span>
                      <span>Keine Lagerkosten in dieser Periode.</span>
                    </div>
                  )}
                  {activeActions.customEvent?.trim() && (
                    <div className="flex items-start gap-2">
                      <span>💬</span>
                      <span className="whitespace-pre-wrap">{activeActions.customEvent}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

        <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-neutral-200">
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
              <label className="flex flex-col gap-2 text-sm text-neutral-700">
                Gruppen-PIN (5 Zeichen)
                <input
                  type="text"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.toUpperCase())}
                  placeholder="PIN aus QR-Code oder manuell eingeben"
                  maxLength={5}
                  disabled={joined}
                  className="rounded-lg border border-neutral-200 px-3 py-2 text-base text-neutral-900 shadow-sm focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200 disabled:bg-neutral-100 disabled:cursor-not-allowed"
                />
              </label>
              <label className="flex flex-col gap-2 text-sm text-neutral-700">
                Anzeigename der Gruppe
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="z.B. Team Alpha"
                  disabled={joined}
                  className="rounded-lg border border-neutral-200 px-3 py-2 text-base text-neutral-900 shadow-sm focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200 disabled:bg-neutral-100 disabled:cursor-not-allowed"
                />
              </label>
              <p className="text-xs text-neutral-500">
                Deine Entscheidungen bleiben privat. Marktanalysen werden nur angezeigt, wenn deine
                Gruppe sie gekauft hat.
              </p>
              <button
                type="submit"
                disabled={loading || joined}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-neutral-200"
              >
                {joined ? "Beitritt erfolgreich" : loading ? "Wird beigetreten..." : "Beitreten"}
              </button>
            </form>
          )}

          {joined && (
            <div className="flex flex-col gap-4">
              {/* Welcome Screen - show right after joining */}
              {showWelcome && !showNameInput && (
                <div className="rounded-2xl border-3 border-blue-400 bg-gradient-to-br from-blue-50 to-sky-50 p-8 shadow-lg">
                  <div className="space-y-6">
                    {/* Header */}
                    <div className="text-center space-y-3">
                      <div className="text-5xl">🎉</div>
                      <h2 className="text-3xl font-bold text-neutral-900">Willkommen zu Markt-Match 5!</h2>
                    </div>

                    {/* Game Description */}
                    <div className="rounded-lg bg-white p-6 border border-blue-200 space-y-3">
                      <h3 className="text-lg font-bold text-neutral-900">📊 Das Spiel in 30 Sekunden:</h3>
                      <ul className="space-y-2 text-sm text-neutral-700">
                        <li className="flex items-start gap-3">
                          <span className="text-lg">🏭</span>
                          <span><strong>Unternehmen gründen:</strong> Ihr kauft Maschinen und produziert.</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="text-lg">💰</span>
                          <span><strong>Strategie treffen:</strong> Preis, Menge, Marketing – Ihr entscheidet!</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="text-lg">🎯</span>
                          <span><strong>Konkurrieren:</strong> Mehrere Teams am Markt = Wettbewerb um Kunden.</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="text-lg">📈</span>
                          <span><strong>Gewinn maximieren:</strong> Beste Strategie + Taktik gewinnt!</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="text-lg">🏢</span>
                          <span><strong>Nächster Schritt:</strong> Gebt eurem Unternehmen einen Namen!</span>
                        </li>
                      </ul>
                    </div>

                    {/* Action Button */}
                    <div className="text-center">
                      <button
                        onClick={() => setShowNameInput(true)}
                        className="inline-block rounded-lg bg-blue-600 px-8 py-3 text-lg font-bold text-white hover:bg-blue-700 transition shadow-md"
                      >
                        🚀 Spiel starten
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Name Input Screen - show after "Spiel starten" click */}
              {showWelcome && showNameInput && (
                <div className="rounded-2xl border-3 border-blue-400 bg-gradient-to-br from-blue-50 to-sky-50 p-8 shadow-lg">
                  <div className="space-y-6">
                    {/* Header */}
                    <div className="text-center space-y-3">
                      <div className="text-4xl">🏢</div>
                      <h2 className="text-2xl font-bold text-neutral-900">Gründet euer Unternehmen!</h2>
                      <p className="text-sm text-neutral-600">Wie soll euer Unternehmen heißen?</p>
                    </div>

                    {/* Name Input Form */}
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!tempGroupName.trim()) {
                          setError("Bitte gebt einen Namen ein!");
                          return;
                        }
                        try {
                          setLoading(true);
                          if (groupId) {
                            await updateDoc(doc(db, "games", gameId, "groups", groupId), {
                              name: tempGroupName.trim(),
                              status: "ready",
                              updatedAt: serverTimestamp(),
                            });
                            setGroupName(tempGroupName.trim());
                            setShowWelcome(false);
                          }
                        } catch (err) {
                          setError("Fehler beim Speichern des Namens");
                          console.error(err);
                        } finally {
                          setLoading(false);
                        }
                      }}
                      className="space-y-4"
                    >
                      <div className="bg-white rounded-lg p-6 space-y-3">
                        <label className="block text-sm font-semibold text-neutral-900">
                          Unternehmensname
                        </label>
                        <input
                          type="text"
                          value={tempGroupName}
                          onChange={(e) => setTempGroupName(e.target.value)}
                          placeholder="z.B. TechWave AG, InnovateTech, ..."
                          maxLength={50}
                          className="w-full px-4 py-3 rounded-lg border border-neutral-300 bg-neutral-50 text-neutral-900 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                        <p className="text-xs text-neutral-500">
                          {tempGroupName.length} / 50 Zeichen
                        </p>
                      </div>

                      {error && (
                        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200">
                          {error}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={loading || !tempGroupName.trim()}
                        className="w-full rounded-lg bg-green-600 px-6 py-3 text-lg font-bold text-white hover:bg-green-700 transition shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {loading ? "Wird gespeichert..." : "✓ Bereit - Spiel starten"}
                      </button>

                      <p className="text-xs text-neutral-600 text-center">
                        Nach Eingabe des Namens wirst du automatisch weitergeleitet.
                      </p>
                    </form>
                  </div>
                </div>
              )}

              {/* Waiting for Game to Start - with Lobby Info */}
              {!showWelcome && (game?.status === "lobby" || !game) && (
                <div className="flex flex-col gap-4">
                  {/* Lobby Status Card */}
                  <div className="flex flex-col gap-4 rounded-lg border border-neutral-200 bg-neutral-50 p-6 text-center">
                    <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-600"></div>
                    <h3 className="text-lg font-semibold text-neutral-900">
                      Warte auf Spielstart
                    </h3>
                    <p className="text-sm text-neutral-600">
                      Die Spielleitung startet das Spiel gleich. Du wirst automatisch weitergeleitet.
                    </p>
                    <p className="text-xs text-neutral-500">
                      Aktueller Status: {game ? (game.status === "lobby" ? "Warte auf Spielstart" : "Lädt...") : "Lädt..."}
                    </p>
                    <button
                      onClick={handleReadyClick}
                      disabled={loading || groupData?.status === "ready"}
                      className="mt-2 inline-flex items-center justify-center rounded-lg bg-neutral-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {groupData?.status === "ready" ? "✓ Bereit" : loading ? "Wird gespeichert..." : "Bereit"}
                    </button>
                  </div>

                  {/* Groups in Lobby */}
                  {game?.status === "lobby" && (
                    <div className="rounded-lg border border-neutral-200 bg-white p-6">
                      <h4 className="text-sm font-semibold text-neutral-900 mb-3">👥 Gruppen in der Lobby ({otherGroups.length})</h4>
                      <div className="space-y-2">
                        {otherGroups.map((grp) => (
                          <div key={grp.id} className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 bg-neutral-50">
                            <span className="text-sm font-medium text-neutral-900">{grp.name}</span>
                            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                              grp.status === "ready" 
                                ? "bg-emerald-100 text-emerald-800" 
                                : "bg-amber-100 text-amber-800"
                            }`}>
                              {grp.status === "ready" ? "✓ Bereit" : "⏳ Wartet"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Game Content - only show when game exists and welcome dismissed */}
              {game && !showWelcome && (
                <>
                  {/* Machine Selection / Zusatzkauf */}
                  {(game?.phase === "machine_selection" || game?.allowMachinePurchase) &&
                    groupData &&
                    groupData.status !== "submitted" && (
                      <div className="flex flex-col gap-4 rounded-lg border border-neutral-200 bg-white p-6">
                        <div>
                          <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                            Produktionsmaschine auswählen
                          </h3>
                          <p className="text-sm text-neutral-600">
                            Wähle eine Produktionsmaschine für dein Unternehmen. Diese Entscheidung beeinflusst deine Produktionskapazität und Kostenstruktur.
                            {game?.phase !== "machine_selection" ? " (Zusätzlicher Kauf in dieser Periode)" : ""}
                          </p>
                        </div>

                        <div className="grid gap-4 grid-cols-1">
                          {MACHINE_OPTIONS.map((m) => (
                            <label
                              key={m.name}
                              className={`flex cursor-pointer flex-col gap-3 rounded-lg border-2 p-4 transition ${
                                machineChoice === m.name
                                  ? "border-neutral-500 bg-neutral-50 ring-2 ring-neutral-200"
                                  : "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50"
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
                                    className="accent-neutral-600 mt-1"
                                  />
                                  <div>
                                    <p className="font-semibold text-neutral-900">{m.name}</p>
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-2 rounded-lg bg-neutral-50 p-3 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-neutral-600">Einmalige Anschaffungskosten:</span>
                              <span className="font-semibold text-neutral-900">
                                €{m.cost.toLocaleString("de-DE")}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-neutral-600">Maximale Produktionskapazität:</span>
                              <span className="font-semibold text-neutral-900">
                                {m.capacity} Einheiten/Periode
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-neutral-600">Produktionskosten pro Einheit:</span>
                              <span className="font-semibold text-neutral-900">
                                €{m.variableCostPerUnit.toLocaleString("de-DE")}
                              </span>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>

                    <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
                      <p className="text-sm text-neutral-700 mb-1">
                        <span className="font-semibold">Verfügbares Kapital:</span>
                      </p>
                      <p className="text-2xl font-bold text-neutral-900">
                        €{groupData ? groupData.capital.toLocaleString("de-DE") : "0"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleMachineSelect}
                      disabled={machineLoading || !machineChoice}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-6 py-3 text-base font-semibold text-white shadow-md transition hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {machineLoading
                        ? "Maschine wird gekauft..."
                        : game?.phase === "machine_selection"
                        ? "Maschine kaufen & starten"
                        : "Maschine kaufen"}
                    </button>
                  </div>
                )}

              {/* Machine purchased and waiting */}
              {game && game.phase === "machine_selection" &&
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
                      <div className="rounded-lg bg-white p-4 text-sm text-neutral-800 shadow-sm">
                        <p className="font-semibold">Deine Maschine</p>
                        <p className="mt-1">{groupData.machines[0].name}</p>
                        <p className="text-neutral-600">
                          Kapazität: {groupData.machines[0].capacity} Einheiten/Periode · Variable Kosten: €{groupData.machines[0].variableCostPerUnit.toLocaleString("de-DE")}
                        </p>
                      </div>
                    )}
                  </div>
                )}

              {/* Decisions Phase */}
              {game && game.phase === "decisions" &&
                groupData &&
                groupData.status !== "submitted" && (
                  <>
                    {/* Timer-Anzeige */}
                    {game?.periodDeadline && (
                      <div className="mb-4">
                        <PeriodTimer deadline={game.periodDeadline} />
                      </div>
                    )}

                    {/* Eingeklapptes Datenmenü */}
                    <div className="mb-4 rounded-lg border border-neutral-200 bg-white p-4">
                      <button
                        onClick={() => setShowDataMenu(!showDataMenu)}
                        className="flex w-full items-center justify-between text-left"
                      >
                        <h3 className="text-base font-semibold text-neutral-900">
                          {showDataMenu ? "▼" : "▶"} 📊 Meine Daten einsehen
                        </h3>
                      </button>
                      
                      {showDataMenu && groupData && (
                        <div className="mt-4 space-y-4">
                          {/* Aktueller Status */}
                          <div className="rounded-lg bg-neutral-50 p-4 border border-neutral-200">
                            <h4 className="text-sm font-semibold text-neutral-900 mb-2">💰 Finanzen</h4>
                            <div className="space-y-1 text-sm">
                              <p className="flex justify-between">
                                <span className="text-neutral-700">Kapital:</span>
                                <span className="font-semibold text-neutral-900">€{groupData.capital.toLocaleString("de-DE")}</span>
                              </p>
                              <p className="flex justify-between">
                                <span className="text-neutral-700">Kumulierter Gewinn:</span>
                                <span className={`font-semibold ${groupData.cumulativeProfit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                                  €{groupData.cumulativeProfit.toLocaleString("de-DE")}
                                </span>
                              </p>
                            </div>
                          </div>

                          {/* Lager & Produktion */}
                          <div className="rounded-lg bg-amber-50 p-4 border border-amber-200">
                            <h4 className="text-sm font-semibold text-amber-900 mb-2">📦 Lager & Produktion</h4>
                            <div className="space-y-1 text-sm">
                              <p className="flex justify-between">
                                <span className="text-neutral-700">Lagerbestand:</span>
                                <span className="font-semibold text-neutral-900">{Math.floor(groupData.inventory ?? 0).toLocaleString("de-DE")} Einheiten</span>
                              </p>
                              <p className="flex justify-between">
                                <span className="text-neutral-700">Produktionskapazität:</span>
                                <span className="font-semibold text-neutral-900">
                                  {groupData.machines.reduce((sum, m) => sum + m.capacity, 0)} Einheiten
                                </span>
                              </p>
                            </div>
                          </div>

                          {/* Letzte Periode */}
                          {groupData.lastResult && (
                            <div className="rounded-lg bg-purple-50 p-4 border border-purple-200">
                              <h4 className="text-sm font-semibold text-purple-900 mb-2">📈 Letzte Periode</h4>
                              <div className="space-y-1 text-sm">
                                <p className="flex justify-between">
                                  <span className="text-neutral-700">Verkaufte Menge:</span>
                                  <span className="font-semibold text-neutral-900">{Math.floor(groupData.lastResult?.soldUnits ?? 0).toLocaleString("de-DE")} Einheiten</span>
                                </p>
                                <p className="flex justify-between">
                                  <span className="text-neutral-700">Umsatz:</span>
                                  <span className="font-semibold text-neutral-900">€{groupData.lastResult.revenue.toLocaleString("de-DE")}</span>
                                </p>
                                <p className="flex justify-between">
                                  <span className="text-neutral-700">Gewinn:</span>
                                  <span className={`font-semibold ${groupData.lastResult.profit >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                                    €{groupData.lastResult.profit.toLocaleString("de-DE")}
                                  </span>
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Maschinen */}
                          <div className="rounded-lg bg-neutral-50 p-4 border border-neutral-200">
                            <h4 className="text-sm font-semibold text-neutral-900 mb-2">⚙️ Maschinen</h4>
                            <div className="space-y-2">
                              {groupData.machines.map((m, idx) => (
                                <div key={idx} className="text-xs bg-white p-2 rounded border border-neutral-200">
                                  <p className="font-semibold text-neutral-900">{m.name}</p>
                                  <p className="text-neutral-600">
                                    Kapazität: {m.capacity} | Variable Kosten: €{m.variableCostPerUnit}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <form onSubmit={handleDecisionSubmit} className="flex flex-col gap-4 rounded-lg border border-neutral-200 bg-white p-6">
                      <div>
                        <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                          Entscheidungen Periode {game?.period}
                        </h3>
                        <p className="text-sm text-neutral-600 leading-relaxed">
                          Trefft eure strategischen Entscheidungen für diese Periode. Bestimmt die <strong>Produktionsmenge</strong>, die <strong>Verkaufsmengen aus dem Lager</strong> und den <strong>Verkaufspreis</strong>. Optional könnt ihr auch eine <strong>Marktanalyse</strong> kaufen, um mehr über die Konkurrenz zu erfahren.
                        </p>
                      </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="flex flex-col gap-1 text-sm text-neutral-700">
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
                          className="rounded-lg border border-neutral-200 px-3 py-2 text-base shadow-sm focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                        />
                        <span className="text-xs text-neutral-500">
                          Max: {groupData?.machines?.reduce((sum, m) => sum + m.capacity, 0) || 0}{" "}
                          (Kapazität)
                        </span>
                      </label>
                      <label className="flex flex-col gap-1 text-sm text-neutral-700">
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
                          className="rounded-lg border border-neutral-200 px-3 py-2 text-base shadow-sm focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                        />
                        <span className="text-xs text-neutral-500">
                          Lagerbestand: {groupData?.inventory || 0}
                        </span>
                      </label>
                      <label className="flex flex-col gap-1 text-sm text-neutral-700">
                        Verkaufspreis (€)
                        <input
                          type="number"
                          value={price === 0 ? "" : price}
                          onChange={(e) =>
                            setPrice(e.target.value === "" ? 0 : Number(e.target.value))
                          }
                          min={0}
                          step={0.5}
                          className="rounded-lg border border-neutral-200 px-3 py-2 text-base shadow-sm focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-200"
                        />
                      </label>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-neutral-700">
                      <input
                        type="checkbox"
                        checked={buyMarketAnalysis}
                        onChange={(e) => setBuyMarketAnalysis(e.target.checked)}
                        className="accent-neutral-600"
                      />
                      Marktanalyse kaufen (€{game.parameters.marketAnalysisCost})
                    </label>

                    {/* F&E-Investitionen (ab Periode 3, falls aktiviert) */}
                    {game.parameters.isRndEnabled && game.period >= 3 && (
                      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                        <label className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-blue-900">
                              🔬 Forschungs- & Entwicklungs-Investition
                            </span>
                            {groupData?.rndBenefitApplied && (
                              <span className="text-xs font-bold bg-emerald-500 text-white px-2 py-1 rounded">
                                ✓ Vorteil aktiv (-{Math.round(game.parameters.rndVariableCostReduction * 100)}% Kosten)
                              </span>
                            )}
                          </div>
                          <input
                            type="number"
                            value={rndInvestment === 0 ? "" : rndInvestment}
                            onChange={(e) =>
                              setRndInvestment(
                                e.target.value === "" ? 0 : Number(e.target.value)
                              )
                            }
                            min={0}
                            step={100}
                            placeholder="€0 (optional)"
                            className="rounded-lg border border-blue-300 px-3 py-2 text-base shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          />
                          <p className="text-xs text-blue-800">
                            <strong>Schwelle:</strong> €{game.parameters.rndBenefitThreshold.toLocaleString("de-DE")} 
                            {groupData && (
                              <>
                                {" - "}<strong>Bisher investiert:</strong> €{groupData.cumulativeRndInvestment.toLocaleString("de-DE")} ({Math.round((groupData.cumulativeRndInvestment / game.parameters.rndBenefitThreshold) * 100)}%)
                              </>
                            )}
                          </p>
                          <p className="text-xs text-blue-800 leading-relaxed">
                            💡 Wenn ihr die Schwelle erreicht, sinken eure Produktionskosten dauerhaft um {Math.round(game.parameters.rndVariableCostReduction * 100)}%. Ein Investment in Innovation lohnt sich!
                          </p>
                        </label>
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={decisionLoading}
                      className="inline-flex w-fit items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {decisionLoading ? "Wird eingereicht..." : "Entscheidungen einreichen"}
                    </button>
                  </form>
                  </>
                )}

              {/* Waiting for Other Groups After Decision Submitted */}
              {game && game.phase === "decisions" && groupData?.status === "submitted" && (
                <div className="flex flex-col gap-4">
                  {/* Timer-Anzeige auch nach Submission */}
                  {game?.periodDeadline && (
                    <PeriodTimer deadline={game.periodDeadline} />
                  )}

                  <div className="flex flex-col gap-4 rounded-lg border border-neutral-200 bg-neutral-50 p-6 text-center">
                    <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600"></div>
                    <h3 className="text-lg font-semibold text-neutral-900">
                      Warte auf andere Gruppen und Spielleitung
                    </h3>
                    <p className="text-sm text-neutral-600">
                      Deine Entscheidungen sind eingereicht. Bitte warte, bis alle Gruppen fertig sind und die Spielleitung die Periode fortsetzt.
                    </p>
                  </div>

                  {/* Groups Status */}
                  <div className="rounded-lg border border-neutral-200 bg-white p-6">
                    <h4 className="text-sm font-semibold text-neutral-900 mb-3">📊 Status aller Gruppen</h4>
                    <div className="space-y-2">
                      {otherGroups.map((grp) => (
                        <div key={grp.id} className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 bg-neutral-50">
                          <div>
                            <span className="text-sm font-medium text-neutral-900">{grp.name}</span>
                            {grp.id === groupId && <span className="text-xs text-neutral-600 ml-2">(Du)</span>}
                          </div>
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                            grp.status === "submitted" 
                              ? "bg-emerald-100 text-emerald-800" 
                              : "bg-amber-100 text-amber-800"
                          }`}>
                            {grp.status === "submitted" ? "✓ Eingereicht" : "⏳ Wartet"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Waiting for Results (hide when results available) */}
              {game && game.phase === "results" && (!groupData?.lastResult || groupData.lastResult.period !== game.period) && (
                  <div className="flex flex-col gap-4 rounded-lg border border-neutral-200 bg-white p-6 text-center">
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
                            <h3 className="text-lg font-semibold text-neutral-800">
                              Berechnung läuft...
                            </h3>
                            <p className="text-sm text-neutral-600">
                              Die KI-Gegner haben ihre Entscheidungen getroffen. Die Marktberechnung wird durchgeführt.
                            </p>
                            <p className="text-xs text-neutral-500">
                              Dies kann einige Sekunden dauern...
                            </p>
                            <button
                              onClick={async () => {
                                setLoading(true);
                                try {
                                  // Force-refresh group data from Firestore
                                  const groupDoc = await getDoc(doc(db, "games", gameId, "groups", groupId!));
                                  if (groupDoc.exists()) {
                                    const refreshedData = { id: groupDoc.id, ...groupDoc.data() } as GroupState;
                                    console.log(`[Manual] Refreshed group data: period=${refreshedData.lastResult?.period}, game.period=${game.period}`);
                                    setGroupData(refreshedData);
                                    setCalculating(false);
                                  }
                                } catch (err: any) {
                                  console.error("Error refreshing results:", err);
                                  setError(`Fehler beim Laden: ${err.message}`);
                                } finally {
                                  setLoading(false);
                                }
                              }}
                              disabled={loading}
                              className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-6 py-3 text-base font-semibold text-white shadow-md transition hover:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              {loading ? "Lädt..." : "⏩ Zu den Ergebnissen"}
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                              <svg className="h-6 w-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                            <h3 className="text-lg font-semibold text-neutral-800">
                              Berechnung der Periode {game.period} abgeschlossen
                            </h3>
                            <p className="text-sm text-neutral-600">
                              Alle Gruppen haben ihre Entscheidungen eingereicht und die Marktberechnung ist fertig.
                            </p>
                            {isSolo && (
                              <button
                                onClick={async () => {
                                  setLoading(true);
                                  try {
                                    // Force-refresh group data from Firestore
                                    const groupDoc = await getDoc(doc(db, "games", gameId, "groups", groupId!));
                                    if (groupDoc.exists()) {
                                      const refreshedData = { id: groupDoc.id, ...groupDoc.data() } as GroupState;
                                      console.log(`[Manual] Refreshed group data: period=${refreshedData.lastResult?.period}, game.period=${game.period}`);
                                      setGroupData(refreshedData);
                                      
                                      // If still no matching result, force recalculation
                                      if (!refreshedData.lastResult || refreshedData.lastResult.period !== game.period) {
                                        console.log(`[Manual] No valid results found, triggering recalculation...`);
                                        setCalculating(true);
                                        setLoading(false);
                                      }
                                    }
                                  } catch (err: any) {
                                    console.error("Error refreshing results:", err);
                                    setError(`Fehler beim Laden: ${err.message}`);
                                  } finally {
                                    setLoading(false);
                                  }
                                }}
                                disabled={loading}
                                className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-600 px-6 py-3 text-base font-semibold text-white shadow-md transition hover:bg-neutral-700 disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                {loading ? "Lädt..." : "📊 Zu den Ergebnissen"}
                              </button>
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}

              {/* Show results if available */}
              {groupData?.lastResult && game.phase === "results" && groupData.lastResult.period === game.period && (
                <div className="flex flex-col gap-4">
                  {/* 1. Box: Group Results (Collapsible) */}
                  <details className="rounded-lg border border-neutral-200 bg-white shadow-sm">
                    <summary className="cursor-pointer p-4 font-semibold text-neutral-900 hover:bg-neutral-50 transition rounded-lg flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span>📈</span>
                        <span>Ergebnisse der Gruppe "{groupData.name}"</span>
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                          Periode {groupData.lastResult.period}
                        </span>
                        <span className="text-xs font-normal text-neutral-700">▼ einklappen</span>
                      </span>
                    </summary>
                    <div className="p-4 pt-2">
                      {/* Results Table - Clean and Professional */}
                      <div className="border border-neutral-200 rounded-lg overflow-hidden">
                        <table className="w-full">
                          <tbody>
                            {/* Produzierte Einheiten */}
                            <tr className="border-b border-neutral-200">
                              <td className="px-4 py-3 text-sm font-medium text-neutral-600 bg-white">Produzierte Einheiten</td>
                              <td className="px-4 py-3 text-sm font-bold text-neutral-900 bg-white text-right">{currentDecision?.production || 0}</td>
                            </tr>
                            
                            {/* Verkaufspreis */}
                            <tr className="border-b border-neutral-200">
                              <td className="px-4 py-3 text-sm font-medium text-neutral-600 bg-neutral-50">Verkaufspreis</td>
                              <td className="px-4 py-3 text-sm font-bold text-neutral-900 bg-neutral-50 text-right">€{currentDecision?.price?.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}</td>
                            </tr>
                            
                            {/* Verkaufte Einheiten */}
                            <tr className="border-b border-neutral-200">
                              <td className="px-4 py-3 text-sm font-medium text-neutral-600 bg-white">Verkaufte Einheiten</td>
                              <td className="px-4 py-3 text-sm font-bold text-neutral-900 bg-white text-right">{groupData.lastResult.soldUnits}</td>
                            </tr>
                            
                            {/* Umsatz */}
                            <tr className="border-b border-neutral-200">
                              <td className="px-4 py-3 text-sm font-medium text-neutral-600 bg-neutral-50">Umsatz</td>
                              <td className="px-4 py-3 text-sm font-bold text-neutral-900 bg-neutral-50 text-right">€{groupData.lastResult.revenue.toLocaleString("de-DE")}</td>
                            </tr>
                            <tr className="border-b border-neutral-200">
                              <td className="px-4 py-1 text-xs text-neutral-500 bg-neutral-50"></td>
                              <td className="px-4 py-1 text-xs text-neutral-500 bg-neutral-50 text-right">({groupData.lastResult.soldUnits} × €{currentDecision?.price?.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"})</td>
                            </tr>
                            
                            {/* Gesamtkosten */}
                            <tr className="border-b border-neutral-200">
                              <td className="px-4 py-3 text-sm font-medium text-neutral-600 bg-white">Gesamtkosten</td>
                              <td className="px-4 py-3 text-sm font-bold text-neutral-900 bg-white text-right">€{groupData.lastResult.totalCosts.toLocaleString("de-DE")}</td>
                            </tr>
                            <tr className="border-b border-neutral-200">
                              <td className="px-4 py-1 text-xs text-neutral-500 bg-white"></td>
                              <td className="px-4 py-1 text-xs text-neutral-500 bg-white text-right">(Produktion: €{groupData.lastResult.variableCosts?.toLocaleString("de-DE") || "0"} + Lager: €{groupData.lastResult.inventoryCost?.toLocaleString("de-DE") || "0"})</td>
                            </tr>
                            
                            {/* Gewinn / Verlust */}
                            <tr className="border-b border-neutral-200">
                              <td className="px-4 py-3 text-sm font-medium text-neutral-600 bg-neutral-50">Gewinn / Verlust</td>
                              <td className={`px-4 py-3 text-sm font-bold bg-neutral-50 text-right ${groupData.lastResult.profit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                €{groupData.lastResult.profit.toLocaleString("de-DE")}
                              </td>
                            </tr>
                            <tr className="border-b border-neutral-200">
                              <td className="px-4 py-1 text-xs text-neutral-500 bg-neutral-50"></td>
                              <td className="px-4 py-1 text-xs text-neutral-500 bg-neutral-50 text-right">(€{groupData.lastResult.revenue.toLocaleString("de-DE")} - €{groupData.lastResult.totalCosts.toLocaleString("de-DE")})</td>
                            </tr>
                            
                            {/* Neues Kapital */}
                            <tr className="border-b border-neutral-200">
                              <td className="px-4 py-3 text-sm font-medium text-neutral-600 bg-white">Neues Kapital</td>
                              <td className="px-4 py-3 text-sm font-bold text-neutral-900 bg-white text-right">€{groupData.lastResult.endingCapital.toLocaleString("de-DE")}</td>
                            </tr>
                            
                            {/* Neuer Lagerbestand */}
                            <tr className="border-b border-neutral-200">
                              <td className="px-4 py-3 text-sm font-medium text-neutral-600 bg-neutral-50">Neuer Lagerbestand</td>
                              <td className="px-4 py-3 text-sm font-bold text-neutral-900 bg-neutral-50 text-right">{groupData.lastResult.endingInventory} Einh.</td>
                            </tr>
                            
                            {/* Kumulierter Gewinn */}
                            <tr>
                              <td className="px-4 py-3 text-sm font-medium text-neutral-600 bg-white">Kumulierter Gewinn</td>
                              <td className={`px-4 py-3 text-sm font-bold bg-white text-right ${groupData.cumulativeProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                €{groupData.cumulativeProfit.toLocaleString("de-DE")}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </details>

                  {/* 2. Box: Market Report (Collapsible) */}
                  <details className="rounded-lg border border-neutral-200 bg-neutral-50 shadow-sm">
                    <summary className="cursor-pointer p-4 font-semibold text-neutral-900 hover:bg-neutral-100 transition rounded-lg flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <span>📊</span>
                        <span>Marktbericht</span>
                      </span>
                      <span className="text-xs font-normal text-neutral-700">▼ ausklappen</span>
                    </summary>
                    <div className="p-4 pt-2 space-y-3">
                      <div className="flex items-center justify-between rounded bg-white p-3 shadow-sm">
                        <span className="text-sm text-neutral-600">Durchschnittspreis</span>
                        <span className="text-lg font-bold text-neutral-900">
                          €{groupData.lastResult.averageMarketPrice?.toFixed(2) || "0.00"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded bg-white p-3 shadow-sm">
                        <span className="text-sm text-neutral-600">Gesamtnachfrage</span>
                        <span className="text-lg font-bold text-neutral-900">
                          {groupData.lastResult.totalMarketDemand || 0} Einheiten
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded bg-white p-3 shadow-sm">
                        <span className="text-sm text-neutral-600">Mein Marktanteil</span>
                        <span className="text-lg font-bold text-neutral-700">
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
                      {(groupData.lastResult.marketAnalysisCost > 0 || (game?.activePeriodActions?.period === game?.period && game?.activePeriodActions?.freeMarketAnalysis)) ? (
                        insightsLoading ? (
                          <p className="text-sm text-amber-800">Analyse wird geladen...</p>
                        ) : competitorInsights.length > 0 ? (
                          <div className="space-y-2">
                            {competitorInsights.map((c) => (
                              <div key={c.name} className="rounded bg-white p-3 shadow-sm">
                                <p className="text-xs font-semibold text-neutral-600">{c.name}</p>
                                <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                                  <div>
                                    <p className="text-xs text-neutral-500">Preis</p>
                                    <p className="font-semibold text-neutral-900">€{c.price.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-neutral-500">Verkauft</p>
                                    <p className="font-semibold text-neutral-900">{Math.floor(c.soldUnits).toLocaleString("de-DE")} Einh.</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-neutral-500">Produziert</p>
                                    <p className="font-semibold text-neutral-900">{Math.floor(c.production).toLocaleString("de-DE")} Einh.</p>
                                  </div>
                                  <div>
                                    <p className="text-xs text-neutral-500">Lagerbestand</p>
                                    <p className="font-semibold text-neutral-900">{Math.floor(c.endingInventory).toLocaleString("de-DE")} Einh.</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-amber-800">Keine Konkurrenzdaten verfügbar.</p>
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
                        className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-600 px-6 py-3 text-base font-semibold text-white shadow-md transition hover:bg-neutral-700 disabled:opacity-60 disabled:cursor-not-allowed"
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

              {/* Game Finished - Show Analytics */}
              {joined && (game?.status as unknown as string) === "finished" && groupData && (
                <>
                  {/* Finish Screen - Full Width Celebration */}
                  <div className="rounded-2xl border-3 border-emerald-400 bg-gradient-to-br from-emerald-50 to-emerald-100 p-8 mt-8 shadow-lg">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-6">
                      <div>
                        <h2 className="text-3xl sm:text-4xl font-bold text-emerald-900 mb-2 flex items-center gap-3">
                          <span className="text-4xl sm:text-5xl">🎉</span>
                          Spiel beendet!
                        </h2>
                        <p className="text-emerald-800 text-lg">
                          Herzlichen Glückwunsch! Das Unternehmensplanspiel ist vorbei.
                        </p>
                      </div>
                      <div className="bg-white rounded-lg px-6 py-4 border-2 border-emerald-400 text-center">
                        <p className="text-sm text-emerald-700 font-semibold">Dein Kapital</p>
                        <p className="text-3xl font-bold text-emerald-900">€{(groupData.capital || 0).toLocaleString("de-DE")}</p>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-lg p-4 border border-emerald-200">
                      <p className="text-emerald-800">
                        📊 <strong>Schaut euch unten an:</strong> Euer finales Ranking, den Spielverlauf über alle Perioden mit interaktiven Graphen und vergleicht euren Erfolg mit den anderen Gruppen!
                      </p>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-3 my-8">
                    <div className="flex-1 border-t-2 border-neutral-200"></div>
                    <span className="text-neutral-500 font-semibold">📈 SPIELANALYSE</span>
                    <div className="flex-1 border-t-2 border-neutral-200"></div>
                  </div>

                  {/* Analytics with ranking and charts */}
                  <GameAnalytics
                    groups={game.groups || []}
                    currentGroupId={groupId || ""}
                    gameId={gameId || ""}
                  />
                </>
              )}
            </>
              )}
            </div>
          )}

          {!joined && (
            <div className="mt-6 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-4 py-4 text-sm text-neutral-600">
              Nach dem Beitritt siehst du hier:
              <ul className="mt-2 list-disc pl-5 text-neutral-600">
                <li>Eigenes Kapital, Lager, Maschinen</li>
                <li>Entscheidungsformular pro Periode</li>
                <li>Ergebnisse deiner Gruppe nach Freigabe</li>
              </ul>
            </div>
          )}
        </div>

        <Link
          href="/"
          className="text-sm font-semibold text-neutral-700 underline-offset-4 hover:underline"
        >
          Zurück zur Startseite
        </Link>
          </>
        )}
      </main>
    </>
  );
}

