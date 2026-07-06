"use client";

import { formatPrice } from "@/lib/format";

type Props = {
  promos: {
    promoCode: string;
    promoName: string;
    promoType: string;
    timesUsed: number;
    totalDiscountGiven: number;
    avgOrderValue: number;
  }[];
  baselineAvgOrderValue: number;
};

export default function PromotionsSection({ promos, baselineAvgOrderValue }: Props) {
  const topPromo = [...promos].sort((a, b) => b.timesUsed - a.timesUsed)[0];
  const lift =
    topPromo && baselineAvgOrderValue > 0 ? ((topPromo.avgOrderValue - baselineAvgOrderValue) / baselineAvgOrderValue) * 100 : 0;

  return (
    <div>
      <h2 className="text-lg font-bold text-navy-800 mb-4 leading-snug">
        Orders without any promo average {formatPrice(baselineAvgOrderValue)} — {topPromo?.promoName ?? "promotions"}{" "}
        orders average {topPromo ? formatPrice(topPromo.avgOrderValue) : "—"}
        {topPromo ? ` (${lift >= 0 ? "+" : ""}${lift.toFixed(0)}%)` : ""}.
      </h2>

      <div className="bg-white rounded-2xl border border-sand-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-sand-200">
              <th className="px-4 py-2">Promotion</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2 text-right">Times used</th>
              <th className="px-4 py-2 text-right">Discount given</th>
              <th className="px-4 py-2 text-right">Avg order value</th>
              <th className="px-4 py-2 text-right">vs. baseline</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-sand-200 bg-sand-50">
              <td className="px-4 py-2 font-medium text-navy-800" colSpan={4}>
                No promotion (baseline)
              </td>
              <td className="px-4 py-2 text-right font-medium text-navy-800">{formatPrice(baselineAvgOrderValue)}</td>
              <td className="px-4 py-2 text-right text-gray-400">—</td>
            </tr>
            {promos.map((p) => {
              const promoLift =
                baselineAvgOrderValue > 0 ? ((p.avgOrderValue - baselineAvgOrderValue) / baselineAvgOrderValue) * 100 : 0;
              return (
                <tr key={p.promoCode} className="border-b border-sand-100 last:border-0">
                  <td className="px-4 py-2 font-medium text-navy-800">{p.promoName}</td>
                  <td className="px-4 py-2 text-gray-600">{p.promoType}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{p.timesUsed}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{formatPrice(p.totalDiscountGiven)}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{formatPrice(p.avgOrderValue)}</td>
                  <td className={`px-4 py-2 text-right font-medium ${promoLift >= 0 ? "text-teal-600" : "text-coral-500"}`}>
                    {promoLift >= 0 ? "+" : ""}
                    {promoLift.toFixed(0)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        &ldquo;vs. baseline&rdquo; compares average order value on promoted orders to non-promoted orders — a positive
        number means those orders were bigger even after the discount, not just cheaper.
      </p>
    </div>
  );
}
