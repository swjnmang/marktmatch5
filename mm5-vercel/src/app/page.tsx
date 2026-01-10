"use client";

import Link from "next/link";
import { VERSION } from "@/lib/version";
import { useEffect, useState } from "react";
import { getTheme, type ThemeName } from "@/lib/themes";

export default function Home() {
  const [theme, setTheme] = useState(getTheme());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = (localStorage.getItem("theme") as ThemeName) || "light";
    setTheme(getTheme(savedTheme));
  }, []);

  if (!mounted) return null;

  return (
    <main className={`relative min-h-screen overflow-hidden ${theme.bgGradient}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.08),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(37,99,235,0.08),transparent_25%)]" />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-12 px-6 py-16 sm:px-10">
        {/* Header with Settings Button */}
        <div className="flex justify-between items-start">
          <header className="flex flex-col gap-3 sm:gap-4 flex-1">
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
          <Link
            href="/einstellungen"
            className="ml-4 p-2 rounded-lg hover:bg-slate-100/50 transition"
            title="Einstellungen"
          >
            <span className="text-2xl">⚙️</span>
          </Link>
        </div>

        <section className="grid gap-6 grid-cols-1">
          <div className={`space-y-4 rounded-2xl ${theme.card} p-8 shadow-lg ring-1 ${theme.cardBorder}`}>
            <h2 className={`text-xl font-semibold ${theme.text}`}>Rollen wählen</h2>
            <p className={theme.subtext}>
              Starte ein neues Spiel oder tritt einem bestehenden Spiel bei.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Link
                href="/spiel-erstellen"
                className={`group flex flex-col gap-2 rounded-xl ${theme.accentLight} px-5 py-4 ring-1 ring-sky-100 transition hover:-translate-y-0.5 hover:shadow-md`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-base font-semibold ${theme.accent}`}>Spiel erstellen</span>
                  <span className={`text-xs font-medium ${theme.accent} group-hover:translate-x-0.5 transition`}>
                    Los geht&apos;s →
                  </span>
                </div>
                <p className={`text-sm ${theme.accent}/80`}>
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
            <div className="mt-4">
              <Link
                href="/materialien"
                className={`flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 px-5 py-3 ring-1 ring-emerald-200 transition hover:-translate-y-0.5 hover:shadow-md`}
              >
                <span className="text-xl">📚</span>
                <span className="text-base font-semibold text-emerald-800">Begleitmaterial</span>
                <span className="text-xs font-medium text-emerald-700">
                  Vorlagen & Anleitungen
                </span>
              </Link>
            </div>
          </div>

          <div className={`rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 px-6 py-7 text-slate-50 shadow-lg ring-1 ring-white/10`}>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Letzte Aktualisierung</p>
            <div className="mt-4 space-y-2">
              <p className="text-2xl font-bold text-white">v{VERSION.number}</p>
              <p className="text-sm text-slate-300">
                {VERSION.date}, {VERSION.time} Uhr
              </p>
              <div className="mt-4 rounded-lg bg-white/5 px-3 py-2.5 text-xs text-slate-200">
                <p className="font-semibold text-white mb-1">Neue Features:</p>
                <ul className="space-y-1">
                  <li>• Design-Einstellungen (Hell, Dunkel, Natur)</li>
                  <li>• Neu strukturierte Spielerstellung</li>
                  <li>• Solo-Modus gegen KI-Gegner</li>
                  <li>• Vollständige Spielmechanik</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Admin Link - versteckt am unteren Rand */}
        <div className="text-center">
          <Link
            href="/admin"
            className="text-xs text-slate-400 hover:text-slate-600 transition"
          >
            Master Admin
          </Link>
        </div>
      </div>
    </main>
  );
}
