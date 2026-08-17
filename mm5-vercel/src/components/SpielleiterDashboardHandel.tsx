"use client";

import { useState } from "react";
import type { GameDocumentHandel, GroupStateHandel } from "@/lib/types-handel";
import type { QualityTierDefinition } from "@/lib/types-handel";

interface SpielleiterDashboardHandelProps {
  game: GameDocumentHandel;
  groups: GroupStateHandel[];
  tierDefinitions: QualityTierDefinition[];
  onStartPeriod: () => Promise<void>;
  onEditGroup: (group: GroupStateHandel) => void;
  onShowSettings: () => void;
  onShowRanking: () => void;
  onEndGame: () => void;
  onShowActions: () => void;
  startLoading: boolean;
}

const STATUS_LABEL: Record<GroupStateHandel["status"], { label: string; dot: string }> = {
  waiting: { label: "Trifft Entscheidung", dot: "bg-amber-500" },
  submitted: { label: "Entschieden", dot: "bg-emerald-500" },
  calculated: { label: "Ausgewertet", dot: "bg-sky-500" },
};

export function SpielleiterDashboardHandel({
  game,
  groups,
  tierDefinitions,
  onStartPeriod,
  onEditGroup,
  onShowSettings,
  onShowRanking,
  onEndGame,
  onShowActions,
  startLoading,
}: SpielleiterDashboardHandelProps) {
  const [showMarketInfo, setShowMarketInfo] = useState(false);

  const allGroupsSubmitted = groups.length > 0 && groups.every((g) => g.status === "submitted");
  const canStartPeriod =
    groups.length > 0 &&
    ((game.phase === "decisions" && allGroupsSubmitted) || game.phase === "results");

  const startLabel = startLoading
    ? "Lädt..."
    : game.phase === "decisions"
    ? `Auswertung Periode ${game.period}`
    : `Start Periode ${game.period + 1}`;

  const notSubmittedCount = groups.filter((g) => g.status !== "submitted").length;

  const plannedActions = [
    game.parameters.demandBoostNextPeriod && "Nachfrage-Boost aktiviert",
    game.parameters.freeMarketAnalysisNextPeriod && "Kostenlose Marktanalyse",
    game.parameters.noInventoryCostsNextPeriod && "Keine Lagerkosten",
    game.parameters.allowNegotiationNextPeriod &&
      `Einkaufsverhandlung erlaubt (Schwelle: €${(
        game.parameters.negotiationThresholdNextPeriod || game.parameters.purchaseNegotiationThreshold
      ).toLocaleString("de-DE")})`,
    game.parameters.customEventNextPeriod && `Sonderereignis: ${game.parameters.customEventNextPeriod}`,
  ].filter(Boolean) as string[];

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      {/* Spielstand */}
      <div className="rounded-2xl bg-sky-50 border border-sky-200 p-4 sm:p-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Spielstand</p>
          <h2 className="text-2xl font-bold text-sky-900 mt-0.5">Periode {game.period}</h2>
          <p className="text-xs text-sky-700 mt-0.5">
            {game.phase === "decisions" ? "Einkauf & Verkauf laufen" : "Ergebnisse der Periode"}
          </p>
        </div>
        <div className="text-3xl sm:text-4xl font-bold text-sky-900">P{game.period}</div>
      </div>

      {/* Start-Button - immer prominent oben, wichtigste Aktion */}
      <button
        onClick={onStartPeriod}
        disabled={!canStartPeriod || startLoading}
        className={`w-full rounded-xl py-4 text-base sm:text-lg font-bold text-white shadow-sm transition ${
          !canStartPeriod || startLoading
            ? "bg-neutral-300 cursor-not-allowed"
            : "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800"
        }`}
      >
        {startLabel}
      </button>
      <p className="text-sm text-neutral-600 -mt-2">
        {canStartPeriod
          ? "Alle Gruppen sind bereit."
          : game.phase === "decisions"
          ? `${notSubmittedCount} Gruppe(n) müssen ihre Entscheidung noch abgeben.`
          : "Bereit für die nächste Periode."}
      </p>

      {/* Gruppenliste - Karten, mobil gestapelt */}
      <div className="rounded-2xl bg-white border border-neutral-200">
        <div className="px-4 sm:px-5 py-3 border-b border-neutral-200">
          <h3 className="font-bold text-neutral-900">Gruppen ({groups.length})</h3>
        </div>
        <div className="p-3 sm:p-4 flex flex-col gap-2">
          {groups.length === 0 && (
            <p className="text-sm text-neutral-500 py-4 text-center">Noch keine Gruppen beigetreten.</p>
          )}
          {groups.map((group) => {
            const status = STATUS_LABEL[group.status];
            return (
              <div
                key={group.id}
                className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className={`h-2.5 w-2.5 rounded-full flex-none ${status.dot}`} />
                  <span className="font-semibold text-sm text-neutral-900 truncate">{group.name}</span>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3">
                  <span className="text-xs font-medium text-neutral-600">{status.label}</span>
                  <button
                    onClick={() => onEditGroup(group)}
                    className="rounded-lg bg-neutral-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-neutral-800 transition"
                  >
                    Bearbeiten
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Aktionen-Grid: auf Mobile untereinander, ab sm zweispaltig */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={onShowActions}
          className="rounded-xl bg-white border border-neutral-200 px-4 py-3 text-left hover:border-neutral-400 transition"
        >
          <p className="font-semibold text-neutral-900 text-sm">Ereignisse für nächste Periode</p>
          <p className="text-xs text-neutral-600 mt-0.5">
            {plannedActions.length > 0 ? plannedActions.join(" · ") : "Keine Ereignisse geplant"}
          </p>
        </button>
        <button
          onClick={() => setShowMarketInfo((v) => !v)}
          className="rounded-xl bg-white border border-neutral-200 px-4 py-3 text-left hover:border-neutral-400 transition"
        >
          <p className="font-semibold text-neutral-900 text-sm">Großhandelspreise</p>
          <p className="text-xs text-neutral-600 mt-0.5">
            {showMarketInfo ? "Ausblenden" : "Qualitätsstufen anzeigen"}
          </p>
        </button>
        <button
          onClick={onShowSettings}
          className="rounded-xl bg-white border border-neutral-200 px-4 py-3 text-left hover:border-neutral-400 transition"
        >
          <p className="font-semibold text-neutral-900 text-sm">Einstellungen</p>
          <p className="text-xs text-neutral-600 mt-0.5">Marktparameter anpassen</p>
        </button>
        <button
          onClick={onShowRanking}
          className="rounded-xl bg-white border border-neutral-200 px-4 py-3 text-left hover:border-neutral-400 transition"
        >
          <p className="font-semibold text-neutral-900 text-sm">Ranking</p>
          <p className="text-xs text-neutral-600 mt-0.5">Zwischenstand ansehen</p>
        </button>
      </div>

      {showMarketInfo && (
        <div className="rounded-2xl bg-white border border-neutral-200 p-4 sm:p-5">
          <h3 className="font-bold text-neutral-900 mb-3">Qualitätsstufen</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {tierDefinitions.map((tier) => (
              <div key={tier.id} className="rounded-xl bg-neutral-50 border border-neutral-200 p-3">
                <p className="font-semibold text-sm text-neutral-900">{tier.name}</p>
                <p className="text-xs text-neutral-600 mt-1">
                  €{tier.basePurchasePricePerUnit.toFixed(2)}/Stk · Qualität ×{tier.qualityMultiplier.toFixed(2)}
                </p>
                <ul className="text-xs text-neutral-500 mt-1 space-y-0.5">
                  {tier.volumeDiscounts.map((d) => (
                    <li key={d.minQuantity}>
                      ab {d.minQuantity} Stk. −{Math.round(d.discountPercent * 100)}%
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onEndGame}
        className="w-full rounded-xl bg-neutral-100 border border-neutral-300 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-200 transition"
      >
        Spiel beenden
      </button>
    </div>
  );
}
