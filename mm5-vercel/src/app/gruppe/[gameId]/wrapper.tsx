"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { GruppeGameForm } from "../game-form";

export function GruppeGameWrapper() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const gameId = params.gameId as string;
  const pinFromUrl = searchParams.get("pin");
  const [validated, setValidated] = useState(false);
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const validateAndJoin = async () => {
      // If already joined (localStorage exists), skip validation
      const storedGroupId = localStorage.getItem(`group_${gameId}`);
      if (storedGroupId) {
        setValidated(true);
        setValidating(false);
        return;
      }

      // If no PIN provided, show the form
      if (!pinFromUrl) {
        setValidated(false);
        setValidating(false);
        return;
      }

      // Validate PIN and join
      try {
        const groupsRef = collection(db, "games", gameId, "groups");
        // In a real app, you'd validate the PIN against game settings
        // For now, we'll just mark as validated and let the form complete the join
        localStorage.setItem(`pending_pin_${gameId}`, pinFromUrl);
        setValidated(true);
        setValidating(false);
      } catch (err: any) {
        setError(`Validierung fehlgeschlagen: ${err.message}`);
        setValidating(false);
      }
    };

    validateAndJoin();
  }, [gameId, pinFromUrl]);

  if (validating) {
    return (
      <main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-14 sm:px-10">
        <div className="text-center text-slate-600">Wird validiert...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-14 sm:px-10">
        <div className="rounded-2xl bg-red-50 p-6 text-red-700">{error}</div>
      </main>
    );
  }

  return <GruppeGameForm prefilledPin={validated && pinFromUrl ? pinFromUrl : ""} />;
}
