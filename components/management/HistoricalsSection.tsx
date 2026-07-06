"use client";

import { useMemo } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { ALL_YEARS, useManagementFilter } from "@/lib/management-filter-context";
import { formatPrice } from "@/lib/format";
import type { MonthlyFinancial } from "@/lib/management-aggregates";

function buildTitle(filtered: MonthlyFinancial[], selectedYear: string, allMonthly: MonthlyFinancial[]): string {
  if (filtered.length === 0) return "No sales recorded for this period yet.";

  const totalRevenue = filtered.reduce((s, m) => s + m.revenue, 0);
  const totalMargin = filtered.reduce((s, m) => s + m.margin, 0);
  const avgMarginPct = totalRevenue > 0 ? (totalMargin / totalRevenue) * 100 : 0;

  if (selectedYear === ALL_YEARS) {
    const years = [...new Set(filtered.map((m) => m.year))].sort((a, b) => a - b);
    const firstYearRevenue = filtered.filter((m) => m.year === years[0]).reduce((s, m) => s + m.revenue, 0);
    const lastYearRevenue = filtered.filter((m) => m.year === years[years.length - 1]).reduce((s, m) => s + m.revenue, 0);
    const growthPct = firstYearRevenue > 0 ? ((lastYearRevenue - firstYearRevenue) / firstYearRevenue) * 100 : 0;
    const direction = growthPct >= 0 ? "grew" : "shrank";
    return `Revenue ${direction} ${Math.abs(growthPct).toFixed(0)}% from ${years[0]} to ${years[years.length - 1]}, with margins averaging ${avgMarginPct.toFixed(0)}% across the period.`;
  }

  const year = Number(selectedYear);
  const prevYearRevenue = allMonthly.filter((m) => m.year === year - 1).reduce((s, m) => s + m.revenue, 0);
  let comparison = "";
  if (prevYearRevenue > 0) {
    const yoy = ((totalRevenue - prevYearRevenue) / prevYearRevenue) * 100;
    comparison = yoy >= 0 ? `, up ${yoy.toFixed(0)}% year over year` : `, down ${Math.abs(yoy).toFixed(0)}% year over year`;
  }
  return `${year} revenue reached ${formatPrice(totalRevenue)}${comparison}, holding ${avgMarginPct.toFixed(0)}% margins.`;
}

export default function HistoricalsSection({ monthly }: { monthly: MonthlyFinancial[] }) {
  const { selectedYear } = useManagementFilter();

  const filtered = useMemo(
    () => (selectedYear === ALL_YEARS ? monthly : monthly.filter((m) => String(m.year) === selectedYear)),
    [monthly, selectedYear]
  );

  const title = useMemo(() => buildTitle(filtered, selectedYear, monthly), [filtered, selectedYear, monthly]);

  const xKey = selectedYear === ALL_YEARS ? "label" : "monthName";

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-4">
        <h2 className="text-lg font-bold text-navy-800 leading-snug">{title}</h2>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- file download, not a page navigation */}
        <a
          href="/api/management/export/financials"
          className="shrink-0 bg-teal-500 hover:bg-teal-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors"
        >
          Download (CSV)
        </a>
      </div>
      <div className="bg-white rounded-2xl border border-sand-200 p-4">
        <ResponsiveContainer width="100%" height={360}>
          <ComposedChart data={filtered} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8d5b0" />
            <XAxis dataKey={xKey} tick={{ fontSize: 12 }} angle={selectedYear === ALL_YEARS ? -45 : 0} textAnchor={selectedYear === ALL_YEARS ? "end" : "middle"} height={selectedYear === ALL_YEARS ? 60 : 30} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
            <Tooltip formatter={(value) => formatPrice(Number(value))} />
            <Legend />
            <Bar dataKey="revenue" name="Revenue" fill="#2a9d8f" radius={[4, 4, 0, 0]} />
            <Line dataKey="margin" name="Margin kept" stroke="#e8693a" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Margin is revenue minus product cost (excludes shipping fees, which don&rsquo;t have a matching cost in this data).
      </p>
    </div>
  );
}
