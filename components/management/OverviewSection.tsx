import { formatPrice } from "@/lib/format";

export type RecentOrder = {
  orderId: string;
  date: string;
  customerName: string;
  country: string | null;
  total: number;
};

export type OverviewData = {
  weekOrderCount: number;
  weekRevenue: number;
  bestSellerName: string | null;
  recentOrders: RecentOrder[];
};

export default function OverviewSection({ data }: { data: OverviewData }) {
  return (
    <div>
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-sand-200 p-5">
          <p className="text-sm text-gray-500">Orders (last 7 days)</p>
          <p className="text-2xl font-bold text-navy-800">{data.weekOrderCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-sand-200 p-5">
          <p className="text-sm text-gray-500">Revenue (last 7 days)</p>
          <p className="text-2xl font-bold text-navy-800">{formatPrice(data.weekRevenue)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-sand-200 p-5">
          <p className="text-sm text-gray-500">Best seller (all-time)</p>
          <p className="text-lg font-bold text-navy-800">{data.bestSellerName ?? "No sales yet"}</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-navy-800">Recent orders</h2>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- file download, not a page navigation */}
        <a
          href="/api/management/export"
          className="bg-teal-500 hover:bg-teal-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors"
        >
          Download sales (CSV)
        </a>
      </div>

      <div className="bg-white rounded-2xl border border-sand-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-sand-200">
              <th className="px-4 py-2">Order</th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Country</th>
              <th className="px-4 py-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.recentOrders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                  No orders yet.
                </td>
              </tr>
            ) : (
              data.recentOrders.map((o) => (
                <tr key={o.orderId} className="border-b border-sand-100 last:border-0">
                  <td className="px-4 py-2 font-medium text-navy-800">{o.orderId}</td>
                  <td className="px-4 py-2 text-gray-600">{o.date}</td>
                  <td className="px-4 py-2 text-gray-600">{o.customerName}</td>
                  <td className="px-4 py-2 text-gray-600">{o.country ?? "—"}</td>
                  <td className="px-4 py-2 text-right font-medium text-navy-800">{formatPrice(o.total)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
