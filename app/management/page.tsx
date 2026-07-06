import { cookies } from "next/headers";
import { isValidSession, MANAGEMENT_COOKIE_NAME } from "@/lib/management-auth";
import {
  fetchOrders,
  fetchOrderLines,
  fetchCustomers,
  fetchProducts,
  fetchRentals,
  fetchPromotions,
  fetchOrderPromotions,
  fetchEmployees,
  type OrderRow,
} from "@/lib/management-data";
import { computeMonthlyFinancials } from "@/lib/management-aggregates";
import { buildForecastModels, truncateToContiguous, MAX_HORIZON } from "@/lib/management-forecast-data";
import { computeReorderAnalysis, LEAD_TIME_DAYS, SERVICE_Z } from "@/lib/management-inventory";
import {
  computeProductPerformance,
  computeRentalsVsSales,
  computeCustomerInsights,
  computePromotionPerformance,
  computeEmployeePerformance,
  computeSeasonality,
} from "@/lib/management-extra-aggregates";
import ManagementLogin from "@/components/ManagementLogin";
import Dashboard from "@/components/management/Dashboard";
import OverviewSection, { type OverviewData } from "@/components/management/OverviewSection";
import HistoricalsSection from "@/components/management/HistoricalsSection";
import ForecastingSection from "@/components/management/ForecastingSection";
import InventorySection from "@/components/management/InventorySection";
import ProductPerformanceSection from "@/components/management/ProductPerformanceSection";
import RentalsVsSalesSection from "@/components/management/RentalsVsSalesSection";
import CustomersSection from "@/components/management/CustomersSection";
import PromotionsSection from "@/components/management/PromotionsSection";
import TeamSection from "@/components/management/TeamSection";
import SeasonalitySection from "@/components/management/SeasonalitySection";
import AssistantSection from "@/components/management/AssistantSection";

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

  const [orders, lines, customers, products, rentals, promotions, orderPromotions, employees] = await Promise.all([
    fetchOrders(),
    fetchOrderLines(),
    fetchCustomers(),
    fetchProducts(),
    fetchRentals(),
    fetchPromotions(),
    fetchOrderPromotions(),
    fetchEmployees(),
  ]);

  const overview = loadOverview(orders, lines, customers, products);
  const monthlyFinancials = computeMonthlyFinancials(orders, lines);
  const forecastModels = buildForecastModels(monthlyFinancials);
  const forecastHistoryLength = truncateToContiguous(monthlyFinancials).length;
  const inventoryRows = computeReorderAnalysis(orders, lines, products);
  const productPerformance = computeProductPerformance(lines, products);
  const rentalsVsSales = computeRentalsVsSales(orders, lines, rentals, products);
  const customerInsights = computeCustomerInsights(orders, customers);
  const promotionPerformance = computePromotionPerformance(orders, orderPromotions, promotions, lines);
  const employeePerformance = computeEmployeePerformance(orders, employees);
  const seasonality = computeSeasonality(orders);

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
        {
          id: "inventory",
          label: "Inventory",
          content: <InventorySection rows={inventoryRows} leadTimeDays={LEAD_TIME_DAYS} serviceZ={SERVICE_Z} />,
        },
        {
          id: "products",
          label: "Product Margins",
          content: <ProductPerformanceSection rows={productPerformance} />,
        },
        {
          id: "rentals",
          label: "Rentals vs Sales",
          content: <RentalsVsSalesSection data={rentalsVsSales} />,
        },
        {
          id: "customers",
          label: "Customers",
          content: <CustomersSection data={customerInsights} />,
        },
        {
          id: "promotions",
          label: "Promotions",
          content: (
            <PromotionsSection promos={promotionPerformance.promos} baselineAvgOrderValue={promotionPerformance.baselineAvgOrderValue} />
          ),
        },
        {
          id: "team",
          label: "Team",
          content: <TeamSection rows={employeePerformance} />,
        },
        {
          id: "seasonality",
          label: "Seasonality",
          content: <SeasonalitySection rows={seasonality} />,
        },
        {
          id: "assistant",
          label: "Ask the Data",
          content: <AssistantSection />,
        },
      ]}
    />
  );
}
