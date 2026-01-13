"use client";

import Link from "next/link";

export default function Settings() {
  return (
    <main className="relative min-h-screen overflow-hidden" style={{background: "linear-gradient(135deg, #f3f4f6 0%, #d1d5db 100%)"}}>
      <div className="mx-auto max-w-4xl px-6 py-16 sm:px-10">
        {/* Back Link */}
        <Link href="/" className="mb-8 inline-flex items-center text-sm text-neutral-600 hover:text-neutral-800 transition">
          ← Zurück zur Startseite
        </Link>

        {/* Header */}
        <header className="mb-12 text-neutral-800">
          <p className="mb-2 text-sm font-semibold text-neutral-500 uppercase tracking-widest">Einstellungen</p>
          <h1 className="mb-4 text-4xl font-bold">Anwendungseinstellungen</h1>
          <p className="text-lg text-neutral-700">
            Konfiguriere deine Markt-Match 5 Erfahrung.
          </p>
        </header>

        {/* Settings Card */}
        <div className="rounded-2xl bg-white p-10 shadow-md border-2 border-neutral-400">
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-neutral-800 mb-4">🎨 Design</h2>
              <p className="text-neutral-600 mb-4">
                Markt-Match 5 verwendet ein modernes, neutrales Design für eine optimale Benutzererfahrung.
              </p>
              <div className="rounded-lg bg-neutral-50 border border-neutral-200 p-6">
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-lg" style={{background: "linear-gradient(135deg, #f3f4f6 0%, #d1d5db 100%)"}}>
                  <span className="text-neutral-800 font-semibold">Aktuelles Design</span>
                  <span className="text-2xl">✓</span>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-neutral-800 mb-4">🔊 Benachrichtigungen</h2>
              <p className="text-neutral-600 mb-4">
                Erhalte Benachrichtigungen über wichtige Spielereignisse:
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <input type="checkbox" defaultChecked className="mt-1" />
                  <div>
                    <p className="font-semibold text-neutral-800">Phase endet</p>
                    <p className="text-sm text-neutral-600">Warnung vor Ende der aktuellen Periode</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <input type="checkbox" defaultChecked className="mt-1" />
                  <div>
                    <p className="font-semibold text-neutral-800">Spielstart</p>
                    <p className="text-sm text-neutral-600">Bestätigung wenn alle Gruppen bereit sind</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <input type="checkbox" defaultChecked className="mt-1" />
                  <div>
                    <p className="font-semibold text-neutral-800">Spielende</p>
                    <p className="text-sm text-neutral-600">Ankündigung zum Ende des Spiels</p>
                  </div>
                </li>
              </ul>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-neutral-800 mb-4">📱 Über die App</h2>
              <p className="text-neutral-600 mb-4">
                Markt-Match 5 ist eine moderne, digitale Plattform für Unternehmensplanspiele.
              </p>
              <ul className="space-y-2 text-sm text-neutral-600">
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

