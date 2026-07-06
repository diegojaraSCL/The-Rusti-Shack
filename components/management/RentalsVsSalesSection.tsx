"use client";

import { Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart } from "recharts";
import { formatPrice } from "@/lib/format";
import type { RentalsVsSales } from "@/lib/management-extra-aggregates";

export default function RentalsVsSalesSection({ data }: { data: RentalsVsSales }) {
  const rentalShare = data.totalSales + data.totalRentals > 0 ? (data.totalRentals / (data.totalSales + data.totalRentals)) * 100 : 0;

  return (
    <div>
      <h2 className="text-lg font-bold text-navy-800 mb-4 leading-snug">
        Rentals bring in {formatPrice(data.totalRentals)} alongside {formatPrice(data.totalSales)} in sales — about{" "}
        {rentalShare.toFixed(0)}% of total revenue, running on its own steady track rather than cutting into sales.
      </h2>

      <div className="bg-white rounded-2xl border border-sand-200 p-4 mb-4">
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={data.monthly} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8d5b0" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${Math.round(v / 1000)}k`} />
            <Tooltip formatter={(value) => formatPrice(Number(value))} />
            <Legend />
            <Line dataKey="salesRevenue" name="Sales" stroke="#2a9d8f" strokeWidth={2} dot={false} />
            <Line dataKey="rentalRevenue" name="Rentals" stroke="#e8693a" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <h3 className="font-bold text-navy-800 mb-2">Top rental earners</h3>
      <div className="bg-white rounded-2xl border border-sand-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-sand-200">
              <th className="px-4 py-2">Product</th>
              <th className="px-4 py-2 text-right">Rental revenue</th>
              <th className="px-4 py-2 text-right">Sales revenue</th>
            </tr>
          </thead>
          <tbody>
            {data.byProduct.slice(0, 10).map((p) => (
              <tr key={p.familySku} className="border-b border-sand-100 last:border-0">
                <td className="px-4 py-2 font-medium text-navy-800">{p.productName}</td>
                <td className="px-4 py-2 text-right text-gray-600">{formatPrice(p.rentalRevenue)}</td>
                <td className="px-4 py-2 text-right text-gray-600">{formatPrice(p.salesRevenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
