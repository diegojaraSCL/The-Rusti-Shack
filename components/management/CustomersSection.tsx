"use client";

import { formatPrice } from "@/lib/format";
import type { CustomerInsights } from "@/lib/management-extra-aggregates";

export default function CustomersSection({ data }: { data: CustomerInsights }) {
  const totalCustomers = data.repeatCustomers + data.oneTimeCustomers;
  const repeatPct = totalCustomers > 0 ? (data.repeatCustomers / totalCustomers) * 100 : 0;

  return (
    <div>
      <h2 className="text-lg font-bold text-navy-800 mb-4 leading-snug">
        {repeatPct.toFixed(0)}% of customers come back for a second order, and repeat customers account for{" "}
        {formatPrice(data.repeatRevenue)} of all revenue.
      </h2>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-sand-200 p-5">
          <h3 className="font-bold text-navy-800 mb-3">By customer type</h3>
          <table className="w-full text-sm">
            <tbody>
              {data.bySegment.map((s) => (
                <tr key={s.type} className="border-b border-sand-100 last:border-0">
                  <td className="py-2 text-gray-600">{s.type}</td>
                  <td className="py-2 text-right text-gray-600">{s.customers} customers</td>
                  <td className="py-2 text-right font-medium text-navy-800">{formatPrice(s.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-2xl border border-sand-200 p-5">
          <h3 className="font-bold text-navy-800 mb-3">Repeat vs. one-time</h3>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">Repeat ({data.repeatCustomers})</span>
            <span className="font-medium text-navy-800">{formatPrice(data.repeatRevenue)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">One-time ({data.oneTimeCustomers})</span>
            <span className="font-medium text-navy-800">{formatPrice(data.oneTimeRevenue)}</span>
          </div>
        </div>
      </div>

      <h3 className="font-bold text-navy-800 mb-2">Top countries by revenue</h3>
      <div className="bg-white rounded-2xl border border-sand-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-sand-200">
              <th className="px-4 py-2">Country</th>
              <th className="px-4 py-2 text-right">Customers</th>
              <th className="px-4 py-2 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {data.byCountry.map((c) => (
              <tr key={c.country} className="border-b border-sand-100 last:border-0">
                <td className="px-4 py-2 font-medium text-navy-800">{c.country}</td>
                <td className="px-4 py-2 text-right text-gray-600">{c.customers}</td>
                <td className="px-4 py-2 text-right text-gray-600">{formatPrice(c.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
