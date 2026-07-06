"use client";

import { formatPrice } from "@/lib/format";
import type { EmployeePerformance } from "@/lib/management-extra-aggregates";

export default function TeamSection({ rows }: { rows: EmployeePerformance[] }) {
  const top = rows[0];

  return (
    <div>
      <h2 className="text-lg font-bold text-navy-800 mb-4 leading-snug">
        {top
          ? `${top.name} leads the team, handling ${top.ordersHandled} orders worth ${formatPrice(top.revenue)}.`
          : "Team performance"}
      </h2>

      <div className="bg-white rounded-2xl border border-sand-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-sand-200">
              <th className="px-4 py-2">Employee</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2 text-right">Orders handled</th>
              <th className="px-4 py-2 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.empId} className="border-b border-sand-100 last:border-0">
                <td className="px-4 py-2 font-medium text-navy-800">{r.name}</td>
                <td className="px-4 py-2 text-gray-600">{r.role}</td>
                <td className="px-4 py-2 text-right text-gray-600">{r.ordersHandled}</td>
                <td className="px-4 py-2 text-right text-gray-600">{formatPrice(r.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Covers orders a staff member personally processed — in person or over shipping — not the web store&rsquo;s
        self-checkout orders.
      </p>
    </div>
  );
}
