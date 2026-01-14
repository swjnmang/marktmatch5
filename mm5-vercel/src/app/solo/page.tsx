"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, type Timestamp } from "firebase/firestore";
import type { GameDocument, GroupState } from "@/lib/types";

const DEFAULT_PARAMETERS = {
  startingCapital: 30000,
  periodDurationMinutes: 5,
  marketAnalysisCost: 2000,
  negativeCashInterestRate: 0.15,
  initialMarketSaturationFactor: 0.7,
  priceElasticityFactor: 0.5,
  demandReferencePrice: 50,
  minPriceElasticityDemandMultiplier: 0.5,
  inventoryCostPerUnit: 2,
  rndBenefitThreshold: 10000,
  rndVariableCostReduction: 0.5,
  machineDegradationRate: 0.02,
  marketingEffectivenessFactor: 0.3,
  allowMachinePurchaseNextPeriod: false,
  demandBoostNextPeriod: false,
  freeMarketAnalysisNextPeriod: false,
  noInventoryCostsNextPeriod: false,
  customEventNextPeriod: "",
};

const AI_STRATEGIES = ["aggressive", "conservative", "balanced", "innovative"] as const;
const AI_TEAM_NAMES = ["TechTitans", "SmartSolutions", "MarketMasters", "InnoVentures"];

export default function SoloModePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [teamName, setTeamName] = useState("");

  const handleStartSolo = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Create new game
      const gamesRef = collection(db, "games");
      
      const newGame: Omit<GameDocument, "groups"> & { groups?: GroupState[] } = {
        gameName: `Solo-Spiel: ${teamName}`,
        adminPin: "SOLO0",
        joinPin: "SOLO0",
        parameters: DEFAULT_PARAMETERS,
        period: 0,
        status: "in_progress",
        phase: "machine_selection",
        phaseEndsAt: Date.now() + 300000, // 5 minutes
        createdAt: serverTimestamp() as unknown as Timestamp,
        isSoloMode: true,
      };

      const gameDoc = await addDoc(gamesRef, newGame);
      const gameId = gameDoc.id;

      // Create human player group
      const groupsRef = collection(db, "games", gameId, "groups");
      
      const humanGroup: Omit<GroupState, "id"> = {
        name: teamName,
        capital: 30000,
        inventory: 0,
        cumulativeProfit: 0,
        machines: [],
        cumulativeRndInvestment: 0,
        rndBenefitApplied: false,
        status: "waiting",
        isAI: false,
      };
      
      const humanGroupDoc = await addDoc(groupsRef, humanGroup);
      
      // Create 4 AI opponent groups
      for (let i = 0; i < 4; i++) {
        const aiGroup: Omit<GroupState, "id"> = {
          name: AI_TEAM_NAMES[i],
          capital: 30000,
          inventory: 0,
          cumulativeProfit: 0,
          machines: [],
          cumulativeRndInvestment: 0,
          rndBenefitApplied: false,
          status: "waiting",
          isAI: true,
          aiStrategy: AI_STRATEGIES[i],
        };
        await addDoc(groupsRef, aiGroup);
      }

      // Store IDs in localStorage
      localStorage.setItem(`group_${gameId}`, humanGroupDoc.id);
      localStorage.setItem(`gameId_${humanGroupDoc.id}`, gameId);
      localStorage.setItem(`solo_mode_${gameId}`, "true");

      // Redirect to solo game view
      router.push(`/solo/${gameId}`);
    } catch (err: any) {
      setError(`Fehler beim Starten: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden" style={{background: "linear-gradient(135deg, #f3f4f6 0%, #d1d5db 100%)"}}>
      <div className="mx-auto max-w-4xl px-6 py-16 sm:px-10">
        {/* Back Link */}
        <Link href="/" className="mb-8 inline-flex items-center text-sm text-neutral-600 hover:text-neutral-800 transition">
          ← Zurück zur Startseite
        </Link>

        {/* Header */}
        <header className="mb-12 text-center text-neutral-800">
          <p className="mb-2 text-sm font-semibold text-neutral-500 uppercase tracking-widest">Solo-Modus</p>
          <h1 className="mb-4 text-4xl font-bold">Gegen KI-Gegner spielen</h1>
          <p className="mx-auto max-w-2xl text-lg text-neutral-700">
            Im Solo-Modus trittst du gegen 4 KI-gesteuerte Unternehmen an. Perfekt zum Üben oder einfach zum Spaß – ohne Warten.
          </p>
        </header>

        {/* Form Card */}
        <div className="rounded-2xl bg-white p-10 shadow-md border-2 border-neutral-400">
          {error && (
            <div className="mb-6 rounded-lg bg-red-500/20 p-4 text-red-100 text-sm ring-1 ring-red-400/40">
              {error}
            </div>
          )}

          <form onSubmit={handleStartSolo} className="flex flex-col gap-6">
            {/* Features Info */}
            <div className="rounded-xl bg-neutral-100 p-6 text-neutral-800 ring-1 ring-neutral-200">
              <p className="font-semibold mb-3 text-base">🤖 Solo-Modus Features:</p>
              <ul className="space-y-2 text-sm text-neutral-600">
                <li className="flex gap-2">
                  <span>✓</span>
                  <span><strong>4 KI-Gegner</strong> mit unterschiedlichen Strategien</span>
                </li>
                <li className="flex gap-2">
                  <span>✓</span>
                  <span><strong>Automatische Entscheidungen</strong> der KI-Teams</span>
                </li>
                <li className="flex gap-2">
                  <span>✓</span>
                  <span><strong>Sofortiger Start</strong> ohne Wartezeit</span>
                </li>
                <li className="flex gap-2">
                  <span>✓</span>
                  <span><strong>Gleiche Spielmechanik</strong> wie Mehrspieler-Modus</span>
                </li>
              </ul>
            </div>

            {/* Team Name Input */}
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-neutral-900">Dein Team-Name</span>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="z.B. Mein Unternehmen"
                required
                className="rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-neutral-900 placeholder:text-neutral-400 shadow-sm focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-300/40"
              />
            </label>

            {/* AI Opponents */}
            <div className="rounded-xl border border-neutral-200 bg-white/50 p-6">
              <p className="text-sm font-semibold text-neutral-900 mb-4">Deine KI-Gegner:</p>
              <div className="grid gap-3 text-sm">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/50 border border-red-200">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-red-500/20 text-red-600 font-bold text-xs ring-1 ring-red-300">AGG</span>
                  <div className="text-neutral-700">
                    <strong>TechTitans:</strong> Aggressiv – Hohe Produktion, niedrige Preise
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/50 border border-green-200">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-500/20 text-green-600 font-bold text-xs ring-1 ring-green-300">CON</span>
                  <div className="text-neutral-700">
                    <strong>SmartSolutions:</strong> Konservativ – Moderate Strategie
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/50 border border-neutral-200">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-neutral-400/20 text-neutral-700 font-bold text-xs ring-1 ring-neutral-300">BAL</span>
                  <div className="text-neutral-700">
                    <strong>MarketMasters:</strong> Ausgewogen – Mix aller Strategien
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/50 border border-purple-200">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-purple-500/20 text-purple-600 font-bold text-xs ring-1 ring-purple-300">INN</span>
                  <div className="text-neutral-700">
                    <strong>InnoVentures:</strong> Innovativ – F&E und Premium-Preise
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !teamName.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-400 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-600 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-neutral-200"
            >
              {loading ? "Spiel wird erstellt..." : "Solo-Spiel starten 🚀"}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

