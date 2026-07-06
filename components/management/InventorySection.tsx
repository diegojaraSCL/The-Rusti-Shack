"use client";

import { useState } from "react";
import type { InventoryRow } from "@/lib/management-inventory";

export default function InventorySection({
  rows,
  leadTimeDays,
  serviceZ,
}: {
  rows: InventoryRow[];
  leadTimeDays: number;
  serviceZ: number;
}) {
  const [infoOpen, setInfoOpen] = useState(false);
  const needReorder = rows.filter((r) => r.needsReorder);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-navy-800">
          {needReorder.length === 0
            ? "Everything is stocked above its reorder point."
            : `${needReorder.length} product${needReorder.length === 1 ? "" : "s"} need${needReorder.length === 1 ? "s" : ""} reordering now.`}
        </h2>
        <button
          onClick={() => setInfoOpen((v) => !v)}
          className="w-6 h-6 rounded-full bg-navy-50 text-navy-800 text-xs font-bold flex items-center justify-center shrink-0"
          aria-label="About reorder points"
        >
          i
        </button>
      </div>

      {infoOpen && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 mb-4 text-sm text-teal-800">
          Each product&rsquo;s reorder point is <strong>(average daily demand × lead time) + safety stock</strong>,
          where safety stock covers demand swings during that lead time. We assume a{" "}
          <strong>{leadTimeDays}-day</strong> supplier lead time (the data doesn&rsquo;t specify one — adjust this
          if Rusti gives you her real number) and a <strong>95% service level</strong> (z={serviceZ}), meaning stock
          should cover demand about 95% of the time before running out.
          Demand and its day-to-day variability come from the last 365 days of real sales for that product line.
          Products are flagged the moment stock on hand drops below that calculated point — not the spreadsheet&rsquo;s
          own ReorderPoint column, which we don&rsquo;t use here.
        </div>
      )}

      <div className="bg-white rounded-2xl border border-sand-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-sand-200">
              <th className="px-4 py-2">Product</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2 text-right">In stock</th>
              <th className="px-4 py-2 text-right">Reorder point</th>
              <th className="px-4 py-2 text-right">Days left</th>
              <th className="px-4 py-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.familySku}
                className={`border-b border-sand-100 last:border-0 ${r.needsReorder ? "bg-coral-500/5" : ""}`}
              >
                <td className="px-4 py-2 font-medium text-navy-800">{r.productName}</td>
                <td className="px-4 py-2 text-gray-600">{r.category}</td>
                <td className="px-4 py-2 text-right text-gray-600">{r.availableStock}</td>
                <td className="px-4 py-2 text-right text-gray-600">{r.reorderPoint.toFixed(1)}</td>
                <td className="px-4 py-2 text-right text-gray-600">
                  {r.daysOfStockLeft == null ? "—" : `${r.daysOfStockLeft.toFixed(0)}d`}
                </td>
                <td className="px-4 py-2 text-center">
                  {r.needsReorder ? (
                    <span className="inline-block text-xs font-semibold px-2 py-1 rounded-full bg-coral-500 text-white">
                      Reorder now
                    </span>
                  ) : (
                    <span className="inline-block text-xs font-semibold px-2 py-1 rounded-full bg-teal-500/10 text-teal-600">
                      OK
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
