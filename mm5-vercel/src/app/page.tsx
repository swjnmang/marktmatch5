"use client";

import Link from "next/link";
import { VERSION } from "@/lib/version";
import { ui } from "@/lib/ui";

export default function Home() {
  return (
    <main className={ui.page.shell}>
      <div className={ui.page.overlay} />
      <div className={ui.page.wideContainer}>
        <header className="space-y-4">
          <h1 className={ui.header.title}>
            Markt-Match 5 – Wirtschaftsplanspiel für Schulen & Trainings
          </h1>
          <p className={ui.header.subtitle}>
            Gründe dein eigenes Unternehmen, triff strategische Entscheidungen und konkurriere mit anderen Gruppen. Alles digital im Browser – kostenlos und ohne Installation.
          </p>
        </header>


        <section className="space-y-6">
          <div className="space-y-3">
            <h2 className={ui.section.title}>Was ist Markt-Match 5?</h2>
            <p className={ui.text.secondary}>
              Ein digitales Planspiel für Schulen und Universitäten. Gruppen gründen ihre eigene Smartwatch-Fabrik und treffen realistische unternehmerische Entscheidungen über mehrere Spielperioden. Der Spielleiter kontrolliert das Spiel über ein intuitives Dashboard und teilt Gruppen-Codes aus. Perfekt für Wirtschaftsunterricht, Workshops und betriebliche Trainings.
            </p>
          </div>

          {/* Main CTAs */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Link
              href="/spiel-erstellen"
              className={`group flex flex-col gap-3 ${ui.card.padded} transition hover:-translate-y-1 hover:ring-white/20`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Spiel erstellen</h3>
                <span className="text-3xl group-hover:scale-110 transition">▶️</span>
              </div>
              <p className={ui.text.secondary}>
                Starten Sie ein Multiplayer-Spiel für Ihre Gruppen oder spielen Sie solo gegen KI-Gegner.
              </p>
            </Link>

            <Link
              href="/gruppe"
              className={`group flex flex-col gap-3 ${ui.card.padded} transition hover:-translate-y-1 hover:ring-white/20`}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Spiel beitreten</h3>
                <span className="text-3xl group-hover:scale-110 transition">👥</span>
              </div>
              <p className={ui.text.secondary}>
                Treten Sie einem laufenden Spiel bei und geben Sie Ihre Entscheidungen ab.
              </p>
            </Link>
          </div>

          {/* Feature Pills */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className={ui.card.base + " " + ui.card.padded}>
              <p className="font-semibold text-white mb-1">✨ Kostenlos & im Browser</p>
              <p className={ui.text.muted}>Keine Installation. Funktioniert auf jedem Gerät.</p>
            </div>
            <div className={ui.card.base + " " + ui.card.padded}>
              <p className="font-semibold text-white mb-1">👨‍💼 Mehrere Rollen</p>
              <p className={ui.text.muted}>Gruppe, Spielleitung, Solo – klare Strukturen.</p>
            </div>
            <div className={ui.card.base + " " + ui.card.padded}>
              <p className="font-semibold text-white mb-1">📊 Realistische Logik</p>
              <p className={ui.text.muted}>Produktion, Preis, Lager & Markt mit Simulationen.</p>
            </div>
          </div>
        </section>

        {/* Footer Links */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-center text-xs text-slate-300">
          <Link
            href="/admin"
            className={ui.header.backLink}
          >
            Master Admin
          </Link>
          <span className="text-slate-500">•</span>
          <button
            onClick={() => {
              const modal = document.getElementById('impressum-modal');
              if (modal) modal.classList.remove('hidden');
            }}
            className={ui.header.backLink}
          >
            Impressum
          </button>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">Letzte Aktualisierung: {VERSION.date}, {VERSION.time} Uhr</span>
        </div>

        {/* Impressum Modal */}
        <div
          id="impressum-modal"
          className="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              const modal = document.getElementById('impressum-modal');
              if (modal) modal.classList.add('hidden');
            }
          }}
        >
          <div className={`relative max-w-lg mx-4 ${ui.card.padded} ring-1 ring-white/10`}>
            <button
              onClick={() => {
                const modal = document.getElementById('impressum-modal');
                if (modal) modal.classList.add('hidden');
              }}
              className="absolute top-4 right-4 text-slate-300 hover:text-white transition"
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold text-white mb-6">Impressum</h2>
            <div className="space-y-4 text-sm text-slate-200">
              <div>
                <p className="font-semibold text-white mb-1">Angaben gemäß § 5 TMG</p>
                <p>Jonathan Mangold</p>
                <p>c/o Schenkenstraße 10</p>
                <p>74544 Michelbach, Deutschland</p>
              </div>
              <div>
                <p className="font-semibold text-white mb-1">Vertreten durch</p>
                <p>Jonathan Mangold</p>
              </div>
              <div>
                <p className="font-semibold text-white mb-1">Kontakt</p>
                <p>E-Mail: <a href="mailto:info@nachhilfe-wirtschaftsschule.de" className="text-sky-300 hover:text-sky-200 underline">info@nachhilfe-wirtschaftsschule.de</a></p>
              </div>
              <div>
                <p className="font-semibold text-white mb-1">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</p>
                <p>Jonathan Mangold (Anschrift wie oben)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
