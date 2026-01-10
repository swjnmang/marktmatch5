"use client";

import Link from "next/link";

export default function CreateGame() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 px-6 py-16">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <Link
            href="/"
            className="text-sm font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-2"
          >
            ← Zurück zur Startseite
          </Link>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-lg ring-1 ring-slate-200 mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Spiel erstellen</h1>
          <p className="text-slate-600">
            Wähle, welche Art von Spiel du starten möchtest.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Multiplayer Game */}
          <Link
            href="/spielleiter"
            className="group flex flex-col gap-4 rounded-2xl bg-white p-8 shadow-lg ring-1 ring-slate-200 transition hover:shadow-xl hover:-translate-y-1"
          >
            <div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-sky-100 mb-3">
                <span className="text-xl">👥</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Multiplayer Spiel</h2>
            </div>
            <p className="text-slate-600 flex-grow">
              Erstelle ein Spiel für mehrere Gruppen. Du erhältst Codes zum Verteilen und steuert alles über ein Spielleiter-Dashboard.
            </p>
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <span className="text-sm font-semibold text-sky-600">Spiel für Gruppen</span>
              <span className="text-sky-600 group-hover:translate-x-0.5 transition">→</span>
            </div>
          </Link>

          {/* Solo Mode */}
          <Link
            href="/solo"
            className="group flex flex-col gap-4 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 p-8 shadow-lg ring-1 ring-purple-200 transition hover:shadow-xl hover:-translate-y-1"
          >
            <div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-purple-200 mb-3">
                <span className="text-xl">🤖</span>
              </div>
              <h2 className="text-2xl font-bold text-purple-900">Solo-Modus</h2>
            </div>
            <p className="text-purple-900/80 flex-grow">
              Spiele allein gegen 4 intelligente KI-Gegner. Perfekt zum Üben, Lernen oder einfach nur zum Spaß!
            </p>
            <div className="flex items-center justify-between pt-4 border-t border-purple-200">
              <span className="text-sm font-semibold text-purple-600">Gegen KI spielen</span>
              <span className="text-purple-600 group-hover:translate-x-0.5 transition">→</span>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
