'use client';

import Link from "next/link";
import { ui } from "@/lib/ui";

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
    <main className={ui.page.shell}>
      <div className={ui.page.overlay} />
      <section className={`${ui.page.container} max-w-4xl`}>
        <div className="text-center space-y-2">
          <p className={ui.header.kicker}>Materialien</p>
          <h1 className="text-4xl font-bold text-white">Begleitmaterial</h1>
          <p className={ui.header.subtitle}>
            Arbeitsblätter, Anleitungen und Vorlagen für das Planspiel.
          </p>
        </div>

        <div className={ui.card.padded}>
          <div className="space-y-4">
            {materialien.map((material, index) => (
              <div
                key={index}
                className="flex items-start gap-4 rounded-lg border border-white/10 bg-white/5 p-4 transition hover:border-sky-300/60 hover:bg-white/10"
              >
                <div className="text-3xl">{material.icon}</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-white">{material.title}</h3>
                  <p className="mt-1 text-sm text-slate-200">{material.description}</p>
                </div>
                <a
                  href={material.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={ui.cta.primary}
                >
                  📥 Download
                </a>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-lg border border-white/10 bg-white/5 p-4 text-slate-200">
            <p className="text-sm">
              <strong>ℹ️ Hinweis:</strong> Die Materialien basieren auf dem originalen Markt-Match 5 Planspiel.
              Sie können zur Vorbereitung, Durchführung und Nachbereitung des Spiels verwendet werden.
            </p>
          </div>
        </div>

        <Link
          href="/"
          className={`${ui.header.backLink} block text-center`}
        >
          ← Zurück zur Startseite
        </Link>
      </section>
    </main>
  );
}
