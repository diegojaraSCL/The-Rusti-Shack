"use client";

import { useMemo, useState } from "react";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatPrice } from "@/lib/format";
import type { ModelBundle } from "@/lib/management-forecast-data";

function buildTitle(model: ModelBundle, horizon: number, historyLength: number): string {
  const forecastRows = model.series.slice(historyLength, historyLength + horizon);
  if (forecastRows.length === 0) return `${model.name}: no forecast to show.`;
  const last = forecastRows[forecastRows.length - 1];
  const monthsLabel = horizon === 1 ? "next month" : `${horizon} months out`;
  return `${model.name} expects revenue of about ${formatPrice(last.forecast ?? 0)} by ${monthsLabel}, likely between ${formatPrice(last.lower ?? 0)} and ${formatPrice(last.upper ?? 0)} (typically off by ±${model.errorPct.toFixed(0)}% on recent history).`;
}

export default function ForecastingSection({
  models,
  historyLength,
  maxHorizon,
}: {
  models: ModelBundle[];
  historyLength: number;
  maxHorizon: number;
}) {
  const [selectedId, setSelectedId] = useState(models[0]?.id);
  const [horizon, setHorizon] = useState(6);
  const [infoOpenFor, setInfoOpenFor] = useState<string | null>(null);

  const model = models.find((m) => m.id === selectedId) ?? models[0];

  const chartData = useMemo(() => {
    const rows = model.series.slice(0, historyLength + horizon);
    return rows.map((r) => ({
      ...r,
      band: r.lower != null && r.upper != null ? [r.lower, r.upper] : undefined,
    }));
  }, [model, horizon, historyLength]);

  const title = useMemo(() => buildTitle(model, horizon, historyLength), [model, horizon, historyLength]);

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {models.map((m) => (
          <div key={m.id} className="relative">
            <button
              onClick={() => setSelectedId(m.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors pr-8 ${
                m.id === model.id
                  ? "bg-navy-800 text-white"
                  : "bg-white text-gray-600 border border-sand-200 hover:border-navy-800 hover:text-navy-800"
              }`}
            >
              {m.name}{" "}
              <span className={m.id === model.id ? "text-teal-300" : "text-teal-600"}>
                ({m.errorPct.toFixed(0)}% err)
              </span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setInfoOpenFor(infoOpenFor === m.id ? null : m.id);
              }}
              aria-label={`About ${m.name}`}
              className={`absolute right-1.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full text-xs font-bold flex items-center justify-center ${
                m.id === model.id ? "bg-white/20 text-white" : "bg-navy-50 text-navy-800"
              }`}
            >
              i
            </button>
          </div>
        ))}
      </div>

      {infoOpenFor && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 mb-4 text-sm text-teal-800">
          <strong>{models.find((m) => m.id === infoOpenFor)?.name}:</strong>{" "}
          {models.find((m) => m.id === infoOpenFor)?.description}
        </div>
      )}

      <h2 className="text-lg font-bold text-navy-800 mb-4 leading-snug">{title}</h2>

      <div className="bg-white rounded-2xl border border-sand-200 p-4 mb-4">
        <ResponsiveContainer width="100%" height={360}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8d5b0" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
            <Tooltip formatter={(value) => (Array.isArray(value) ? value.map((v) => formatPrice(Number(v))).join(" – ") : formatPrice(Number(value)))} />
            <Legend />
            <Area dataKey="band" name="Likely range" stroke="none" fill="#e8693a" fillOpacity={0.15} connectNulls />
            <Line dataKey="actual" name="Actual" stroke="#2a9d8f" strokeWidth={2} dot={false} connectNulls={false} />
            <Line
              dataKey="forecast"
              name="Forecast"
              stroke="#e8693a"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-2xl border border-sand-200 p-4">
        <label className="flex items-center justify-between text-sm font-semibold text-navy-800 mb-2">
          <span>Forecast horizon</span>
          <span>{horizon} {horizon === 1 ? "month" : "months"}</span>
        </label>
        <input
          type="range"
          min={1}
          max={maxHorizon}
          value={horizon}
          onChange={(e) => setHorizon(Number(e.target.value))}
          className="w-full accent-teal-500"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>1 month</span>
          <span>{maxHorizon} months</span>
        </div>
      </div>
    </div>
  );
}
