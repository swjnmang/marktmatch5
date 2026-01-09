"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, addDoc, serverTimestamp, updateDoc, onSnapshot, setDoc } from "firebase/firestore";
import type { GameDocument, GroupState, Machine, PeriodDecision } from "@/lib/types";

const MACHINE_OPTIONS: Machine[] = [
  { name: "SmartMini-Fertiger", cost: 5000, capacity: 100, variableCostPerUnit: 6 },
  { name: "KompaktPro-Produzent", cost: 12000, capacity: 250, variableCostPerUnit: 5 },
  { name: "FlexiTech-Assembler", cost: 18000, capacity: 350, variableCostPerUnit: 4.5 },
  { name: "MegaFlow-Manufaktur", cost: 25000, capacity: 500, variableCostPerUnit: 4 },
];

export function GruppeGameForm() {
  const params = useParams();
  const gameId = params.gameId as string;
  const [pin, setPin] = useState("");
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [joined, setJoined] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [groupData, setGroupData] = useState<GroupState | null>(null);
  const [game, setGame] = useState<GameDocument | null>(null);
  const [production, setProduction] = useState(0);
  const [sellFromInventory, setSellFromInventory] = useState(0);
  const [price, setPrice] = useState(0);
  const [buyMarketAnalysis, setBuyMarketAnalysis] = useState(false);
  const [decisionLoading, setDecisionLoading] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const groupsRef = collection(db, "games", gameId, "groups");
      const newGroup: GroupState = {
        name: groupName,
        capital: 50000,
        inventory: 0,
        machines: [],
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
    } catch (err: any) {
      setError(`Fehler beim Einreichen: ${err.message}`);
    } finally {
      setDecisionLoading(false);
    }
  };

  return (
    <>
      <main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-14 sm:px-10">
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
              {game?.status === "in_progress" &&
                game.phase === "decisions" &&
                groupData &&
                groupData.status !== "submitted" && (
                  <form onSubmit={handleDecisionSubmit} className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4">
                    <h3 className="text-lg font-semibold text-slate-800">
                      Entscheidungen Periode {game.period}
                    </h3>
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
                        Verkauf aus Lager
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
      </main>
    </>
  );
}
