"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { generateGroupCode, generateAdminPin, savePinToLocalStorage } from "@/lib/auth";

export default function SpielleiterPage() {
  const router = useRouter();
  const [view, setView] = useState<"login" | "create">("create");
  const [numGroups, setNumGroups] = useState("3");
  const [preset, setPreset] = useState<"easy" | "medium" | "hard">("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [groupNames, setGroupNames] = useState<string[]>(["Gruppe 1", "Gruppe 2", "Gruppe 3"]);
  const [existingPin, setExistingPin] = useState("");

  const handleNumGroupsChange = (num: number) => {
    setNumGroups(num.toString());
    setGroupNames(Array.from({ length: num }, (_, i) => `Gruppe ${i + 1}`));
  };

  const handleGroupNameChange = (index: number, name: string) => {
    const newNames = [...groupNames];
    newNames[index] = name;
    setGroupNames(newNames);
  };

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const generatedPin = generateAdminPin();
      const groups = groupNames.map((name) => ({
        id: crypto.randomUUID(),
        name,
        joinCode: generateGroupCode(),
        capital: 0,
        inventory: 0,
        cumulativeProfit: 0,
        machines: [],
        cumulativeRndInvestment: 0,
        rndBenefitApplied: false,
        status: "pending" as const,
      }));

      const gameDoc = {
        preset,
        groups,
        period: 0,
        status: "waiting" as const,
        createdAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, "games"), gameDoc);
      savePinToLocalStorage(generatedPin, docRef.id);
      alert(`✅ Spiel erstellt!\n\nAdmin-PIN: ${generatedPin}\n\nSpeichere diese PIN sicher ab!`);
      router.push(`/spielleiter/${docRef.id}`);
    } catch (err) {
      console.error("Error creating game:", err);
      setError("Fehler beim Erstellen des Spiels. Versuche es erneut.");
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    // TODO: Implement PIN validation
    alert("Funktion kommt bald!");
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 px-4 py-10">
      <section className="mx-auto max-w-2xl space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-900">Spiel erstellen & verwalten</h1>
          <p className="mt-2 text-slate-600">
            Starten Sie ein neues Planspiel oder treten Sie einem bestehenden bei
          </p>
        </div>

      {/* View Toggle */}
      <div className="flex gap-2 rounded-lg bg-slate-100 p-1">
        <button
          onClick={() => setView("create")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition ${
            view === "create"
              ? "bg-white text-sky-700 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Neues Spiel
        </button>
        <button
          onClick={() => setView("login")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition ${
            view === "login"
              ? "bg-white text-sky-700 shadow-sm"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Zu Spiel beitreten
        </button>
      </div>

      {/* Create Game View */}
      {view === "create" && (
        <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
          <form onSubmit={handleCreateGame} className="flex flex-col gap-6">
            {/* Preset */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700">
                Schwierigkeitsstufe
              </label>
              <div className="grid gap-2 sm:grid-cols-3">
                {(["easy", "medium", "hard"] as const).map((p) => (
                  <label key={p} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="preset"
                      value={p}
                      checked={preset === p}
                      onChange={(e) => setPreset(e.target.value as typeof preset)}
                      className="accent-sky-600"
                    />
                    <span className="text-sm text-slate-700">
                      {p === "easy" ? "Einfach" : p === "medium" ? "Mittel" : "Schwer"}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Number of Groups */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700">
                Anzahl der Gruppen (2-10)
              </label>
              <div className="flex gap-2">
                {Array.from({ length: 9 }, (_, i) => i + 2).map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleNumGroupsChange(num)}
                    className={`flex-1 rounded-lg px-2 py-2 text-sm font-semibold transition ${
                      numGroups === num.toString()
                        ? "bg-sky-600 text-white shadow-md"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Group Names */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-semibold text-slate-700">
                Gruppennamen
              </label>
              <div className="grid gap-2">
                {groupNames.map((name, idx) => (
                  <input
                    key={idx}
                    type="text"
                    value={name}
                    onChange={(e) => handleGroupNameChange(idx, e.target.value)}
                    placeholder={`Gruppe ${idx + 1}`}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  />
                ))}
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-50"
            >
              {loading ? "Erstelle Spiel..." : "Spiel erstellen"}
            </button>
          </form>
        </div>
      )}

      {/* Login View */}
      {view === "login" && (
        <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
          <form onSubmit={handleJoinGame} className="flex flex-col gap-4">
            <label className="flex flex-col gap-2 text-sm text-slate-700">
              Admin-PIN
              <input
                type="password"
                placeholder="z.B. K7m2P9qL"
                value={existingPin}
                onChange={(e) => setExistingPin(e.target.value)}
                className="rounded-lg border border-slate-200 px-3 py-2 text-base text-slate-900 shadow-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200"
              />
            </label>

            {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:bg-sky-400"
            >
              {loading ? "Wird überprüft..." : "Zu Spiel beitreten"}
            </button>
          </form>
        </div>
      )}

      <Link
        href="/"
        className="text-sm font-semibold text-sky-700 underline-offset-4 hover:underline"
      >
        ← Zurück zur Startseite
      </Link>
    </section>
  </main>
  );
}
