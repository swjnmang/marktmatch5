"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { themes, type ThemeName } from "@/lib/themes";

export default function Settings() {
  const [selectedTheme, setSelectedTheme] = useState<ThemeName>("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("theme") as ThemeName || "light";
    setSelectedTheme(saved);
  }, []);

  const handleThemeChange = (theme: ThemeName) => {
    setSelectedTheme(theme);
    localStorage.setItem("theme", theme);
  };

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-blue-50 px-6 py-16">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <Link
            href="/"
            className="text-sm font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-2"
          >
            ← Zurück zur Startseite
          </Link>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-lg ring-1 ring-slate-200">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Einstellungen</h1>
          <p className="text-slate-600 mb-8">
            Passe das Aussehen von Markt-Match 5 an deine Vorlieben an.
          </p>

          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Design wählen
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {Object.entries(themes).map(([key, theme]) => (
                  <button
                    key={key}
                    onClick={() => handleThemeChange(key as ThemeName)}
                    className={`relative rounded-xl p-6 text-left transition ${
                      selectedTheme === key
                        ? "ring-2 ring-sky-500 shadow-lg"
                        : "ring-1 ring-slate-200 hover:ring-sky-300"
                    }`}
                    style={{
                      backgroundColor: key === "dark" ? "#000000" : "#ffffff",
                    }}
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
                      style={{
                        color: key === "dark" ? "#ffffff" : "#1e293b",
                      }}
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

            <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
              <p>
                <span className="font-semibold">💡 Tipp:</span> Deine Designauswahl wird gespeichert und beim nächsten Besuch automatisch geladen.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
