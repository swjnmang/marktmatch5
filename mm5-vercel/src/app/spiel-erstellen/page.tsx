"use client";

import Link from "next/link";

export default function CreateGame() {
  return (
    <main className="relative min-h-screen overflow-hidden" style={{background: "linear-gradient(135deg, #4a5568 0%, #0f172a 100%)"}}>
      <div className="mx-auto max-w-4xl px-6 py-16 sm:px-10">
        {/* Back Link */}
        <Link href="/" className="mb-8 inline-flex items-center text-sm text-white/70 hover:text-white transition">
          ← Zurück zur Startseite
        </Link>

        {/* Header */}
        <header className="mb-12 text-white">
          <p className="mb-2 text-sm font-semibold text-white/60 uppercase tracking-widest">Spiel erstellen</p>
          <h1 className="mb-4 text-4xl font-bold">Was möchtest du starten?</h1>
          <p className="text-lg opacity-90">
            Wähle Multiplayer für Gruppen oder Solo gegen KI-Gegner.
          </p>
        </header>

        {/* Options Grid */}
        <div className="grid gap-8 sm:grid-cols-2">
          <Link
            href="/spielleiter"
            className="group rounded-2xl bg-white p-10 shadow-2xl transition hover:-translate-y-2 hover:shadow-3xl"
          >
            <div className="mb-6 text-5xl">👥</div>
            <h2 className="mb-3 text-2xl font-bold text-slate-900">Spiel für Gruppen</h2>
            <p className="mb-6 text-slate-600">
              Erstelle ein Multiplayer-Spiel. Du erhältst Codes zum Verteilen und steuerst alles über das Spielleiter-Dashboard.
            </p>
            <button className="inline-block rounded-lg bg-gradient-to-r from-slate-700 to-slate-900 px-6 py-2 text-sm font-semibold text-white transition hover:opacity-90">
              Als Spielleiter starten
            </button>
          </Link>

          <Link
            href="/solo"
            className="group rounded-2xl bg-white p-10 shadow-2xl transition hover:-translate-y-2 hover:shadow-3xl"
          >
            <div className="mb-6 text-5xl">🤖</div>
            <h2 className="mb-3 text-2xl font-bold text-slate-900">Gegen KI spielen</h2>
            <p className="mb-6 text-slate-600">
              Spiele allein gegen 4 KI-Gegner. Perfekt zum Üben, Lernen oder einfach zum Spaß.
            </p>
            <button className="inline-block rounded-lg bg-gradient-to-r from-slate-700 to-slate-900 px-6 py-2 text-sm font-semibold text-white transition hover:opacity-90">
              Solo spielen
            </button>
          </Link>
        </div>
      </div>
    </main>
  );
}
