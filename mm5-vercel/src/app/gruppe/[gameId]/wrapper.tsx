"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection } from "firebase/firestore";
import { isSessionValid, isDeviceAuthorized } from "@/lib/session-utils";
import { GruppeGameForm } from "../game-form";

export function GruppeGameWrapper() {
  const params = useParams();
  const gameId = params.gameId as string;
  const [validated, setValidated] = useState(false);
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState("");
  const [pinFromUrl, setPinFromUrl] = useState<string | null>(null);

  // Extract PIN from window.location ONLY - avoid useSearchParams race condition
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const pin = urlParams.get("pin");
    setPinFromUrl(pin);
    
    console.log(`[GruppeGameWrapper] URL parsed: gameId=${gameId}, pin=${pin || "none"}`);
  }, [gameId]);

  // Validate session and PIN - runs AFTER pinFromUrl is set
  useEffect(() => {
    if (pinFromUrl === undefined) return; // Not yet parsed URL
    
    const validateAndJoin = async () => {
      console.log(`[GruppeGameWrapper] Starting validation for game ${gameId}`);

      // FIRST: Check if this is a valid session from browser refresh
      console.log(`[GruppeGameWrapper] Checking session validity...`);
      if (isSessionValid(gameId)) {
        console.log(`[GruppeGameWrapper] ✓ Session is VALID for game ${gameId}`);
        if (isDeviceAuthorized(gameId)) {
          console.log(`[GruppeGameWrapper] ✓ Device is AUTHORIZED - continuing game WITHOUT form`);
          setValidated(true);
          setValidating(false);
          return;
        } else {
          console.log(`[GruppeGameWrapper] ✗ Device mismatch - session from different device`);
        }
      } else {
        console.log(`[GruppeGameWrapper] ✗ No valid session found`);
      }

      // SECOND: Check for legacy localStorage group entry
      const storedGroupId = localStorage.getItem(`group_${gameId}`);
      if (storedGroupId) {
        console.log(`[GruppeGameWrapper] Found legacy group entry for ${gameId}`);
        setValidated(true);
        setValidating(false);
        return;
      }

      // THIRD: If no PIN provided, show the form
      if (!pinFromUrl) {
        console.log(`[GruppeGameWrapper] No PIN in URL - showing join form`);
        setValidated(false);
        setValidating(false);
        return;
      }

      // FOURTH: Validate PIN and join
      try {
        console.log(`[GruppeGameWrapper] Validating PIN from URL for game ${gameId}`);
        // const groupsRef = collection(db, "games", gameId, "groups");
        // In a real app, you'd validate the PIN against game settings
        // For now, we'll just mark as validated and let the form complete the join
        localStorage.setItem(`pending_pin_${gameId}`, pinFromUrl);
        setValidated(true);
        setValidating(false);
      } catch (err: unknown) {
        const msg = err && typeof err === "object" && "message" in err ? String((err as Error).message) : "Unbekannter Fehler";
        setError(`Validierung fehlgeschlagen: ${msg}`);
        setValidating(false);
      }
    };

    validateAndJoin();
  }, [gameId, pinFromUrl]);

  if (validating) {
    return (
      <main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-14 sm:px-10">
        <div className="text-center text-neutral-600">Wird validiert...</div>
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
