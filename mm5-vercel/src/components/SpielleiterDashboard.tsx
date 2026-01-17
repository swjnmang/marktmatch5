/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import type { GameDocument, GroupState } from "@/lib/types";

interface SpielleiterDashboardProps {
  game: GameDocument;
  groups: GroupState[];
  onStartPeriod: () => Promise<void>;
  onEditGroup: (group: GroupState) => void;
  onShowSettings: () => void;
  onShowRanking: () => void;
  onEndGame: () => void;
  onShowSpecialTasks?: () => void;
  onShowActions?: () => void;
  startLoading: boolean;
}

export function SpielleiterDashboard({
  game,
  groups,
  onStartPeriod,
  onEditGroup,
  onShowSettings,
  onShowRanking,
  onEndGame,
  onShowSpecialTasks,
  onShowActions,
  startLoading,
}: SpielleiterDashboardProps) {
  const [activeTab, setActiveTab] = useState<"special" | "actions" | "market">("special");

  const allGroupsSubmitted = groups.length > 0 && groups.every((g) => g.status === "submitted");
  const allGroupsReady = groups.length > 0 && groups.every((g) => g.status === "ready");
  const canStartPeriod = (allGroupsSubmitted || allGroupsReady) && groups.length > 0;
  const totalSupply = groups.reduce((sum, g) => sum + (g.lastResult?.soldUnits || 0), 0);
  const totalUmsatz = groups.reduce((sum, g) => sum + (g.lastResult?.revenue || 0), 0);
  const avgKapital = groups.length > 0 ? groups.reduce((sum, g) => sum + g.capital, 0) / groups.length : 0;

  const getRanking = () => {
    return [...groups]
      .sort((a, b) => (b.cumulativeProfit || 0) - (a.cumulativeProfit || 0))
      .map((g, idx) => ({ group: g, rank: idx + 1 }));
  };

  return (
    <div className="space-y-6">
      {/* KPI Übersicht */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-gray-400">
          <div className="text-sm text-gray-600 font-semibold">Spielstand</div>
          <div className="text-2xl font-bold text-gray-900">Periode {game.period}</div>
          <div className="text-xs text-gray-500 mt-1">Laufendes Spiel</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-400">
          <div className="text-sm text-gray-600 font-semibold">Gruppen Status</div>
          <div className="text-2xl font-bold text-orange-600">⚠ {groups.filter(g => g.status !== "submitted").length} wartend</div>
          <div className="text-xs text-gray-500 mt-1">von {groups.length} Gruppen</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-emerald-400">
          <div className="text-sm text-gray-600 font-semibold">Gesamt-Umsatz</div>
          <div className="text-2xl font-bold text-emerald-700">€{totalUmsatz.toLocaleString("de-DE")}</div>
          <div className="text-xs text-gray-500 mt-1">Alle Perioden</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-gray-400">
          <div className="text-sm text-gray-600 font-semibold">Ø Kapital</div>
          <div className="text-2xl font-bold text-gray-900">€{avgKapital.toLocaleString("de-DE", { maximumFractionDigits: 0 })}</div>
          <div className="text-xs text-gray-500 mt-1">Pro Gruppe</div>
        </div>
      </div>

      {/* Hauptinhalt 2-spaltig */}
      <div className="grid grid-cols-3 gap-6">
        {/* Linke Spalte: Spielstand */}
        <div className="col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Spielstand</h2>
            </div>
            <div className="p-6 space-y-4">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="border border-gray-200 bg-white rounded-lg p-4 hover:shadow-md transition hover:border-gray-300"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-gray-900">{group.name}</h3>
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className={`inline-block w-3 h-3 rounded-full ${
                            group.status === "submitted" ? "bg-emerald-500" : "bg-orange-500"
                          }`}
                        ></span>
                        <span
                          className={`text-sm font-semibold ${
                            group.status === "submitted" ? "text-emerald-700" : "text-orange-700"
                          }`}
                        >
                          {group.status === "submitted" ? "✓ Entschieden" : "⚠ Wartend"}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">€{group.capital.toLocaleString("de-DE", { maximumFractionDigits: 0 })}</div>
                      <div className="text-xs text-gray-600">Kapital</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mt-4 text-sm border-t border-gray-200 pt-3">
                    <div>
                      <div className="text-gray-600 text-xs font-semibold">Marktanteil</div>
                      <div className="font-bold text-gray-900 text-lg">
                        {totalSupply > 0 ? ((((group.lastResult?.soldUnits || 0) / totalSupply) * 100) || 0).toFixed(1) : "0.0"}%
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600 text-xs font-semibold">Ranking</div>
                      <div className="font-bold text-gray-900 text-lg">Platz {getRanking().find(r => r.group.id === group.id)?.rank || "-"}</div>
                    </div>
                    <div>
                      <div className="text-gray-600 text-xs font-semibold">Lager</div>
                      <div className="font-bold text-gray-900 text-lg">{group.inventory} E.</div>
                    </div>
                  </div>
                  <button
                    onClick={() => onEditGroup(group)}
                    className="w-full mt-3 bg-gray-600 hover:bg-gray-700 text-white py-2 rounded font-semibold transition"
                  >
                    🖊 Bearbeiten
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Rechte Spalte: Schnell-Aktionen */}
        <div>
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Schnell-Aktionen</h2>
            </div>
            <div className="p-6 space-y-3">
              <button
                onClick={onStartPeriod}
                disabled={!canStartPeriod || startLoading}
                className={`w-full text-white py-3 rounded-lg font-bold text-lg transition shadow-md ${
                  !canStartPeriod || startLoading
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {startLoading ? "⏳ Lädt..." : "▶ Start Periode"}
              </button>
              <button
                onClick={onShowSettings}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded font-semibold transition"
              >
                ⚙ Einstellungen
              </button>
              <button
                onClick={onShowRanking}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 rounded font-semibold transition"
              >
                🏆 Ranking
              </button>
              <button
                onClick={onEndGame}
                className="w-full bg-gray-700 hover:bg-gray-800 text-white py-2 rounded font-semibold transition"
              >
                ⏹ Spiel beenden
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border-l-4 border-gray-400 rounded-lg p-4">
            <div className="text-sm font-semibold text-gray-900 mb-2">💡 Hinweis</div>
            <div className="text-sm text-gray-700">
              {canStartPeriod
                ? "Alle Gruppen sind bereit. Du kannst die nächste Periode starten!"
                : `${groups.filter(g => g.status !== "ready" && g.status !== "submitted").length} Gruppe(n) müssen noch reagieren.`}
            </div>
          </div>
        </div>
      </div>

      {/* Spezialaufträge & Aktionen */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Spezialaufträge & Aktionen</h2>
        </div>
        <div className="p-6">
          {/* Tab-Buttons */}
          <div className="flex gap-4 mb-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab("special")}
              className={`pb-3 border-b-2 font-semibold ${
                activeTab === "special"
                  ? "border-gray-600 text-gray-900"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              📋 Spezialaufträge
            </button>
            <button
              onClick={() => setActiveTab("actions")}
              className={`pb-3 border-b-2 font-semibold ${
                activeTab === "actions"
                  ? "border-gray-600 text-gray-900"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              ⚡ Aktionen
            </button>
            <button
              onClick={() => setActiveTab("market")}
              className={`pb-3 border-b-2 font-semibold ${
                activeTab === "market"
                  ? "border-gray-600 text-gray-900"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              📊 Marktbedingungen
            </button>
          </div>

          {/* Tab Content */}
          <div className="bg-gray-50 rounded p-4 text-center text-gray-600 min-h-32 flex items-center justify-center">
            {activeTab === "special" && (
              <div>
                <p className="mb-3 font-semibold text-gray-700">Spezialaufträge an alle Gruppen senden</p>
                <button
                  onClick={onShowSpecialTasks}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-lg font-semibold transition"
                >
                  📋 Hinzufügen / Bearbeiten
                </button>
              </div>
            )}
            {activeTab === "actions" && (
              <div>
                <p className="mb-3 font-semibold text-gray-700">Aktionen für nächste Periode konfigurieren</p>
                <button
                  onClick={onShowActions}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-semibold transition"
                >
                  ⚡ Hinzufügen / Bearbeiten
                </button>
              </div>
            )}
            {activeTab === "market" && (
              <div>
                <p className="text-gray-700">Marktinformationen werden hier angezeigt.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Periodenverlauf */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Periodenverlauf</h3>
        <div className="flex items-center justify-center gap-3 overflow-x-auto pb-2">
          {Array.from({ length: 5 }, (_, i) => i + 1).map((period, idx) => {
            const isComplete = period < game.period;
            const isActive = period === game.period;
            const isFuture = period > game.period;

            return (
              <div key={period} className="flex items-center gap-3">
                <div className="text-center flex-shrink-0">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center border-2 font-bold text-lg ${
                      isComplete
                        ? "bg-emerald-100 border-emerald-300 text-emerald-700"
                        : isActive
                          ? "bg-gray-200 border-gray-400 text-gray-700"
                          : "bg-gray-100 border-gray-300 text-gray-400"
                    }`}
                  >
                    {isComplete ? "✓" : isActive ? "→" : "□"}
                  </div>
                  <div className={`text-sm font-semibold mt-2 ${isActive ? "text-gray-900" : "text-gray-600"}`}>P{period}</div>
                  <div className={`text-xs ${isComplete ? "text-emerald-600" : isActive ? "text-gray-600" : "text-gray-500"}`}>
                    {isComplete ? "Fertig" : isActive ? "Aktiv" : "Offen"}
                  </div>
                </div>
                {idx < 4 && <div className="text-gray-400 text-2xl">→</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
