"use client";

import Link from "next/link";
import { VERSION } from "@/lib/version";
import { useEffect, useState } from "react";
import { getTheme, type ThemeName } from "@/lib/themes";

export default function Home() {
  const [theme] = useState(() => {
    if (typeof window !== "undefined") {
      const savedTheme = (localStorage.getItem("theme") as ThemeName) || "light";
      return getTheme(savedTheme);
    }
    return getTheme();
  });
  const mounted = typeof window !== "undefined";

  // Theme is initialized lazily from localStorage; no effect needed.

  if (!mounted) return null;

  return (
    <main className={`relative min-h-screen overflow-hidden ${theme.bgGradient}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.08),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(37,99,235,0.08),transparent_25%)]" />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-12 px-6 py-16 sm:px-10">
        <header className="flex flex-col gap-3 sm:gap-4">
          <h1 className={`text-3xl font-bold leading-tight ${theme.text} sm:text-4xl lg:text-5xl`}>
            Markt-Match 5 – ein Wirtschaftsplanspiel für Einsteiger
          </h1>
          <p className={`text-base ${theme.subtext} sm:text-lg leading-relaxed text-justify`}>
            Willkommen bei Markt-Match 5! In diesem digitalen Unternehmensplanspiel gründet ihr eure eigene Firma zur Produktion günstiger Smartwatches für eine junge Zielgruppe. Als Unternehmer trefft ihr wichtige Entscheidungen: Welche Produktionsmaschine kaufen? Wie viele Einheiten produzieren? Zu welchem Preis verkaufen? Investieren in Marketing oder Forschung & Entwicklung?
          </p>
          <p className={`text-base ${theme.subtext} sm:text-lg text-justify`}>
            Wetteifert mit anderen Gruppen am Markt, optimiert eure Strategie über mehrere Perioden und versucht, den größten Gewinn zu erzielen. Die Spielleitung steuert das Spiel über ein Dashboard, verteilt Codes und gibt die Ergebnisse frei – alles digital im Browser.
          </p>
        </header>

        <section className="grid gap-6 grid-cols-1">
          <div className={`space-y-4 rounded-2xl ${theme.card} p-8 shadow-lg ring-1 ${theme.cardBorder}`}>
            <h2 className={`text-xl font-semibold ${theme.text}`}>Rollen wählen</h2>
            <p className={theme.subtext}>
              Starte ein neues Spiel oder tritt einem bestehenden Spiel bei.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Link
                href="/spiel-erstellen"
                className={`group flex flex-col gap-2 rounded-xl ${theme.name === "dark" ? "bg-gray-800" : theme.accentLight} px-5 py-4 ring-1 ${theme.name === "dark" ? "ring-gray-700" : "ring-sky-100"} transition hover:-translate-y-0.5 hover:shadow-md`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-base font-semibold ${theme.name === "dark" ? "text-white" : "text-sky-900"}`}>Spiel erstellen</span>
                  <span className={`text-xs font-medium ${theme.name === "dark" ? "text-gray-300" : "text-sky-700"} group-hover:translate-x-0.5 transition`}>
                    Los geht&apos;s →
                  </span>
                </div>
                <p className={`text-sm ${theme.name === "dark" ? "text-gray-300" : "text-sky-900/80"}`}>
                  Starte ein Multiplayer-Spiel für Gruppen oder spiele allein im Solo-Modus.
                </p>
              </Link>
              <Link
                href="/gruppe"
                className={`group flex flex-col gap-2 rounded-xl ${theme.card} px-5 py-4 ring-1 ${theme.cardBorder} transition hover:-translate-y-0.5 hover:shadow-md`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-base font-semibold ${theme.text}`}>Spiel beitreten</span>
                  <span className={`text-xs font-medium ${theme.subtext} group-hover:translate-x-0.5 transition`}>
                    Beitreten →
                  </span>
                </div>
                <p className={`text-sm ${theme.subtext}`}>
                  Tritt einem laufenden Spiel bei und gib deine Entscheidungen ab.
                </p>
              </Link>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-white/70 backdrop-blur p-4 ring-1 ring-white/30">
                <p className="text-sm font-semibold text-slate-900">Kostenlos & im Browser</p>
                <p className="text-xs text-slate-600">Keine Installation. Ideal für Schule, Workshops und Trainings.</p>
              </div>
              <div className="rounded-xl bg-white/70 backdrop-blur p-4 ring-1 ring-white/30">
                <p className="text-sm font-semibold text-slate-900">Mehrere Rollen</p>
                <p className="text-xs text-slate-600">Gruppe, Spielleitung, Solo – klare Abläufe und Auswertungen.</p>
              </div>
              <div className="rounded-xl bg-white/70 backdrop-blur p-4 ring-1 ring-white/30">
                <p className="text-sm font-semibold text-slate-900">Realistische Entscheidungen</p>
                <p className="text-xs text-slate-600">Produktion, Preis, Lager & Markt mit nachvollziehbarer Logik.</p>
              </div>
            </div>
          </div>

        </section>

        {/* Footer Links */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-center text-xs text-slate-400">
          <Link
            href="/admin"
            className="hover:text-slate-600 transition"
          >
            Master Admin
          </Link>
          <span className="text-slate-300">•</span>
          <button
            onClick={() => {
              const modal = document.getElementById('impressum-modal');
              if (modal) modal.classList.remove('hidden');
            }}
            className="hover:text-slate-600 transition"
          >
            Impressum
          </button>
          <span className="text-slate-300">•</span>
          <span>Letzte Aktualisierung: {VERSION.date}, {VERSION.time} Uhr</span>
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
          <div className="relative max-w-lg mx-4 bg-white rounded-2xl shadow-2xl p-8 ring-1 ring-slate-200">
            <button
              onClick={() => {
                const modal = document.getElementById('impressum-modal');
                if (modal) modal.classList.add('hidden');
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Impressum</h2>
            <div className="space-y-4 text-sm text-slate-700">
              <div>
                <p className="font-semibold text-slate-900 mb-1">Angaben gemäß § 5 TMG</p>
                <p>Jonathan Mangold</p>
                <p>c/o Schenkenstraße 10</p>
                <p>74544 Michelbach, Deutschland</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900 mb-1">Vertreten durch</p>
                <p>Jonathan Mangold</p>
              </div>
              <div>
                <p className="font-semibold text-slate-900 mb-1">Kontakt</p>
                <p>E-Mail: <a href="mailto:info@nachhilfe-wirtschaftsschule.de" className="text-sky-600 hover:underline">info@nachhilfe-wirtschaftsschule.de</a></p>
              </div>
              <div>
                <p className="font-semibold text-slate-900 mb-1">Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</p>
                <p>Jonathan Mangold (Anschrift wie oben)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
