import { cookies } from "next/headers";
import { isValidSession, MANAGEMENT_COOKIE_NAME } from "@/lib/management-auth";
import { fetchOrders, fetchOrderLines, fetchCustomers, fetchProducts } from "@/lib/management-data";
import ManagementLogin from "@/components/ManagementLogin";
import Dashboard from "@/components/management/Dashboard";
import OverviewSection, { type OverviewData } from "@/components/management/OverviewSection";

export const dynamic = "force-dynamic";

async function loadOverview(): Promise<OverviewData> {
  const [orders, lines, customers] = await Promise.all([fetchOrders(), fetchOrderLines(), fetchCustomers()]);

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoff = sevenDaysAgo.toISOString().slice(0, 10);

  const weekOrders = orders.filter((o) => o.OrderDate >= cutoff);
  const weekOrderCount = weekOrders.length;
  const weekRevenue = weekOrders.reduce((sum, o) => sum + Number(o.OrderTotal), 0);

  const qtyBySku = new Map<string, number>();
  for (const line of lines) {
    qtyBySku.set(line.ProductCode, (qtyBySku.get(line.ProductCode) ?? 0) + Number(line.Quantity));
  }
  let bestSellerSku: string | null = null;
  let bestQty = -1;
  for (const [sku, qty] of qtyBySku) {
    if (qty > bestQty) {
      bestQty = qty;
      bestSellerSku = sku;
    }
  }
  let bestSellerName: string | null = null;
  if (bestSellerSku) {
    const products = await fetchProducts();
    bestSellerName = products.find((p) => p.SKU === bestSellerSku)?.ProductName ?? bestSellerSku;
  }

  const customerById = new Map(customers.map((c) => [c.CustomerID, c]));
  const recentOrders = [...orders]
    .sort((a, b) => (a.OrderID < b.OrderID ? 1 : -1))
    .slice(0, 20)
    .map((o) => {
      const c = customerById.get(o.CustID);
      return {
        orderId: o.OrderID,
        date: o.OrderDate,
        customerName: c ? `${c.FirstName} ${c.LastName}` : o.CustID,
        country: c?.Country ?? null,
        total: Number(o.OrderTotal),
      };
    });

  return { weekOrderCount, weekRevenue, bestSellerName, recentOrders };
}

export default async function ManagementPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get(MANAGEMENT_COOKIE_NAME)?.value;

  if (!isValidSession(session)) {
    return <ManagementLogin />;
  }

  const overview = await loadOverview();

  return (
    <Dashboard
      sections={[{ id: "overview", label: "Overview", content: <OverviewSection data={overview} /> }]}
    />
  );
}
