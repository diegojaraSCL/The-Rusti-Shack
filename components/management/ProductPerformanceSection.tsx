"use client";

import { useMemo, useState } from "react";
import { formatPrice } from "@/lib/format";
import type { ProductPerformance } from "@/lib/management-extra-aggregates";

type SortKey = "margin" | "marginPct" | "revenue" | "unitsSold";

export default function ProductPerformanceSection({ rows }: { rows: ProductPerformance[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("margin");

  const sorted = useMemo(() => [...rows].sort((a, b) => b[sortKey] - a[sortKey]), [rows, sortKey]);
  const withVolume = rows.filter((r) => r.unitsSold >= 10);
  const best = [...withVolume].sort((a, b) => b.marginPct - a.marginPct)[0];
  const worst = [...withVolume].sort((a, b) => a.marginPct - b.marginPct)[0];

  return (
    <div>
      <h2 className="text-lg font-bold text-navy-800 mb-4 leading-snug">
        {best && worst
          ? `${best.productName} nets the best margin at ${best.marginPct.toFixed(0)}%, while ${worst.productName} only keeps ${worst.marginPct.toFixed(0)}% after cost.`
          : "Product margin performance"}
      </h2>

      <div className="flex flex-wrap gap-2 mb-4">
        {(["margin", "marginPct", "revenue", "unitsSold"] as SortKey[]).map((key) => (
          <button
            key={key}
            onClick={() => setSortKey(key)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              sortKey === key
                ? "bg-navy-800 text-white"
                : "bg-white text-gray-600 border border-sand-200 hover:border-navy-800 hover:text-navy-800"
            }`}
          >
            Sort by {key === "marginPct" ? "margin %" : key === "unitsSold" ? "units sold" : key}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-sand-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-sand-200">
              <th className="px-4 py-2">Product</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2 text-right">Units sold</th>
              <th className="px-4 py-2 text-right">Revenue</th>
              <th className="px-4 py-2 text-right">Margin</th>
              <th className="px-4 py-2 text-right">Margin %</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.familySku} className="border-b border-sand-100 last:border-0">
                <td className="px-4 py-2 font-medium text-navy-800">{r.productName}</td>
                <td className="px-4 py-2 text-gray-600">{r.category}</td>
                <td className="px-4 py-2 text-right text-gray-600">{r.unitsSold}</td>
                <td className="px-4 py-2 text-right text-gray-600">{formatPrice(r.revenue)}</td>
                <td className="px-4 py-2 text-right text-gray-600">{formatPrice(r.margin)}</td>
                <td className="px-4 py-2 text-right font-medium text-navy-800">{r.marginPct.toFixed(0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
