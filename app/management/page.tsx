import { cookies } from "next/headers";
import { isValidSession, MANAGEMENT_COOKIE_NAME } from "@/lib/management-auth";
import { fetchOrders, fetchOrderLines, fetchCustomers, fetchProducts, type OrderRow } from "@/lib/management-data";
import { computeMonthlyFinancials } from "@/lib/management-aggregates";
import { buildForecastModels, truncateToContiguous, MAX_HORIZON } from "@/lib/management-forecast-data";
import ManagementLogin from "@/components/ManagementLogin";
import Dashboard from "@/components/management/Dashboard";
import OverviewSection, { type OverviewData } from "@/components/management/OverviewSection";
import HistoricalsSection from "@/components/management/HistoricalsSection";
import ForecastingSection from "@/components/management/ForecastingSection";

export const dynamic = "force-dynamic";

function loadOverview(
  orders: OrderRow[],
  lines: Awaited<ReturnType<typeof fetchOrderLines>>,
  customers: Awaited<ReturnType<typeof fetchCustomers>>,
  products: Awaited<ReturnType<typeof fetchProducts>>
): OverviewData {
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
  const bestSellerName = bestSellerSku
    ? (products.find((p) => p.SKU === bestSellerSku)?.ProductName ?? bestSellerSku)
    : null;

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

  const [orders, lines, customers, products] = await Promise.all([
    fetchOrders(),
    fetchOrderLines(),
    fetchCustomers(),
    fetchProducts(),
  ]);

  const overview = loadOverview(orders, lines, customers, products);
  const monthlyFinancials = computeMonthlyFinancials(orders, lines);
  const forecastModels = buildForecastModels(monthlyFinancials);
  const forecastHistoryLength = truncateToContiguous(monthlyFinancials).length;

  const availableYears = [...new Set(orders.map((o) => Number(o.OrderDate.slice(0, 4))))].sort((a, b) => a - b);

  return (
    <Dashboard
      availableYears={availableYears}
      sections={[
        { id: "overview", label: "Overview", content: <OverviewSection data={overview} /> },
        {
          id: "historicals",
          label: "Revenue & Margin",
          usesYearFilter: true,
          content: <HistoricalsSection monthly={monthlyFinancials} />,
        },
        {
          id: "forecasting",
          label: "Forecasting",
          content: (
            <ForecastingSection models={forecastModels} historyLength={forecastHistoryLength} maxHorizon={MAX_HORIZON} />
          ),
        },
      ]}
    />
  );
}
