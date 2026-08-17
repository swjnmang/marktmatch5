"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

export const dynamic = "force-dynamic";

// Sucht den PIN nacheinander in beiden Spielmodi (Produktion & Handel) und leitet
// zur passenden Beitritts-Route weiter. Existiert eigenständig neben /gruppe und
// /gruppe-handel, damit beide Modi-eigenen Seiten unverändert bleiben - diese Seite
// ist nur der gemeinsame Einstiegspunkt von der Startseite aus.
function SpielBeitretenContent() {
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
    const normalizedPin = pin.toUpperCase();

    try {
      const productionSnap = await getDocs(
        query(collection(db, "games"), where("joinPin", "==", normalizedPin))
      );
      if (!productionSnap.empty) {
        router.push(`/gruppe/${productionSnap.docs[0].id}?pin=${normalizedPin}`);
        return;
      }

      const handelSnap = await getDocs(
        query(collection(db, "games_handel"), where("joinPin", "==", normalizedPin))
      );
      if (!handelSnap.empty) {
        router.push(`/gruppe-handel/${handelSnap.docs[0].id}?pin=${normalizedPin}`);
        return;
      }

      setError("Kein Spiel mit diesem PIN gefunden. Bitte überprüfe den Code.");
      setLoading(false);
    } catch (err: any) {
      console.error("Error finding game:", err);
      setError(`Fehler beim Suchen des Spiels: ${err.message}`);
      setLoading(false);
    }
  };

  return (
    <main
      className="relative min-h-screen overflow-hidden"
      style={{ background: "linear-gradient(135deg, #f3f4f6 0%, #d1d5db 100%)" }}
    >
      <div className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-10 sm:px-6 sm:py-16">
        <div className="flex items-center justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-neutral-500">Spiel beitreten</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-neutral-800">Code eingeben</h1>
          </div>
          <Link href="/" className="text-sm text-neutral-600 hover:text-neutral-800 transition">
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
                className="w-full px-4 py-4 border-2 border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-600 focus:border-neutral-600 tracking-widest text-center text-3xl font-bold text-neutral-900 uppercase disabled:bg-neutral-100"
              />
              <p className="text-xs text-neutral-500 mt-2 text-center">
                5-stelliger Code vom Spielleiter - funktioniert für Produktions- und Handelsspiele.
              </p>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 p-3 border border-red-200 text-sm text-red-800">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading || pin.length !== 5}
              className="w-full bg-neutral-700 hover:bg-neutral-800 text-white font-bold py-4 px-4 rounded-xl transition disabled:bg-neutral-300 disabled:cursor-not-allowed"
            >
              {loading ? "Suche Spiel..." : "Spiel beitreten"}
            </button>
          </form>
        </div>

        <Link href="/" className="text-center text-sm text-neutral-600 hover:text-neutral-800 transition">
          ← Zurück zur Startseite
        </Link>
      </div>
    </main>
  );
}

export default function SpielBeitretenPage() {
  return (
    <Suspense fallback={<div>Lädt...</div>}>
      <SpielBeitretenContent />
    </Suspense>
  );
}
