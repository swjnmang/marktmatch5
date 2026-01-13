"use client";

import Link from "next/link";

export default function CreateGame() {
  return (
    <main className="relative min-h-screen overflow-hidden" style={{background: "linear-gradient(135deg, #f3f4f6 0%, #d1d5db 100%)"}}>
      <div className="mx-auto max-w-4xl px-6 py-16 sm:px-10">
        {/* Back Link */}
        <Link href="/" className="mb-8 inline-flex items-center text-sm text-neutral-600 hover:text-neutral-800 transition">
          ← Zurück zur Startseite
        </Link>

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
          <Link
            href="/spielleiter"
            className="group rounded-2xl bg-white p-10 shadow-md transition hover:-translate-y-2 hover:shadow-lg border-2 border-neutral-400"
          >
            <div className="mb-6 text-5xl">👥</div>
            <h2 className="mb-3 text-2xl font-bold text-neutral-800">Spiel für Gruppen</h2>
            <p className="mb-6 text-neutral-600">
              Erstelle ein Multiplayer-Spiel. Du erhältst Codes zum Verteilen und steuerst alles über das Spielleiter-Dashboard.
            </p>
            <button className="inline-block rounded-lg bg-neutral-400 px-6 py-2 text-sm font-semibold text-white transition hover:bg-neutral-600">
              Als Spielleiter starten
            </button>
          </Link>

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
      </div>
    </main>
  );
}

