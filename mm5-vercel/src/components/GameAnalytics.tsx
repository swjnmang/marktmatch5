"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { GroupState, PeriodResult } from "@/lib/types";

interface GameAnalyticsProps {
  groups: GroupState[];
  currentGroupId: string;
  gameId: string;
}

export default function GameAnalytics({
  groups,
  currentGroupId,
  gameId,
}: GameAnalyticsProps) {
  const [showCompetitors, setShowCompetitors] = useState(false);

  const currentGroup = groups.find((g) => g.id === currentGroupId);
  if (!currentGroup) return null;

  // Prepare ranking data
  const ranking = groups
    .map((g) => ({
      name: g.name || `Gruppe ${g.id.substring(0, 4)}`,
      id: g.id,
      capital: g.capital ?? 0,
      profit: (g.cumulativeProfit ?? 0),
    }))
    .sort((a, b) => b.capital - a.capital);

  // Prepare period data for charts (only from lastResults)
  const maxPeriods = Math.max(
    ...groups.map((g) => {
      let count = 0;
      if (g.lastResult) count = g.lastResult.period ?? 1;
      return count;
    }),
    1
  );

  const periodDataMap: Record<
    number,
    {
      period: number;
      [key: string]: number;
    }
  > = {};

  for (let p = 1; p <= maxPeriods; p++) {
    periodDataMap[p] = { period: p };
  }

  // Add current group data
  if (currentGroup.lastResult) {
    const p = currentGroup.lastResult.period ?? 1;
    periodDataMap[p] = {
      ...periodDataMap[p],
      [`${currentGroup.name}-capital`]: currentGroup.capital ?? 0,
      [`${currentGroup.name}-profit`]: currentGroup.lastResult.profit ?? 0,
      [`${currentGroup.name}-revenue`]: currentGroup.lastResult.revenue ?? 0,
      [`${currentGroup.name}-costs`]: currentGroup.lastResult.totalCosts ?? 0,
      [`${currentGroup.name}-marketShare`]:
        (currentGroup.lastResult.marketShare ?? 0) * 100,
      [`${currentGroup.name}-production`]:
        currentGroup.lastResult.soldUnits ?? 0,
      [`${currentGroup.name}-sold`]: currentGroup.lastResult.soldUnits ?? 0,
    };
  }

  // Add competitor data if enabled
  if (showCompetitors) {
    groups.forEach((g) => {
      if (g.id === currentGroupId) return;
      if (g.lastResult) {
        const p = g.lastResult.period ?? 1;
        periodDataMap[p] = {
          ...periodDataMap[p],
          [`${g.name}-capital`]: g.capital ?? 0,
          [`${g.name}-profit`]: g.lastResult.profit ?? 0,
          [`${g.name}-revenue`]: g.lastResult.revenue ?? 0,
          [`${g.name}-costs`]: g.lastResult.totalCosts ?? 0,
          [`${g.name}-marketShare`]:
            (g.lastResult.marketShare ?? 0) * 100,
          [`${g.name}-production`]: g.lastResult.soldUnits ?? 0,
          [`${g.name}-sold`]: g.lastResult.soldUnits ?? 0,
        };
      }
    });
  }

  const periodData = Object.values(periodDataMap).sort((a, b) => a.period - b.period);

  const colors = [
    "#0ea5e9", // sky
    "#f97316", // orange
    "#ec4899", // pink
    "#8b5cf6", // violet
    "#10b981", // emerald
  ];

  const getLineColor = (groupName: string, index: number) => colors[index % colors.length];

  return (
    <div className="space-y-8 mt-8">
      {/* Endstand Ranking */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
        <h3 className="text-lg font-semibold text-amber-900 mb-4 flex items-center gap-2">
          <span>🏆</span>
          Finales Ranking
        </h3>
        <div className="space-y-3">
          {ranking.map((team, idx) => (
            <div
              key={team.id}
              className={`flex items-center justify-between rounded-lg p-4 ${
                team.id === currentGroupId
                  ? "border-2 border-sky-400 bg-sky-50"
                  : idx === 0
                  ? "border-2 border-amber-400 bg-amber-100"
                  : idx === 1
                  ? "border-2 border-gray-300 bg-gray-100"
                  : idx === 2
                  ? "border-2 border-amber-600 bg-amber-100"
                  : "border border-amber-200 bg-white"
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="text-2xl font-bold">
                  {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}.`}
                </span>
                <div>
                  <p className="font-semibold text-slate-900">{team.name}</p>
                  <p className="text-sm text-slate-600">
                    Gewinn: €{team.profit.toLocaleString("de-DE")}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-slate-900">
                  €{team.capital.toLocaleString("de-DE")}
                </p>
                <p className="text-xs text-slate-500">Kapital</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="rounded-lg border border-slate-200 bg-white p-6 space-y-6">
        {/* Competitor Toggle */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="show-competitors"
            checked={showCompetitors}
            onChange={(e) => setShowCompetitors(e.target.checked)}
            className="h-4 w-4 cursor-pointer"
          />
          <label htmlFor="show-competitors" className="text-sm font-medium text-slate-700 cursor-pointer">
            Konkurrenz anzeigen
          </label>
        </div>

        {periodData.length > 0 ? (
          <>
            {/* Kapital über Perioden */}
            <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
              <h4 className="text-sm font-semibold text-slate-900 mb-4">📈 Kapitalentwicklung</h4>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={periodData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" label={{ value: "Periode", position: "insideBottomRight", offset: -5 }} />
                  <YAxis label={{ value: "€", angle: -90, position: "insideLeft" }} />
                  <Tooltip formatter={(value) => `€${(value as number).toLocaleString("de-DE")}`} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey={`${currentGroup.name}-capital`}
                    stroke={colors[0]}
                    strokeWidth={2}
                    name={`${currentGroup.name} (Kapital)`}
                    connectNulls
                  />
                  {showCompetitors &&
                    groups
                      .filter((g) => g.id !== currentGroupId)
                      .map((g, idx) => (
                        <Line
                          key={g.id}
                          type="monotone"
                          dataKey={`${g.name}-capital`}
                          stroke={colors[(idx + 1) % colors.length]}
                          strokeWidth={1}
                          strokeDasharray="5 5"
                          name={`${g.name} (Kapital)`}
                          connectNulls
                        />
                      ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Gewinn & Umsatz pro Periode */}
            <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
              <h4 className="text-sm font-semibold text-slate-900 mb-4">💰 Gewinn & Umsatz</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={periodData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" label={{ value: "Periode", position: "insideBottomRight", offset: -5 }} />
                  <YAxis label={{ value: "€", angle: -90, position: "insideLeft" }} />
                  <Tooltip formatter={(value) => `€${(value as number).toLocaleString("de-DE")}`} />
                  <Legend />
                  <Bar
                    dataKey={`${currentGroup.name}-profit`}
                    fill={colors[0]}
                    name={`${currentGroup.name} (Gewinn)`}
                  />
                  <Bar
                    dataKey={`${currentGroup.name}-revenue`}
                    fill={colors[1]}
                    name={`${currentGroup.name} (Umsatz)`}
                  />
                  {showCompetitors &&
                    groups
                      .filter((g) => g.id !== currentGroupId)
                      .map((g, idx) => (
                        <>
                          <Bar
                            key={`${g.id}-profit`}
                            dataKey={`${g.name}-profit`}
                            fill={colors[(idx + 1) % colors.length]}
                            name={`${g.name} (Gewinn)`}
                            opacity={0.6}
                          />
                          <Bar
                            key={`${g.id}-revenue`}
                            dataKey={`${g.name}-revenue`}
                            fill={colors[(idx + 1) % colors.length]}
                            name={`${g.name} (Umsatz)`}
                            opacity={0.4}
                          />
                        </>
                      ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Marktanteil pro Periode */}
            <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
              <h4 className="text-sm font-semibold text-slate-900 mb-4">📊 Marktanteil (%)</h4>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={periodData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" label={{ value: "Periode", position: "insideBottomRight", offset: -5 }} />
                  <YAxis label={{ value: "%", angle: -90, position: "insideLeft" }} />
                  <Tooltip formatter={(value) => `${(value as number).toFixed(2)}%`} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey={`${currentGroup.name}-marketShare`}
                    stroke={colors[0]}
                    strokeWidth={2}
                    name={`${currentGroup.name} (Marktanteil)`}
                    connectNulls
                  />
                  {showCompetitors &&
                    groups
                      .filter((g) => g.id !== currentGroupId)
                      .map((g, idx) => (
                        <Line
                          key={g.id}
                          type="monotone"
                          dataKey={`${g.name}-marketShare`}
                          stroke={colors[(idx + 1) % colors.length]}
                          strokeWidth={1}
                          strokeDasharray="5 5"
                          name={`${g.name} (Marktanteil)`}
                          connectNulls
                        />
                      ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Produktion vs. Verkauf */}
            <div className="rounded-lg bg-slate-50 p-4 border border-slate-200">
              <h4 className="text-sm font-semibold text-slate-900 mb-4">🏭 Produktion vs. Verkauf</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={periodData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" label={{ value: "Periode", position: "insideBottomRight", offset: -5 }} />
                  <YAxis label={{ value: "Einheiten", angle: -90, position: "insideLeft" }} />
                  <Tooltip formatter={(value) => Math.floor(value as number).toLocaleString("de-DE")} />
                  <Legend />
                  <Bar
                    dataKey={`${currentGroup.name}-production`}
                    fill={colors[0]}
                    name={`${currentGroup.name} (Produziert)`}
                  />
                  <Bar
                    dataKey={`${currentGroup.name}-sold`}
                    fill={colors[1]}
                    name={`${currentGroup.name} (Verkauft)`}
                  />
                  {showCompetitors &&
                    groups
                      .filter((g) => g.id !== currentGroupId)
                      .map((g, idx) => (
                        <>
                          <Bar
                            key={`${g.id}-production`}
                            dataKey={`${g.name}-production`}
                            fill={colors[(idx + 1) % colors.length]}
                            name={`${g.name} (Produziert)`}
                            opacity={0.6}
                          />
                          <Bar
                            key={`${g.id}-sold`}
                            dataKey={`${g.name}-sold`}
                            fill={colors[(idx + 1) % colors.length]}
                            name={`${g.name} (Verkauft)`}
                            opacity={0.4}
                          />
                        </>
                      ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-600">Keine Periodendaten verfügbar.</p>
        )}
      </div>
    </div>
  );
}
