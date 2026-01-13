'use client';

import Link from "next/link";

const materialien = [
  {
    title: "Arbeitsauftrag: Vorstellungsrunde",
    description: "Strukturierter Ablauf für die Vorstellung der Gruppen und Rollenverteilung.",
    icon: "👥",
    pdfUrl: "https://markt-match.de/materialien/arbeitsauftrag-vorstellungsrunde.pdf",
  },
  {
    title: "Arbeitsauftrag: Marketingkonzept",
    description: "Anleitung zur Entwicklung eines Marketingkonzepts für die Smartwatch-Produkte.",
    icon: "📊",
    pdfUrl: "https://markt-match.de/materialien/arbeitsauftrag-marketingkonzept.pdf",
  },
  {
    title: "Reflexionsphasen & Auswertung",
    description: "Leitfaden für Reflexionsphasen nach jeder Periode und Gesamtauswertung.",
    icon: "💭",
    pdfUrl: "https://markt-match.de/materialien/reflexionsphasen-auswertung.pdf",
  },
  {
    title: "Glossar wirtschaftlicher Begriffe",
    description: "Übersicht wichtiger wirtschaftlicher Fachbegriffe für das Planspiel.",
    icon: "📖",
    pdfUrl: "https://markt-match.de/materialien/glossar-wirtschaftliche-begriffe.pdf",
  },
  {
    title: "Kennenlernspiele Vorschläge",
    description: "Sammlung von Kennenlernspielen für den Einstieg in das Planspiel.",
    icon: "🎯",
    pdfUrl: "https://markt-match.de/materialien/kennenlernspiele-vorschlaege.pdf",
  },
];

export default function MaterialienPage() {
  return (
    <main className="relative min-h-screen overflow-hidden" style={{background: "linear-gradient(135deg, #f3f4f6 0%, #d1d5db 100%)"}}>
      <div className="mx-auto max-w-4xl px-6 py-16 sm:px-10">
        {/* Back Link */}
        <Link href="/" className="mb-8 inline-flex items-center text-sm text-neutral-600 hover:text-neutral-800 transition">
          ← Zurück zur Startseite
        </Link>

        {/* Header */}
        <header className="mb-12 text-center text-neutral-800">
          <p className="mb-2 text-sm font-semibold text-neutral-500 uppercase tracking-widest">Materialien</p>
          <h1 className="mb-4 text-4xl font-bold">Begleitmaterial</h1>
          <p className="text-lg text-neutral-700">
            Arbeitsblätter, Anleitungen und Vorlagen für das Planspiel.
          </p>
        </header>

        {/* Materials List */}
        <div className="rounded-2xl bg-white p-10 shadow-md border-2 border-neutral-400">
          <div className="space-y-4">
            {materialien.map((material, index) => (
              <div
                key={index}
                className="flex items-start gap-4 rounded-lg border border-neutral-200 bg-neutral-50 p-4 transition hover:border-neutral-400 hover:bg-white"
              >
                <div className="text-3xl">{material.icon}</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-neutral-800">{material.title}</h3>
                  <p className="mt-1 text-sm text-neutral-600">{material.description}</p>
                </div>
                <a
                  href={material.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block rounded-lg bg-neutral-400 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-600 whitespace-nowrap"
                >
                  📥 Download
                </a>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-neutral-700">
            <p className="text-sm">
              <strong>ℹ️ Hinweis:</strong> Die Materialien basieren auf dem originalen Markt-Match 5 Planspiel.
              Sie können zur Vorbereitung, Durchführung und Nachbereitung des Spiels verwendet werden.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

