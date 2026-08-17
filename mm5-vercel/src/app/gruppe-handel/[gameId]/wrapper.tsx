"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { isSessionValid, isDeviceAuthorized } from "@/lib/session-utils";
import { GruppeGameFormHandel } from "../game-form";

export function GruppeGameWrapperHandel() {
  const params = useParams();
  const gameId = params.gameId as string;
  const [validated, setValidated] = useState(false);
  const [validating, setValidating] = useState(true);
  const [error, setError] = useState("");
  const [pinFromUrl, setPinFromUrl] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    setPinFromUrl(urlParams.get("pin"));
  }, [gameId]);

  useEffect(() => {
    if (pinFromUrl === undefined) return;

    const validateAndJoin = async () => {
      if (isSessionValid(gameId)) {
        if (isDeviceAuthorized(gameId)) {
          setValidated(true);
          setValidating(false);
          return;
        }
      }

      const storedGroupId = localStorage.getItem(`group_${gameId}`);
      if (storedGroupId) {
        setValidated(true);
        setValidating(false);
        return;
      }

      if (!pinFromUrl) {
        setValidated(false);
        setValidating(false);
        return;
      }

      try {
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
      <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-14 sm:px-6">
        <div className="text-center text-neutral-600">Wird validiert...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-14 sm:px-6">
        <div className="rounded-2xl bg-red-50 p-6 text-red-700">{error}</div>
      </main>
    );
  }

  return <GruppeGameFormHandel prefilledPin={validated && pinFromUrl ? pinFromUrl : ""} />;
}
