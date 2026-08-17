"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { ui } from "@/lib/ui";

export const dynamic = "force-dynamic";

function GruppeHandelContent() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin || pin.length !== 5) {
      setError("Bitte gib einen 5-stelligen PIN ein.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const gamesRef = collection(db, "games_handel");
      const q = query(gamesRef, where("joinPin", "==", pin.toUpperCase()));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setError("Kein Handelsspiel mit diesem PIN gefunden. Bitte überprüfe den Code.");
        setLoading(false);
        return;
      }

      const gameDoc = snapshot.docs[0];
      router.push(`/gruppe-handel/${gameDoc.id}?pin=${pin.toUpperCase()}`);
    } catch (err: any) {
      console.error("Error finding game:", err);
      setError(`Fehler beim Suchen des Spiels: ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <main className={ui.page.shell}>
      <div className={ui.page.overlay} />
      <div className="relative mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-10 sm:px-6">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <p className={ui.header.kicker}>Handelsunternehmen</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-900">Spiel beitreten</h1>
          </div>
          <Link href="/" className={`${ui.header.backLink} text-sm`}>
            ← Zurück
          </Link>
        </div>

        <div className="rounded-2xl bg-white p-5 sm:p-6 shadow-md">
          <form onSubmit={handleJoin} className="flex flex-col gap-5">
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-2">PIN-Code</label>
              <input
                type="text"
                value={pin}
                onChange={(e) => setPin(e.target.value.toUpperCase())}
                placeholder="ABCDE"
                maxLength={5}
                disabled={loading}
                autoFocus
                className="w-full px-4 py-4 border-2 border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 tracking-widest text-center text-3xl font-bold text-neutral-900 uppercase disabled:bg-neutral-100"
              />
              <p className="text-xs text-neutral-500 mt-2 text-center">
                5-stelliger Code vom Spielleiter
              </p>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 p-3 border border-red-200 text-sm text-red-800">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading || pin.length !== 5}
              className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-4 px-4 rounded-xl transition disabled:bg-neutral-300 disabled:cursor-not-allowed"
            >
              {loading ? "Suche Spiel..." : "Spiel beitreten"}
            </button>
          </form>
        </div>

        <Link href="/" className={`${ui.header.backLink} text-center`}>
          ← Zurück zur Startseite
        </Link>
      </div>
    </main>
  );
}

export default function GruppeHandelPage() {
  return (
    <Suspense fallback={<div>Lädt...</div>}>
      <GruppeHandelContent />
    </Suspense>
  );
}
