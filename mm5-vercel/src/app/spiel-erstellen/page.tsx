"use client";

import { useState } from "react";
import Link from "next/link";

export default function CreateGame() {
  const [step, setStep] = useState<"start" | "gruppen-typ">("start");

  return (
    <main className="relative min-h-screen overflow-hidden" style={{background: "linear-gradient(135deg, #f3f4f6 0%, #d1d5db 100%)"}}>
      <div className="mx-auto max-w-4xl px-6 py-16 sm:px-10">
        {/* Back Link */}
        {step === "start" ? (
          <Link href="/" className="mb-8 inline-flex items-center text-sm text-neutral-600 hover:text-neutral-800 transition">
            ← Zurück zur Startseite
          </Link>
        ) : (
          <button
            onClick={() => setStep("start")}
            className="mb-8 inline-flex items-center text-sm text-neutral-600 hover:text-neutral-800 transition"
          >
            ← Zurück
          </button>
        )}

        {step === "start" && (
          <>
            {/* Header */}
            <header className="mb-12 text-neutral-800">
              <p className="mb-2 text-sm font-semibold text-neutral-500 uppercase tracking-widest">Spiel erstellen</p>
              <h1 className="mb-4 text-4xl font-bold">Was möchtest du starten?</h1>
              <p className="text-lg text-neutral-700">
                Wähle Multiplayer für Gruppen oder Solo gegen KI-Gegner.
              </p>
            </header>

            {/* Options Grid */}
            <div className="grid gap-8 sm:grid-cols-2">
              <button
                onClick={() => setStep("gruppen-typ")}
                className="group rounded-2xl bg-white p-10 text-left shadow-md transition hover:-translate-y-2 hover:shadow-lg border-2 border-neutral-400"
              >
                <div className="mb-6 text-5xl">👥</div>
                <h2 className="mb-3 text-2xl font-bold text-neutral-800">Spiel für Gruppen</h2>
                <p className="mb-6 text-neutral-600">
                  Erstelle ein Multiplayer-Spiel. Du erhältst Codes zum Verteilen und steuerst alles über das Spielleiter-Dashboard.
                </p>
                <span className="inline-block rounded-lg bg-neutral-400 px-6 py-2 text-sm font-semibold text-white transition group-hover:bg-neutral-600">
                  Weiter
                </span>
              </button>

              <Link
                href="/solo"
                className="group rounded-2xl bg-white p-10 shadow-md transition hover:-translate-y-2 hover:shadow-lg border-2 border-neutral-400"
              >
                <div className="mb-6 text-5xl">🤖</div>
                <h2 className="mb-3 text-2xl font-bold text-neutral-800">Gegen KI spielen</h2>
                <p className="mb-6 text-neutral-600">
                  Spiele allein gegen 4 KI-Gegner. Perfekt zum Üben, Lernen oder einfach zum Spaß.
                </p>
                <button className="inline-block rounded-lg bg-neutral-400 px-6 py-2 text-sm font-semibold text-white transition hover:bg-neutral-600">
                  Solo spielen
                </button>
              </Link>
            </div>
          </>
        )}

        {step === "gruppen-typ" && (
          <>
            {/* Header */}
            <header className="mb-12 text-neutral-800">
              <p className="mb-2 text-sm font-semibold text-neutral-500 uppercase tracking-widest">Spiel für Gruppen</p>
              <h1 className="mb-4 text-4xl font-bold">Welche Art von Unternehmen?</h1>
              <p className="text-lg text-neutral-700">
                Beide Varianten sind eigenständige Planspiele mit eigenem Markt und eigener Rangliste.
              </p>
            </header>

            {/* Options Grid */}
            <div className="grid gap-8 sm:grid-cols-2">
              <Link
                href="/spielleiter"
                className="group rounded-2xl bg-white p-10 shadow-md transition hover:-translate-y-2 hover:shadow-lg border-2 border-neutral-400"
              >
                <div className="mb-6 text-5xl">🏭</div>
                <h2 className="mb-3 text-2xl font-bold text-neutral-800">Produktionsunternehmen</h2>
                <p className="mb-6 text-neutral-600">
                  Gruppen kaufen Maschinen, produzieren selbst und setzen auf Preis, Marketing und F&amp;E.
                </p>
                <button className="inline-block rounded-lg bg-neutral-400 px-6 py-2 text-sm font-semibold text-white transition hover:bg-neutral-600">
                  Als Spielleiter starten
                </button>
              </Link>

              <Link
                href="/spielleiter-handel"
                className="group rounded-2xl bg-white p-10 shadow-md transition hover:-translate-y-2 hover:shadow-lg border-2 border-emerald-400"
              >
                <div className="mb-6 text-5xl">🛒</div>
                <h2 className="mb-3 text-2xl font-bold text-neutral-800">Handelsunternehmen</h2>
                <p className="mb-6 text-neutral-600">
                  Gruppen kaufen Ware in drei Qualitätsstufen beim Großhändler ein und verkaufen sie weiter - Qualität zählt.
                </p>
                <button className="inline-block rounded-lg bg-emerald-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600">
                  Als Spielleiter starten
                </button>
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
