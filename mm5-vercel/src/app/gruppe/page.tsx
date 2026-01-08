"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import type { GameDocument, GroupState } from "@/lib/types";

export default function GruppePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [gameId, setGameId] = useState("");
  const [pin, setPin] = useState("");
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const pinParam = searchParams?.get("pin");
    const gameParam = searchParams?.get("gameId");
    if (pinParam) {
      setPin(pinParam);
    }
    if (gameParam) {
      setGameId(gameParam);
    }
  }, [searchParams]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!pin.trim() || !groupName.trim()) {
        setError("Bitte fülle alle Felder aus.");
        setLoading(false);
        return;
      }

      if (pin.length !== 5) {
        setError("PIN muss 5 Zeichen lang sein.");
        setLoading(false);
        return;
      }

      // Finde Spiel mit dieser PIN
      let foundGame: GameDocument | null = null;
      let foundGameId: string = "";

      // Versuche zunächst mit gameId aus URL (wenn vom QR-Code)
      if (gameId) {
        const gameDoc = await getDoc(doc(db, "games", gameId));
        if (gameDoc.exists()) {
          const gameData = gameDoc.data() as GameDocument;
          if (gameData.joinPin === pin) {
            foundGame = gameData;
            foundGameId = gameId;
          }
        }
      }

      if (!foundGame) {
        setError("Ungültige PIN oder Spiel nicht gefunden.");
        setLoading(false);
        return;
      }

      // Erstelle Gruppe
      const groupsRef = collection(db, "games", foundGameId, "groups");
      const newGroup: Omit<GroupState, "id"> = {
        name: groupName,
        status: "waiting",
        capital: foundGame.parameters.startingCapital,
        inventory: 0,
        joinedAt: serverTimestamp() as any,
      };

      const docRef = await addDoc(groupsRef, newGroup);

      // Speichere Gruppen-ID im localStorage
      localStorage.setItem(`group_${foundGameId}`, docRef.id);
      localStorage.setItem(`gameId_${docRef.id}`, foundGameId);

      // Navigiere zum Gruppen-Dashboard
      router.push(`/gruppe/${foundGameId}`);
    } catch (err: any) {
      console.error("Error joining game:", err);
      setError(`Fehler: ${err.message}`);
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
              placeholder="z.B. A3F7K"
              maxLength={5}
              className="rounded-lg border border-slate-200 px-3 py-2 text-base text-slate-900 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-slate-700">
            Anzeigename der Gruppe
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="z.B. Team Alpha"
              className="rounded-lg border border-slate-200 px-3 py-2 text-base text-slate-900 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
            />
          </label>

          <p className="text-xs text-slate-500">
            Deine Entscheidungen bleiben privat. Marktanalysen werden nur angezeigt, wenn deine Gruppe sie gekauft hat.
          </p>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-sky-200"
          >
            {loading ? "Wird beigetreten..." : "Beitreten"}
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
