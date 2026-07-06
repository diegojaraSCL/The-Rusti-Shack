import "server-only";
import type { OrderRow, OrderLineRow, ProductRow, CustomerCoreRow } from "./management-data";

// These aggregates exist specifically for the AI assistant's read-only tools
// (Part D). They never surface customer name/email/phone/city/country —
// only the anonymous CustomerID — per the PII de-identification guardrail.
// See AGENTS.md / HANDOFF_PART_D.md for the reasoning.

export type TopCustomer = { customerId: string; totalSpend: number; orderCount: number };

export function computeTopCustomersBySpend(orders: OrderRow[], limit: number): TopCustomer[] {
  const byCustomer = new Map<string, { spend: number; orders: number }>();
  for (const o of orders) {
    const entry = byCustomer.get(o.CustID) ?? { spend: 0, orders: 0 };
    entry.spend += Number(o.OrderTotal);
    entry.orders += 1;
    byCustomer.set(o.CustID, entry);
  }
  return [...byCustomer.entries()]
    .map(([customerId, v]) => ({ customerId, totalSpend: Math.round(v.spend * 100) / 100, orderCount: v.orders }))
    .sort((a, b) => b.totalSpend - a.totalSpend)
    .slice(0, limit);
}

export type ProductAffinityPair = { productA: string; productB: string; timesTogether: number };

// "Which products tend to sell together" — co-occurrence within the same
// order, counted at the product-family level (variants of the same parent
// collapsed), same grouping convention as computeProductPerformance.
export function computeProductAffinity(lines: OrderLineRow[], products: ProductRow[], limit: number): ProductAffinityPair[] {
  const skuToFamily = new Map(products.map((p) => [p.SKU, p.ParentSKU || p.SKU]));
  const familyName = new Map(
    products.filter((p) => p.VariantType !== "Variant").map((p) => [p.ParentSKU || p.SKU, p.ProductName])
  );

  const familiesByOrder = new Map<string, Set<string>>();
  for (const line of lines) {
    const family = skuToFamily.get(line.ProductCode);
    if (!family) continue;
    if (!familiesByOrder.has(line.OrderID)) familiesByOrder.set(line.OrderID, new Set());
    familiesByOrder.get(line.OrderID)!.add(family);
  }

  const pairCounts = new Map<string, number>();
  for (const families of familiesByOrder.values()) {
    if (families.size < 2) continue;
    const list = [...families].sort();
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const key = `${list[i]}|${list[j]}`;
        pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
      }
    }
  }

  return [...pairCounts.entries()]
    .map(([key, timesTogether]) => {
      const [a, b] = key.split("|");
      return {
        productA: familyName.get(a) ?? a,
        productB: familyName.get(b) ?? b,
        timesTogether,
      };
    })
    .sort((a, b) => b.timesTogether - a.timesTogether)
    .slice(0, limit);
}

export type MonthlyRevenueByType = { months: string[]; series: { type: string; values: number[] }[] };

// Monthly revenue split by CustomerType (Local/Tourist/Shipping) -- shaped
// to drop straight into the render_line_chart tool's xLabels/series args.
export function computeMonthlyRevenueByCustomerType(
  orders: OrderRow[],
  customers: CustomerCoreRow[],
  monthsBack: number
): MonthlyRevenueByType {
  const typeByCustomer = new Map(customers.map((c) => [c.CustomerID, c.CustomerType]));
  const byMonth = new Map<string, Map<string, number>>();
  for (const o of orders) {
    const month = o.OrderDate.slice(0, 7);
    const type = typeByCustomer.get(o.CustID) ?? "Unknown";
    if (!byMonth.has(month)) byMonth.set(month, new Map());
    const typeMap = byMonth.get(month)!;
    typeMap.set(type, (typeMap.get(type) ?? 0) + Number(o.OrderTotal));
  }

  const months = [...byMonth.keys()].sort().slice(-monthsBack);
  const types = [...new Set(customers.map((c) => c.CustomerType))];
  const series = types.map((type) => ({
    type,
    values: months.map((m) => Math.round((byMonth.get(m)?.get(type) ?? 0) * 100) / 100),
  }));

  return { months, series };
}

export type MonthlyRevenueByChannel = { months: string[]; series: { channel: string; values: number[] }[] };

// Monthly revenue split by sales Channel (Walk-in/Shipping) -- same shape
// as computeMonthlyRevenueByCustomerType, for the same line-chart tool.
export function computeMonthlyRevenueByChannel(orders: OrderRow[], monthsBack: number): MonthlyRevenueByChannel {
  const byMonth = new Map<string, Map<string, number>>();
  for (const o of orders) {
    const month = o.OrderDate.slice(0, 7);
    if (!byMonth.has(month)) byMonth.set(month, new Map());
    const channelMap = byMonth.get(month)!;
    channelMap.set(o.Channel, (channelMap.get(o.Channel) ?? 0) + Number(o.OrderTotal));
  }

  const months = [...byMonth.keys()].sort().slice(-monthsBack);
  const channels = [...new Set(orders.map((o) => o.Channel))];
  const series = channels.map((channel) => ({
    channel,
    values: months.map((m) => Math.round((byMonth.get(m)?.get(channel) ?? 0) * 100) / 100),
  }));

  return { months, series };
}

export type PaymentMethodBreakdown = { method: string; orderCount: number; revenue: number };

export function computePaymentMethodBreakdown(orders: OrderRow[]): PaymentMethodBreakdown[] {
  const byMethod = new Map<string, { orders: number; revenue: number }>();
  for (const o of orders) {
    const entry = byMethod.get(o.PaymentMethod) ?? { orders: 0, revenue: 0 };
    entry.orders += 1;
    entry.revenue += Number(o.OrderTotal);
    byMethod.set(o.PaymentMethod, entry);
  }
  return [...byMethod.entries()]
    .map(([method, v]) => ({ method, orderCount: v.orders, revenue: Math.round(v.revenue * 100) / 100 }))
    .sort((a, b) => b.revenue - a.revenue);
}
