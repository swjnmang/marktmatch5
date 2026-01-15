"use client";

import Link from "next/link";
import { VERSION } from "@/lib/version";
import ScreenshotSlider from "@/components/ScreenshotSlider";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden" style={{background: "linear-gradient(135deg, #f3f4f6 0%, #d1d5db 100%)"}}>
      <div className="mx-auto max-w-6xl px-6 py-16 sm:px-10">
        {/* Header */}
        <header className="mb-16 text-center text-neutral-800">
          <h1 className="mb-6 text-5xl font-bold tracking-tight sm:text-6xl">Markt-Match 5</h1>
          <p className="mx-auto max-w-2xl text-xl leading-relaxed opacity-95">
            Dein Unternehmensplanspiel. Modern. Digital. Kostenlos.
          </p>
        </header>

        {/* CTA Cards */}
        <div className="mb-20 grid gap-8 sm:grid-cols-2">
          <Link
            href="/spiel-erstellen"
            className="group rounded-2xl bg-white p-10 shadow-md transition hover:-translate-y-2 hover:shadow-lg border-2 border-neutral-400 text-center flex flex-col items-center"
          >
            <div className="mb-6 text-5xl">🚀</div>
            <h3 className="mb-3 text-2xl font-bold text-neutral-800">Spiel erstellen</h3>
            <p className="mb-6 text-neutral-600">
              Gründe dein Unternehmen und führe es zum Erfolg. Allein oder mit deinem Team.
            </p>
            <button className="inline-block rounded-lg bg-neutral-400 px-6 py-2 text-sm font-semibold text-white transition hover:bg-neutral-600">
              Spiel erstellen
            </button>
          </Link>

          <Link
            href="/gruppe"
            className="group rounded-2xl bg-white p-10 shadow-md transition hover:-translate-y-2 hover:shadow-lg border-2 border-neutral-400 text-center flex flex-col items-center"
          >
            <div className="mb-6 text-5xl">🎮</div>
            <h3 className="mb-3 text-2xl font-bold text-neutral-800">Spiel beitreten</h3>
            <p className="mb-6 text-neutral-600">
              Tritt einem laufenden Spiel bei und treffe strategische Entscheidungen.
            </p>
            <button className="inline-block rounded-lg bg-neutral-400 px-6 py-2 text-sm font-semibold text-white transition hover:bg-neutral-600">
              Code eingeben
            </button>
          </Link>
        </div>

        {/* Features */}
        <div className="mb-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-xl bg-white p-8 shadow-md border-2 border-neutral-300 text-center hover:shadow-lg transition hover:-translate-y-1">
            <div className="mb-4 text-4xl flex justify-center">⚡</div>
            <h4 className="mb-2 text-base font-semibold text-neutral-800">Schnell starten</h4>
            <p className="text-sm text-neutral-600">In 2 Min einsatzbereit</p>
          </div>
          <div className="rounded-xl bg-white p-8 shadow-md border-2 border-neutral-300 text-center hover:shadow-lg transition hover:-translate-y-1">
            <div className="mb-4 text-4xl flex justify-center">📊</div>
            <h4 className="mb-2 text-base font-semibold text-neutral-800">Live-Auswertung</h4>
            <p className="text-sm text-neutral-600">Ergebnisse in Echtzeit</p>
          </div>
          <div className="rounded-xl bg-white p-8 shadow-md border-2 border-neutral-300 text-center hover:shadow-lg transition hover:-translate-y-1">
            <div className="mb-4 text-4xl flex justify-center">🎓</div>
            <h4 className="mb-2 text-base font-semibold text-neutral-800">Lehrreich</h4>
            <p className="text-sm text-neutral-600">Wirtschaft verstehen</p>
          </div>
          <div className="rounded-xl bg-white p-8 shadow-md border-2 border-neutral-300 text-center hover:shadow-lg transition hover:-translate-y-1">
            <div className="mb-4 text-4xl flex justify-center">👥</div>
            <h4 className="mb-2 text-base font-semibold text-neutral-800">Multiplayer</h4>
            <p className="text-sm text-neutral-600">Mit Teams spielen</p>
          </div>
          <div className="rounded-xl bg-white p-8 shadow-md border-2 border-neutral-300 text-center hover:shadow-lg transition hover:-translate-y-1">
            <div className="mb-4 text-4xl flex justify-center">💰</div>
            <h4 className="mb-2 text-base font-semibold text-neutral-800">Kostenlos</h4>
            <p className="text-sm text-neutral-600">Ohne Gebühren</p>
          </div>
        </div>

        {/* Game Description */}
        <div className="mb-20 rounded-2xl bg-white p-10 shadow-md border-2 border-neutral-400">
          <h3 className="mb-6 text-2xl font-bold text-neutral-800">🎮 Was ist Markt-Match 5?</h3>
          
          <p className="mb-4 text-base leading-relaxed text-neutral-600">
            Markt-Match 5 ist ein innovatives <strong>digitales Planspiel für Schulen und Universitäten</strong>, das wirtschaftliches Denken 
            durch praktische Erfahrung vermittelt. Perfekt zum Schuljahres- oder Semesterbeginn geeignet.
          </p>
          
          <p className="mb-6 text-base leading-relaxed text-neutral-600">
            <strong>So funktioniert's:</strong> Ein Gruppenleiter (Lehrer/Professor) erstellt ein Spiel und verteilt einen Code an die Gruppen. 
            Diese treten bei und konkurrieren gegeneinander. Alternativ können Einzelne auch im <strong>Solo-Modus</strong> spielen.
          </p>

          <p className="mb-4 font-semibold text-neutral-800">Das machst du im Spiel:</p>
          <ul className="columns-2 gap-8 text-sm text-neutral-600">
            <li className="mb-3 list-none before:mr-3 before:inline-block before:font-bold before:text-neutral-800 before:content-['✓']">
              <strong>Maschinen kaufen:</strong> Wähle Produktionsmaschinen mit verschiedenen Kapazitäten
            </li>
            <li className="mb-3 list-none before:mr-3 before:inline-block before:font-bold before:text-neutral-800 before:content-['✓']">
              <strong>Produktion planen:</strong> Entscheide, wie viele Einheiten du produzierst
            </li>
            <li className="mb-3 list-none before:mr-3 before:inline-block before:font-bold before:text-neutral-800 before:content-['✓']">
              <strong>Preise setzen:</strong> Berechne den optimalen Verkaufspreis
            </li>
            <li className="mb-3 list-none before:mr-3 before:inline-block before:font-bold before:text-neutral-800 before:content-['✓']">
              <strong>Marketing investieren:</strong> Steigere deine Marktpräsenz strategisch
            </li>
            <li className="mb-3 list-none before:mr-3 before:inline-block before:font-bold before:text-neutral-800 before:content-['✓']">
              <strong>F&E nutzen:</strong> Verbessere deine Produktion durch Forschung
            </li>
            <li className="list-none before:mr-3 before:inline-block before:font-bold before:text-neutral-800 before:content-['✓']">
              <strong>Konkurrieren:</strong> Übertrumpfe andere Teams mit cleverer Strategie
            </li>
          </ul>
        </div>

        {/* Screenshot Slider */}
        <div className="mb-20">
          <h3 className="mb-8 text-2xl font-bold text-neutral-800 text-center">📸 Schau dir das Spiel in Aktion an</h3>
          <ScreenshotSlider />
        </div>

        {/* Footer */}
        <div className="border-t border-neutral-300 pt-8 text-center text-xs text-neutral-500">
          <div className="mb-4 flex flex-wrap justify-center gap-1">
            <Link href="/admin" className="hover:text-neutral-800 transition">
              Master Admin
            </Link>
            <span className="text-neutral-400">•</span>
            <button 
              onClick={() => {
                const modal = document.getElementById('impressum-modal');
                if (modal) modal.classList.remove('hidden');
              }}
              className="hover:text-neutral-800 transition"
            >
              Impressum
            </button>
            <span className="text-neutral-400">•</span>
            <span>Letzte Aktualisierung: {VERSION.date}, {VERSION.time} Uhr</span>
          </div>
        </div>
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
        <div className="relative mx-4 max-w-lg rounded-2xl bg-white p-10 shadow-md border-2 border-neutral-400">
          <button
            onClick={() => {
              const modal = document.getElementById('impressum-modal');
              if (modal) modal.classList.add('hidden');
            }}
            className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 transition"
          >
            ✕
          </button>
          <h2 className="mb-6 text-2xl font-bold text-neutral-800">Impressum</h2>
          <div className="space-y-4 text-sm text-neutral-600">
            <div>
              <p className="mb-1 font-semibold text-neutral-800">Angaben gemäß § 5 TMG</p>
              <p>Jonathan Mangold</p>
              <p>c/o Schenkenstraße 10</p>
              <p>74544 Michelbach, Deutschland</p>
            </div>
            <div>
              <p className="mb-1 font-semibold text-neutral-800">Vertreten durch</p>
              <p>Jonathan Mangold</p>
            </div>
            <div>
              <p className="mb-1 font-semibold text-neutral-800">Kontakt</p>
              <p>E-Mail: <a href="mailto:info@wss-digital.de" className="text-neutral-600 hover:underline">info@wss-digital.de</a></p>
            </div>
            <div>
              <p className="mb-1 font-semibold text-neutral-800">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</p>
              <p>Jonathan Mangold (Anschrift wie oben)</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

