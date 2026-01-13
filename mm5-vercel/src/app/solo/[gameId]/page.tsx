"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import type { GroupState, GameDocument } from "@/lib/types";
import { GruppeGameForm } from "@/app/gruppe/game-form";

export default function SoloGamePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    // Check if we have a valid group ID in localStorage for this game
    const storedGroupId = localStorage.getItem(`group_${gameId}`);
    const isSoloMode = localStorage.getItem(`solo_mode_${gameId}`);

    if (!storedGroupId || !isSoloMode) {
      // No valid solo game data, redirect to solo setup
      router.push("/solo");
      return;
    }

    // Verify the group exists in Firestore
    const verifyGroup = async () => {
      try {
        const groupDoc = await getDoc(doc(db, "games", gameId, "groups", storedGroupId));
        if (!groupDoc.exists()) {
          throw new Error("Gruppe nicht gefunden");
        }
        setLoading(false);
      } catch (err: any) {
        setError(`Fehler: ${err.message}`);
        setLoading(false);
      }
    };

    verifyGroup();
  }, [gameId, router]);

  if (loading) {
    return (
      <main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-14 sm:px-10">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600"></div>
          <p className="text-neutral-600">Lade Solo-Spiel...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-14 sm:px-10">
        <div className="rounded-lg bg-red-50 p-4 text-red-700">
          {error}
        </div>
      </main>
    );
  }

  return <GruppeGameForm />;
}
