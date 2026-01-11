"use client";

import Link from "next/link";

export default function Settings() {
  return (
    <main className="relative min-h-screen overflow-hidden" style={{background: "linear-gradient(135deg, #4a5568 0%, #0f172a 100%)"}}>
      <div className="mx-auto max-w-4xl px-6 py-16 sm:px-10">
        {/* Back Link */}
        <Link href="/" className="mb-8 inline-flex items-center text-sm text-white/70 hover:text-white transition">
          ← Zurück zur Startseite
        </Link>

        {/* Header */}
        <header className="mb-12 text-white">
          <p className="mb-2 text-sm font-semibold text-white/60 uppercase tracking-widest">Einstellungen</p>
          <h1 className="mb-4 text-4xl font-bold">Anwendungseinstellungen</h1>
          <p className="text-lg opacity-90">
            Konfiguriere deine Markt-Match 5 Erfahrung.
          </p>
        </header>

        {/* Settings Card */}
        <div className="rounded-2xl bg-white p-10 shadow-2xl">
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">🎨 Design</h2>
              <p className="text-slate-600 mb-4">
                Markt-Match 5 verwendet ein modernes, dunkelblau-graues Design für eine optimale Benutzererfahrung.
              </p>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-6">
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-lg" style={{background: "linear-gradient(135deg, #4a5568 0%, #0f172a 100%)"}}>
                  <span className="text-white font-semibold">Aktuelles Design</span>
                  <span className="text-2xl">✓</span>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">🔊 Benachrichtigungen</h2>
              <p className="text-slate-600 mb-4">
                Erhalte Benachrichtigungen über wichtige Spielereignisse:
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <input type="checkbox" defaultChecked className="mt-1" />
                  <div>
                    <p className="font-semibold text-slate-900">Phase endet</p>
                    <p className="text-sm text-slate-600">Warnung vor Ende der aktuellen Periode</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <input type="checkbox" defaultChecked className="mt-1" />
                  <div>
                    <p className="font-semibold text-slate-900">Spielstart</p>
                    <p className="text-sm text-slate-600">Bestätigung wenn alle Gruppen bereit sind</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <input type="checkbox" defaultChecked className="mt-1" />
                  <div>
                    <p className="font-semibold text-slate-900">Spielende</p>
                    <p className="text-sm text-slate-600">Ankündigung zum Ende des Spiels</p>
                  </div>
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">📱 Über die App</h2>
              <p className="text-slate-600 mb-4">
                Markt-Match 5 ist eine moderne, digitale Plattform für Unternehmensplanspiele.
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li><strong>Version:</strong> 1.2.0</li>
                <li><strong>Erstellt mit:</strong> Next.js 16, React, Tailwind CSS, Firebase</li>
                <li><strong>Browser:</strong> Chrome, Firefox, Safari (mobile & desktop)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
