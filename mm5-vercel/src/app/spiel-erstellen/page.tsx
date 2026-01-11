"use client";

import Link from "next/link";
import { ui } from "@/lib/ui";

export default function CreateGame() {
  return (
    <main className={ui.page.shell}>
      <div className={ui.page.overlay} />
      <div className={ui.page.container}>
        <div className="flex items-center justify-between">
          <Link href="/" className={ui.header.backLink}>
            ← Zurück zur Startseite
          </Link>
        </div>

        <div className={ui.card.padded}>
          <p className={ui.header.kicker}>Spiel erstellen</p>
          <h1 className="text-3xl font-bold text-white sm:text-4xl mb-2">Was möchtest du starten?</h1>
          <p className={ui.header.subtitle}>
            Wähle Multiplayer für Gruppen oder Solo gegen KI-Gegner.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <Link
            href="/spielleiter"
            className={`group flex flex-col gap-4 ${ui.card.padded} transition hover:-translate-y-1 hover:ring-white/20`}
          >
            <div className="flex items-center justify-between">
              <div className={ui.pill}>👥 Multiplayer</div>
              <span className="text-lg text-sky-200 group-hover:translate-x-0.5 transition">▶️</span>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Spiel für Gruppen</h2>
              <p className="text-slate-200">
                Erstelle ein Spiel für mehrere Gruppen. Du erhältst Codes zum Verteilen und steuerst alles über das Spielleiter-Dashboard.
              </p>
            </div>
          </Link>

          <Link
            href="/solo"
            className={`group flex flex-col gap-4 ${ui.card.padded} transition hover:-translate-y-1 hover:ring-white/20`}
          >
            <div className="flex items-center justify-between">
              <div className={ui.pill}>🤖 Solo</div>
              <span className="text-lg text-sky-200 group-hover:translate-x-0.5 transition">▶️</span>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-white">Gegen KI spielen</h2>
              <p className="text-slate-200">
                Spiele allein gegen 4 KI-Gegner. Perfekt zum Üben, Lernen oder einfach zum Spaß – ohne Warten.
              </p>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
