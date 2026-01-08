"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import type { GameDocument, GroupState } from "@/lib/types";

export function GruppeGameForm() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const gameId = params.gameId as string;
  const [pin, setPin] = useState("");
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [joined, setJoined] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Lese PIN direkt aus searchParams
    const pinParam = searchParams.get("pin");
    if (pinParam) {
      setPin(pinParam.toUpperCase());
    }
    setMounted(true);
  }, [searchParams]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!groupName.trim()) {
        setError("Bitte gib einen Gruppennamen ein.");
        setLoading(false);
        return;
      }

      // Überprüfe PIN - entweder aus URL oder manuell eingegeben
      const normalizedPin = pin.trim().toUpperCase();
      if (!normalizedPin) {
        setError("PIN fehlt. Bitte scanne den QR-Code erneut oder gib die PIN manuell ein.");
        return;
      }

      if (normalizedPin.length !== 5) {
        setError(`PIN muss 5 Zeichen lang sein (aktuell: ${normalizedPin.length}).`);
        return;
      }

      // Hole Spiel mit dieser gameId
      const gameDoc = await getDoc(doc(db, "games", gameId));
      if (!gameDoc.exists()) {
        setError("Spiel nicht gefunden.");
        setLoading(false);
        return;
      }

      const gameData = gameDoc.data() as GameDocument;
      
      // Validiere PIN
      if (gameData.joinPin.toUpperCase() !== normalizedPin) {
        setError(`Ungültige PIN. Erwartet: "${gameData.joinPin}", erhalten: "${normalizedPin}".`);
        return;
      }

      // Erstelle Gruppe
      const groupsRef = collection(db, "games", gameId, "groups");
      const newGroup: Omit<GroupState, "id"> = {
        name: groupName,
        status: "waiting",
        capital: gameData.parameters.startingCapital,
        inventory: 0,
        cumulativeProfit: 0,
        machines: [],
        cumulativeRndInvestment: 0,
        rndBenefitApplied: false,
        joinedAt: serverTimestamp() as any,
      };

      const docRef = await addDoc(groupsRef, newGroup);

      // Speichere Gruppen-ID im localStorage
      localStorage.setItem(`group_${gameId}`, docRef.id);
      localStorage.setItem(`gameId_${docRef.id}`, gameId);

      // Markiere Erfolg (kein Redirect, da Dashboard noch fehlt)
      setJoined(true);
    } catch (err: any) {
      console.error("Error joining game:", err);
      setError(`Fehler: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-14 sm:px-10">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-600">
          Gruppe
        </p>
        <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
          Mit Code einer Lobby beitreten
        </h1>
        <p className="text-base text-slate-600">
          Gib die Gruppen-PIN ein, die du von der Spielleitung erhalten hast. Du siehst nur die Daten deiner eigenen Gruppe.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-4 text-red-700 text-sm">
            {error}
          </div>
        )}
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
            Deine Entscheidungen bleiben privat. Marktanalysen werden nur angezeigt, wenn deine Gruppe sie gekauft hat.
          </p>

          <button
            type="submit"
            disabled={loading || joined}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-sky-200"
          >
            {joined ? "Beitritt erfolgreich" : loading ? "Wird beigetreten..." : "Beitreten"}
          </button>
        </form>

        <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600">
          Nach dem Beitritt siehst du hier:
          <ul className="mt-2 list-disc pl-5 text-slate-600">
            <li>Eigenes Kapital, Lager, Maschinen</li>
            <li>Entscheidungsformular pro Periode</li>
            <li>Ergebnisse deiner Gruppe nach Freigabe</li>
          </ul>
        </div>
      </div>

      <Link
        href="/"
        className="text-sm font-semibold text-sky-700 underline-offset-4 hover:underline"
      >
        Zurück zur Startseite
      </Link>
    </main>
  );
}
