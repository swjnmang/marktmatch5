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

  // Helper: Get human-readable status for a group
  const getGroupStatusLabel = (groupStatus: string, phaseAcknowledged: boolean) => {
    if (game.phase === "machine_selection" && !phaseAcknowledged) {
      return { label: "📖 Liest Anleitung", icon: "📖", color: "blue" };
    }
    if (game.phase === "machine_selection" && groupStatus === "selecting") {
      return { label: "⚙️ Wählt Maschine", icon: "⚙️", color: "amber" };
    }
    if (groupStatus === "submitted") {
      return { label: "✓ Entschieden", icon: "✓", color: "emerald" };
    }
    if (groupStatus === "ready") {
      return { label: "✓ Bereit", icon: "✓", color: "emerald" };
    }
    if (groupStatus === "calculating") {
      return { label: "⏳ Berechnet...", icon: "⏳", color: "amber" };
    }
    return { label: "⏳ Wartend", icon: "⏳", color: "orange" };
  };

  return (
    <div className="space-y-6">
      {/* Spielstand Box - Compact */}
      <div className="bg-blue-50 rounded-lg shadow border border-blue-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Spielstand</p>
            <h2 className="text-2xl font-bold text-blue-900 mt-1">
              Periode {game.period}
            </h2>
            <p className="text-xs text-blue-700 mt-1">
              {game.phase === "machine_selection" && "👥 Maschinenwahl"}
              {game.phase === "decisions" && "📝 Entscheidungen"}
              {game.phase === "results" && "📊 Ergebnisse"}
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold text-blue-900">P{game.period}</div>
            <p className="text-xs text-blue-600 mt-1">von 5</p>
          </div>
        </div>
      </div>

      {/* Hauptinhalt 2-spaltig */}
      <div className="grid grid-cols-3 gap-6">
        {/* Linke Spalte: Spielstand - Kompakt */}
        <div className="col-span-2">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Spielstand</h2>
            </div>
            <div className="p-6 space-y-2">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 hover:bg-neutral-100 transition"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span
                      className={`inline-block w-2.5 h-2.5 rounded-full ${
                        getGroupStatusLabel(group.status, group.instructionsAcknowledged ?? false).color === "emerald" ? "bg-emerald-500" : 
                        getGroupStatusLabel(group.status, group.instructionsAcknowledged ?? false).color === "blue" ? "bg-blue-500" :
                        getGroupStatusLabel(group.status, group.instructionsAcknowledged ?? false).color === "amber" ? "bg-amber-500" :
                        "bg-orange-500"
                      }`}
                    ></span>
                    <div className="flex-1">
                      <h3 className="font-semibold text-sm text-gray-900">Gruppe: {group.name}</h3>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-gray-700">
                      {getGroupStatusLabel(group.status, group.instructionsAcknowledged ?? false).label}
                    </span>
                    <button
                      onClick={() => onEditGroup(group)}
                      className="px-2 py-1 text-xs font-semibold text-white bg-gray-600 hover:bg-gray-700 rounded transition whitespace-nowrap"
                    >
                      ⚙️ Einstellungen
                    </button>
                  </div>
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
    </div>
  );
}
