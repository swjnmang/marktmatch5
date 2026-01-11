"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { themes, type ThemeName } from "@/lib/themes";
import { ui } from "@/lib/ui";

export default function Settings() {
  const [selectedTheme, setSelectedTheme] = useState<ThemeName>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("theme") as ThemeName) || "light";
    }
    return "light";
  });
  const mounted = typeof window !== "undefined";

  const handleThemeChange = (theme: ThemeName) => {
    setSelectedTheme(theme);
    localStorage.setItem("theme", theme);
  };

  if (!mounted) return null;

  return (
    <main className={ui.page.shell}>
      <div className={ui.page.overlay} />
      <div className={`${ui.page.container} max-w-2xl`}>
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className={ui.header.backLink}
          >
            ← Zurück zur Startseite
          </Link>
        </div>

        <div className={ui.card.padded}>
          <h1 className="text-3xl font-bold text-white mb-2">Einstellungen</h1>
          <p className={ui.header.subtitle}>
            Passe das Aussehen von Markt-Match 5 an deine Vorlieben an.
          </p>

          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">
                Design wählen
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {Object.entries(themes).map(([key, theme]) => (
                  <button
                    key={key}
                    onClick={() => handleThemeChange(key as ThemeName)}
                    className={`relative rounded-xl p-6 text-left transition text-white ${
                      selectedTheme === key
                        ? "bg-white/10 ring-2 ring-sky-400/70 shadow-lg"
                        : "bg-white/5 ring-1 ring-white/10 hover:ring-sky-300/50"
                    }`}
                  >
                    {selectedTheme === key && (
                      <div className="absolute top-3 right-3">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-white">
                          ✓
                        </div>
                      </div>
                    )}
                    <h3
                      className="font-semibold mb-3"
                    >
                      {theme.label}
                    </h3>
                    <div className="flex gap-2">
                      {key === "light" && (
                        <>
                          <div className="h-8 w-8 rounded bg-sky-100"></div>
                          <div className="h-8 w-8 rounded bg-sky-50"></div>
                          <div className="h-8 w-8 rounded bg-blue-50"></div>
                        </>
                      )}
                      {key === "dark" && (
                        <>
                          <div className="h-8 w-8 rounded bg-gray-800"></div>
                          <div className="h-8 w-8 rounded bg-gray-700"></div>
                          <div className="h-8 w-8 rounded bg-white"></div>
                        </>
                      )}
                      {key === "nature" && (
                        <>
                          <div className="h-8 w-8 rounded bg-green-100"></div>
                          <div className="h-8 w-8 rounded bg-emerald-50"></div>
                          <div className="h-8 w-8 rounded bg-green-50"></div>
                        </>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-lg bg-white/5 p-4 text-sm text-slate-200 ring-1 ring-white/10">
              <p>
                <span className="font-semibold text-white">💡 Tipp:</span> Deine Designauswahl wird gespeichert und beim nächsten Besuch automatisch geladen.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
