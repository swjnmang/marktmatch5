import Link from "next/link";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-sky-50 via-white to-blue-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.08),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(37,99,235,0.08),transparent_25%)]" />
      <div className="relative mx-auto flex max-w-6xl flex-col gap-12 px-6 py-16 sm:px-10">
        <header className="flex flex-col gap-3 sm:gap-4">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-600">
            Markt-Match 5
          </p>
          <h1 className="text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
            Unternehmensplanspiel – digital für Spielleitung und Gruppen
          </h1>
          <p className="max-w-2xl text-base text-slate-600 sm:text-lg">
            Erstelle eine Spiel-Lobby, teile Codes mit bis zu 10 Gruppen und steuere jede Periode direkt im Browser. Gruppen geben ihre Entscheidungen selbst ein – du behältst das Dashboard im Blick.
          </p>
          <div className="flex flex-wrap gap-3 text-sm text-slate-600">
            <span className="rounded-full bg-white px-3 py-1 shadow-sm ring-1 ring-slate-200">Next.js + Firebase</span>
            <span className="rounded-full bg-white px-3 py-1 shadow-sm ring-1 ring-slate-200">Gruppen-Codes & PIN</span>
            <span className="rounded-full bg-white px-3 py-1 shadow-sm ring-1 ring-slate-200">Echtzeit-Dashboard</span>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-4 rounded-2xl bg-white p-8 shadow-lg ring-1 ring-slate-200">
            <h2 className="text-xl font-semibold text-slate-900">Rollen wählen</h2>
            <p className="text-slate-600">
              Starte als Spielleitung ein neues Spiel oder tritt als Gruppe per Code bei.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
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
            </div>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 px-6 py-7 text-slate-50 shadow-lg ring-1 ring-white/10">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Letzte Aktualisierung</p>
            <div className="mt-4 space-y-2">
              <p className="text-2xl font-bold text-white">v1.2.0</p>
              <p className="text-sm text-slate-300">
                09. Januar 2026, 08:30 Uhr
              </p>
              <div className="mt-4 rounded-lg bg-white/5 px-3 py-2.5 text-xs text-slate-200">
                <p className="font-semibold text-white mb-1">Neue Features:</p>
                <ul className="space-y-1">
                  <li>• Maschinenauswahl mit Timer</li>
                  <li>• Live-Status für alle Gruppen</li>
                  <li>• Periode-Timer im Dashboard</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
