"use client";

import { Suspense } from "react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function GruppePage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-10 px-6 py-14 sm:px-10">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-sky-600">
          Gruppe
        </p>
        <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
          Einer Lobby beitreten
        </h1>
        <p className="text-base text-slate-600">
          Nutze den QR-Code oder den Link von deiner Spielleitung um einer Lobby beizutreten.
        </p>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-lg ring-1 ring-slate-200">
        <div className="space-y-6">
          <div className="rounded-lg bg-sky-50 p-4 border-l-4 border-sky-600">
            <h3 className="font-semibold text-sky-900 mb-2">📱 Beste Option: QR-Code scannen</h3>
            <p className="text-sm text-sky-800">
              Lass deine Spielleitung einen QR-Code generieren. Mit einem Smartphone-Kamera oder QR-Scanner kannst du direkt beitreten.
            </p>
          </div>

          <div className="rounded-lg bg-blue-50 p-4 border-l-4 border-blue-600">
            <h3 className="font-semibold text-blue-900 mb-2">🔗 Alternative: Direkter Link</h3>
            <p className="text-sm text-blue-800">
              Wenn deine Spielleitung dir einen Link schickt (z.B. von WhatsApp), öffne diesen einfach direkt mit dieser App.
            </p>
          </div>

          <div className="rounded-lg bg-amber-50 p-4 border-l-4 border-amber-600">
            <h3 className="font-semibold text-amber-900 mb-2">⚠️ Hinweis</h3>
            <p className="text-sm text-amber-800">
              Du kannst hier nicht manuell mit einer PIN beitreten. Der Spielleiter musste für dich einen QR-Code oder einen Link generieren.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-2">
          <p className="text-sm font-semibold text-slate-700">Hast du den QR-Code oder Link noch nicht?</p>
          <p className="text-sm text-slate-600">
            Kontaktiere deinen Spielleiter und bitte um den QR-Code oder den Beitrittlink für das Spiel.
          </p>
        </div>
      </div>

      <Link
        href="/"
        className="text-sm font-semibold text-sky-700 underline-offset-4 hover:underline"
      >
        Zurück zur Startseite
      </Link>
    </main>
  );
}
