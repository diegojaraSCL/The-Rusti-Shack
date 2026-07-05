import { cookies } from "next/headers";
import { isValidSession, MANAGER_COOKIE_NAME } from "@/lib/manager-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { formatPrice } from "@/lib/format";
import ManagerLogin from "@/components/ManagerLogin";

export const dynamic = "force-dynamic";

type OrderRow = {
  OrderID: string;
  OrderDate: string;
  CustID: string;
  Country: string | null;
  OrderTotal: number;
};

async function loadDashboard() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoff = sevenDaysAgo.toISOString().slice(0, 10);

  const { data: recentWeekOrders } = await supabaseAdmin
    .from("Orders")
    .select('"OrderID","OrderTotal"')
    .gte("OrderDate", cutoff);

  const weekOrderCount = recentWeekOrders?.length ?? 0;
  const weekRevenue = (recentWeekOrders ?? []).reduce((sum, o) => sum + Number(o.OrderTotal), 0);

  const { data: lines } = await supabaseAdmin.from("OrderLines").select('"ProductCode","Quantity"');
  const qtyBySku = new Map<string, number>();
  for (const line of lines ?? []) {
    qtyBySku.set(line.ProductCode, (qtyBySku.get(line.ProductCode) ?? 0) + Number(line.Quantity));
  }
  let bestSeller: { sku: string; qty: number } | null = null;
  for (const [sku, qty] of qtyBySku) {
    if (!bestSeller || qty > bestSeller.qty) bestSeller = { sku, qty };
  }
  let bestSellerName: string | null = null;
  if (bestSeller) {
    const { data: product } = await supabaseAdmin
      .from("products")
      .select('"ProductName"')
      .eq("SKU", bestSeller.sku)
      .maybeSingle();
    bestSellerName = (product?.ProductName as string) ?? bestSeller.sku;
  }

  const { data: orders } = await supabaseAdmin
    .from("Orders")
    .select('"OrderID","OrderDate","CustID","OrderTotal"')
    .order('"OrderID"', { ascending: false })
    .limit(20);

  const custIds = [...new Set((orders ?? []).map((o) => o.CustID))];
  const { data: customers } = custIds.length
    ? await supabaseAdmin.from("Customers_Core").select('"CustomerID","FirstName","LastName","Country"').in("CustomerID", custIds)
    : { data: [] };
  const customerById = new Map((customers ?? []).map((c) => [c.CustomerID, c]));

  const recentOrders: (OrderRow & { customerName: string })[] = (orders ?? []).map((o) => {
    const c = customerById.get(o.CustID);
    return {
      ...o,
      Country: c?.Country ?? null,
      customerName: c ? `${c.FirstName} ${c.LastName}` : o.CustID,
    };
  });

  return { weekOrderCount, weekRevenue, bestSellerName, recentOrders };
}

export default async function ManagerPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get(MANAGER_COOKIE_NAME)?.value;

  if (!isValidSession(session)) {
    return <ManagerLogin />;
  }

  const { weekOrderCount, weekRevenue, bestSellerName, recentOrders } = await loadDashboard();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-navy-800 mb-6">Manager Dashboard</h1>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-sand-200 p-5">
          <p className="text-sm text-gray-500">Orders (last 7 days)</p>
          <p className="text-2xl font-bold text-navy-800">{weekOrderCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-sand-200 p-5">
          <p className="text-sm text-gray-500">Revenue (last 7 days)</p>
          <p className="text-2xl font-bold text-navy-800">{formatPrice(weekRevenue)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-sand-200 p-5">
          <p className="text-sm text-gray-500">Best seller (all-time)</p>
          <p className="text-lg font-bold text-navy-800">{bestSellerName ?? "No sales yet"}</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-navy-800">Recent orders</h2>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- file download, not a page navigation */}
        <a
          href="/api/manager/export"
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
            {recentOrders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                  No orders yet.
                </td>
              </tr>
            ) : (
              recentOrders.map((o) => (
                <tr key={o.OrderID} className="border-b border-sand-100 last:border-0">
                  <td className="px-4 py-2 font-medium text-navy-800">{o.OrderID}</td>
                  <td className="px-4 py-2 text-gray-600">{o.OrderDate}</td>
                  <td className="px-4 py-2 text-gray-600">{o.customerName}</td>
                  <td className="px-4 py-2 text-gray-600">{o.Country ?? "—"}</td>
                  <td className="px-4 py-2 text-right font-medium text-navy-800">
                    {formatPrice(Number(o.OrderTotal))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
