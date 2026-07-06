"use client";

import { Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Cell } from "recharts";
import { formatPrice } from "@/lib/format";
import type { SeasonPerformance } from "@/lib/management-extra-aggregates";

const SEASON_COLORS: Record<string, string> = {
  "Dry Peak": "#2a9d8f",
  Shoulder: "#e8d5b0",
  Typhoon: "#e8693a",
};

export default function SeasonalitySection({ rows }: { rows: SeasonPerformance[] }) {
  const best = [...rows].sort((a, b) => b.revenue - a.revenue)[0];

  return (
    <div>
      <h2 className="text-lg font-bold text-navy-800 mb-4 leading-snug">
        {best
          ? `${best.season} season brings in the most revenue at ${formatPrice(best.revenue)} across ${best.orders} orders.`
          : "Seasonality"}
      </h2>
      <div className="bg-white rounded-2xl border border-sand-200 p-4">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={rows} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8d5b0" />
            <XAxis dataKey="season" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
            <Tooltip formatter={(value) => formatPrice(Number(value))} />
            <Bar dataKey="revenue" name="Revenue" radius={[4, 4, 0, 0]}>
              {rows.map((r) => (
                <Cell key={r.season} fill={SEASON_COLORS[r.season] ?? "#2a9d8f"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Dry Peak: Dec-Apr · Shoulder: May · Typhoon: Jun-Nov (Apo Island&rsquo;s own tourism seasons).
      </p>
    </div>
  );
}
