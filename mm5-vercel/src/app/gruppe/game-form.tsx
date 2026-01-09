"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, addDoc, serverTimestamp, updateDoc, onSnapshot } from "firebase/firestore";
import type { GameDocument, GroupState, Machine } from "@/lib/types";

const MACHINE_OPTIONS: Machine[] = [
  { name: "Basis", cost: 12000, capacity: 100, variableCostPerUnit: 60 },
  { name: "Effizienz", cost: 18000, capacity: 140, variableCostPerUnit: 55 },
  { name: "Turbo", cost: 24000, capacity: 180, variableCostPerUnit: 52 },
  { name: "Premium", cost: 30000, capacity: 210, variableCostPerUnit: 50 },
];

export function GruppeGameForm() {
  const params = useParams();
  const searchParams = useSearchParams();
  const gameId = params.gameId as string;
  const [pin, setPin] = useState("");
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(false);
  const [lobbyReadyLoading, setLobbyReadyLoading] = useState(false);
  const [machineLoading, setMachineLoading] = useState(false);
  const [error, setError] = useState("");
  const [joined, setJoined] = useState(false);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [groupData, setGroupData] = useState<GroupState | null>(null);
  const [game, setGame] = useState<GameDocument | null>(null);
  const [machineChoice, setMachineChoice] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Lese PIN direkt aus searchParams
    const pinParam = searchParams.get("pin");
    if (pinParam) {
      setPin(pinParam.toUpperCase());
    }
    // Falls bereits beigetreten, lade Status
    const storedGroupId = localStorage.getItem(`group_${gameId}`);
    if (storedGroupId) {
      setGroupId(storedGroupId);
      setJoined(true);
    }

    setMounted(true);
  }, [searchParams, gameId]);

  // Live Game-Daten
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "games", gameId), (snap) => {
      if (snap.exists()) {
        setGame(snap.data() as GameDocument);
      }
    });
    return () => unsubscribe();
  }, [gameId]);

  // Live Gruppendaten
  useEffect(() => {
    if (!groupId) return;
    const unsubscribe = onSnapshot(doc(db, "games", gameId, "groups", groupId), (snap) => {
      if (snap.exists()) {
        const { id: _discard, ...rest } = snap.data() as GroupState;
        setGroupData({ id: snap.id, ...(rest as Omit<GroupState, "id">) });
      }
    });
    return () => unsubscribe?.();
  }, [gameId, groupId]);

  // Vorbelegung der Auswahl, falls schon gewählt
  useEffect(() => {
    if (groupData?.selectedMachine) {
      setMachineChoice(groupData.selectedMachine);
    }
  }, [groupData?.selectedMachine]);

  // Timer für aktuelle Phase
  useEffect(() => {
    if (!game?.phaseEndsAt) {
      setTimeLeft(null);
      return;
    }

    const update = () => {
      const rest = game.phaseEndsAt! - Date.now();
      setTimeLeft(rest > 0 ? rest : 0);
    };

    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [game?.phaseEndsAt]);

  const formattedTimeLeft = useMemo(() => {
    if (timeLeft == null) return "";
    const totalSeconds = Math.floor(timeLeft / 1000);
    const minutes = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [timeLeft]);

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
        setLoading(false);
        return;
      }

      if (normalizedPin.length !== 5) {
        setError(`PIN muss 5 Zeichen lang sein (aktuell: ${normalizedPin.length}).`);
        setLoading(false);
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
        setLoading(false);
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

      setGroupId(docRef.id);
      setGroupData({ id: docRef.id, ...newGroup });

      // Markiere Erfolg (kein Redirect, da Dashboard noch fehlt)
      setJoined(true);
    } catch (err: any) {
      console.error("Error joining game:", err);
      setError(`Fehler: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLobbyReady = async () => {
    if (!groupId) return;
    setLobbyReadyLoading(true);
    setError("");
    try {
      await updateDoc(doc(db, "games", gameId, "groups", groupId), { status: "ready" });
    } catch (err: any) {
      console.error("Error setting ready:", err);
      setError(`Fehler beim Bereit-Melden: ${err.message}`);
    } finally {
      setLobbyReadyLoading(false);
    }
  };

  const handleMachineReady = async () => {
    if (!groupId || !groupData) return;
    const machine = MACHINE_OPTIONS.find((m) => m.name === machineChoice);
    if (!machine) {
      setError("Bitte wähle eine Maschine aus.");
      return;
    }
    if (groupData.capital < machine.cost) {
      setError("Kapital reicht für diese Maschine nicht aus.");
      return;
    }
    setMachineLoading(true);
    setError("");
    try {
      const newCapital = groupData.capital - machine.cost;
      await updateDoc(doc(db, "games", gameId, "groups", groupId), {
        status: "ready",
        selectedMachine: machine.name,
        machines: [machine],
        capital: newCapital,
      });
    } catch (err: any) {
      console.error("Error setting machine ready:", err);
      setError(`Fehler beim Bestätigen: ${err.message}`);
    } finally {
      setMachineLoading(false);
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
          {joined ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-slate-800">
                <span className="font-semibold">Status:</span>
                <span className="font-mono text-sm">{groupData?.status || "waiting"}</span>
              </div>

              {game?.status === "lobby" && (
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleLobbyReady}
                    disabled={lobbyReadyLoading || groupData?.status === "ready"}
                    className="inline-flex w-fit items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {groupData?.status === "ready" ? "Bereit gemeldet" : lobbyReadyLoading ? "Melde bereit..." : "Bereit melden"}
                  </button>
                  <p className="text-xs text-slate-500">
                    Sobald alle Gruppen bereit sind, kann die Spielleitung das Spiel starten.
                  </p>
                </div>
              )}

              {game?.status === "in_progress" && game.phase === "machine_selection" && (
                <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 text-slate-700">
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-800">
                    <span>Maschine auswählen</span>
                    {formattedTimeLeft && <span className="rounded bg-slate-100 px-3 py-1 font-mono text-xs">{formattedTimeLeft}</span>}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {MACHINE_OPTIONS.map((m) => (
                      <label key={m.name} className={`flex cursor-pointer flex-col gap-2 rounded-lg border p-3 shadow-sm transition ${machineChoice === m.name ? "border-sky-500 ring-2 ring-sky-100" : "border-slate-200 hover:border-sky-300"}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="machine"
                              value={m.name}
                              checked={machineChoice === m.name}
                              onChange={() => setMachineChoice(m.name)}
                              disabled={groupData?.status === "ready"}
                              className="accent-sky-600"
                            />
                            <span className="font-semibold text-slate-900">{m.name}</span>
                          </div>
                          <span className="text-xs font-mono text-slate-600">Kapazität: {m.capacity}</span>
                        </div>
                        <div className="text-xs text-slate-600">
                          Kosten: €{m.cost.toLocaleString("de-DE")}, Variable Stückkosten: €{m.variableCostPerUnit.toLocaleString("de-DE")}
                        </div>
                      </label>
                    ))}
                  </div>
                  <div className="flex flex-col gap-2 text-sm text-slate-700">
                    <span>
                      Verfügbares Kapital: €{groupData ? groupData.capital.toLocaleString("de-DE") : "—"}
                    </span>
                    <button
                      type="button"
                      onClick={handleMachineReady}
                      disabled={machineLoading || groupData?.status === "ready"}
                      className="inline-flex w-fit items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {groupData?.status === "ready" ? "Kauf bestätigt" : machineLoading ? "Bestätige..." : "Kauf bestätigen & bereit"}
                    </button>
                  </div>
                </div>
              )}

              {game?.status === "in_progress" && game.phase !== "machine_selection" && (
                <p className="text-xs text-slate-600">Warte auf die nächste Phase. Deine Auswahl wurde gespeichert.</p>
              )}
            </div>
          ) : (
            <>
              Nach dem Beitritt siehst du hier:
              <ul className="mt-2 list-disc pl-5 text-slate-600">
                <li>Eigenes Kapital, Lager, Maschinen</li>
                <li>Entscheidungsformular pro Periode</li>
                <li>Ergebnisse deiner Gruppe nach Freigabe</li>
              </ul>
            </>
          )}
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
