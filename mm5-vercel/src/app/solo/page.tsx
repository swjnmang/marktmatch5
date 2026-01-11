"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, type Timestamp } from "firebase/firestore";
import type { GameDocument, GroupState } from "@/lib/types";
import { ui } from "@/lib/ui";

const DEFAULT_PARAMETERS = {
  startingCapital: 30000,
  periodDurationMinutes: 5,
  marketAnalysisCost: 2000,
  negativeCashInterestRate: 0.15,
  initialMarketSaturationFactor: 0.8,
  priceElasticityFactor: 0.5,
  demandReferencePrice: 50,
  minPriceElasticityDemandMultiplier: 0.5,
  inventoryCostPerUnit: 2,
  rndBenefitThreshold: 10000,
  rndVariableCostReduction: 0.5,
  machineDegradationRate: 0.02,
  isRndEnabled: true,
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
    <main className={ui.page.shell}>
      <div className={ui.page.overlay} />
      <div className={ui.page.container}>
        <div className="flex flex-col gap-2">
          <p className={ui.header.kicker}>Solo-Modus</p>
          <h1 className={ui.header.title}>Gegen KI-Gegner spielen</h1>
          <p className={ui.header.subtitle}>
            Im Solo-Modus trittst du gegen 4 KI-gesteuerte Unternehmen an. Perfekt zum Üben oder einfach zum Spaß – ohne Warten.
          </p>
        </div>

        <div className={ui.card.padded}>
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-700 text-sm">{error}</div>
        )}

        <form onSubmit={handleStartSolo} className="flex flex-col gap-4">
          <div className="rounded-lg bg-purple-50 p-4 text-sm text-purple-900">
            <p className="font-semibold mb-2">🤖 Solo-Modus Features:</p>
            <ul className="space-y-1 text-purple-800">
              <li>• 4 KI-Gegner mit unterschiedlichen Strategien</li>
              <li>• Automatische Entscheidungen der KI-Teams</li>
              <li>• Sofortiger Start ohne Wartezeit</li>
              <li>• Gleiche Spielmechanik wie Mehrspieler-Modus</li>
            </ul>
          </div>

          <label className="flex flex-col gap-2 text-sm text-slate-700">
            Dein Team-Name
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="z.B. Mein Unternehmen"
              required
              className="rounded-lg border border-slate-200 px-3 py-2 text-base text-slate-900 shadow-sm focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
          </label>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-800 mb-2">KI-Gegner:</p>
            <div className="grid gap-2 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">AGG</span>
                <span><strong>TechTitans:</strong> Aggressiv – Hohe Produktion, niedrige Preise</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">CON</span>
                <span><strong>SmartSolutions:</strong> Konservativ – Moderate Strategie</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">BAL</span>
                <span><strong>MarketMasters:</strong> Ausgewogen – Mix aller Strategien</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">INN</span>
                <span><strong>InnoVentures:</strong> Innovativ – F&E und Premium-Preise</span>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !teamName.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-purple-200"
          >
            {loading ? "Spiel wird erstellt..." : "Solo-Spiel starten 🚀"}
          </button>
        </form>
      </div>

        <Link
          href="/"
          className={ui.header.backLink}
        >
          ← Zurück zur Startseite
        </Link>
      </div>
    </main>
  );
}
