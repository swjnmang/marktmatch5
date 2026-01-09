'use client';

import Link from "next/link";

const materialien = [
  {
    title: "Schülervorlage: Entscheidungen & Ergebnisse",
    description: "Vorlage für Schüler zur Dokumentation ihrer Entscheidungen und Ergebnisse pro Periode.",
    icon: "📋",
  },
  {
    title: "Arbeitsauftrag: Vorstellungsrunde",
    description: "Strukturierter Ablauf für die Vorstellung der Gruppen und Rollenverteilung.",
    icon: "👥",
  },
  {
    title: "Arbeitsauftrag: Marketingkonzept",
    description: "Anleitung zur Entwicklung eines Marketingkonzepts für die Smartwatch-Produkte.",
    icon: "📊",
  },
  {
    title: "Reflexionsphasen & Auswertung",
    description: "Leitfaden für Reflexionsphasen nach jeder Periode und Gesamtauswertung.",
    icon: "💭",
  },
  {
    title: "Glossar wirtschaftlicher Begriffe",
    description: "Übersicht wichtiger wirtschaftlicher Fachbegriffe für das Planspiel.",
    icon: "📖",
  },
  {
    title: "Kennenlernspiele Vorschläge",
    description: "Sammlung von Kennenlernspielen für den Einstieg in das Planspiel.",
    icon: "🎯",
  },
];

export default function MaterialienPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 via-blue-50 to-sky-100 px-4 py-10">
      <section className="mx-auto max-w-4xl space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-900">Begleitmaterial</h1>
          <p className="mt-2 text-slate-600">
            Arbeitsblätter, Anleitungen und Vorlagen für das Planspiel
          </p>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
          <div className="space-y-4">
            {materialien.map((material, index) => (
              <div
                key={index}
                className="flex items-start gap-4 rounded-lg border border-slate-200 p-4 transition hover:border-sky-400 hover:bg-sky-50"
              >
                <div className="text-3xl">{material.icon}</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">{material.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{material.description}</p>
                </div>
                <button
                  onClick={() => alert("Download-Funktion wird in Kürze verfügbar sein.")}
                  className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-700"
                >
                  📥 Download
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-800">
              <strong>ℹ️ Hinweis:</strong> Die Materialien basieren auf dem originalen Markt-Match 5 Planspiel.
              Sie können zur Vorbereitung, Durchführung und Nachbereitung des Spiels verwendet werden.
            </p>
          </div>
        </div>

        <Link
          href="/"
          className="block text-center text-sm font-semibold text-sky-700 underline-offset-4 hover:underline"
        >
          ← Zurück zur Startseite
        </Link>
      </section>
    </main>
  );
}
