import Link from "next/link";
import { VERSION } from "@/lib/version";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-sky-50 via-white to-blue-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.08),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(37,99,235,0.08),transparent_25%)]" />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-12 px-6 py-16 sm:px-10">
        <header className="flex flex-col gap-3 sm:gap-4">
          <h1 className="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl lg:text-5xl">
            Markt-Match 5 – ein Wirtschaftsplanspiel für Einsteiger
          </h1>
          <p className="text-base text-slate-700 sm:text-lg leading-relaxed">
            Willkommen bei Markt-Match 5! In diesem digitalen Unternehmensplanspiel gründet ihr eure eigene Firma zur Produktion günstiger Smartwatches für eine junge Zielgruppe. Als Unternehmer trefft ihr wichtige Entscheidungen: Welche Produktionsmaschine kaufen? Wie viele Einheiten produzieren? Zu welchem Preis verkaufen? Investieren in Marketing oder Forschung & Entwicklung?
          </p>
          <p className="text-base text-slate-600 sm:text-lg">
            Wetteifert mit anderen Gruppen am Markt, optimiert eure Strategie über mehrere Perioden und versucht, den größten Gewinn zu erzielen. Die Spielleitung steuert das Spiel über ein Dashboard, verteilt Codes und gibt die Ergebnisse frei – alles digital im Browser.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4 rounded-2xl bg-white p-8 shadow-lg ring-1 ring-slate-200">
            <h2 className="text-xl font-semibold text-slate-900">Rollen wählen</h2>
            <p className="text-slate-600">
              Starte als Spielleitung ein neues Spiel oder tritt als Gruppe per Code bei.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Link
                href="/spielleiter"
                className="group flex flex-col gap-2 rounded-xl bg-sky-50 px-5 py-4 ring-1 ring-sky-100 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-sky-800">Spielleitung</span>
                  <span className="text-xs font-medium text-sky-700 group-hover:translate-x-0.5 transition">
                    Los geht&apos;s →
                  </span>
                </div>
                <p className="text-sm text-sky-900/80">
                  Lobby erstellen, Codes verteilen, Perioden starten und Ergebnisse freischalten.
                </p>
              </Link>
              <Link
                href="/gruppe"
                className="group flex flex-col gap-2 rounded-xl bg-white px-5 py-4 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-slate-900">Gruppe</span>
                  <span className="text-xs font-medium text-slate-700 group-hover:translate-x-0.5 transition">
                    Beitreten →
                  </span>
                </div>
                <p className="text-sm text-slate-700">
                  Eigenes Gerät nutzen, Code eingeben, Entscheidungen abgeben und Ergebnisse sehen.
                </p>
              </Link>
              <Link
                href="/solo"
                className="group flex flex-col gap-2 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 px-5 py-4 ring-1 ring-purple-200 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-purple-900">Solo-Modus</span>
                  <span className="text-xs font-medium text-purple-700 group-hover:translate-x-0.5 transition">
                    Spielen →
                  </span>
                </div>
                <p className="text-sm text-purple-900/80">
                  Alleine gegen 4 KI-Gegner spielen. Perfekt zum Üben oder Lernen!
                </p>
              </Link>
            </div>
            <div className="mt-4">
              <Link
                href="/materialien"
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 px-5 py-3 ring-1 ring-emerald-200 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="text-xl">📚</span>
                <span className="text-base font-semibold text-emerald-800">Begleitmaterial</span>
                <span className="text-xs font-medium text-emerald-700">
                  Vorlagen & Anleitungen
                </span>
              </Link>
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 px-6 py-7 text-slate-50 shadow-lg ring-1 ring-white/10">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Letzte Aktualisierung</p>
            <div className="mt-4 space-y-2">
              <p className="text-2xl font-bold text-white">v{VERSION.number}</p>
              <p className="text-sm text-slate-300">
                {VERSION.date}, {VERSION.time} Uhr
              </p>
              <div className="mt-4 rounded-lg bg-white/5 px-3 py-2.5 text-xs text-slate-200">
                <p className="font-semibold text-white mb-1">Neue Features:</p>
                <ul className="space-y-1">
                  <li>• Solo-Modus gegen KI-Gegner</li>
                  <li>• Vollständige Spielmechanik</li>
                  <li>• Marktberechnung mit Elastizität</li>
                  <li>• Begleitmaterial-Seite</li>
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
