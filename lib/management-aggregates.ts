import "server-only";
import type { OrderRow, OrderLineRow } from "./management-data";

export type MonthlyFinancial = {
  year: number;
  month: number; // 1-12
  label: string; // "2021-05"
  monthName: string; // "May"
  revenue: number;
  cost: number;
  margin: number;
  marginPct: number;
};

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Monthly revenue/cost/margin from OrderLines, joined to Orders for the date.
// Product-line-based (LineRevenue/LineCost), so it reflects gross margin on
// goods sold -- deliberately excludes ShippingFee since we have no matching
// shipping cost to net it against.
export function computeMonthlyFinancials(orders: OrderRow[], lines: OrderLineRow[]): MonthlyFinancial[] {
  const orderDateById = new Map(orders.map((o) => [o.OrderID, o.OrderDate]));
  const byKey = new Map<string, { revenue: number; cost: number }>();

  for (const line of lines) {
    const date = orderDateById.get(line.OrderID);
    if (!date) continue;
    const key = date.slice(0, 7); // "YYYY-MM"
    const entry = byKey.get(key) ?? { revenue: 0, cost: 0 };
    entry.revenue += Number(line.LineRevenue);
    entry.cost += Number(line.LineCost);
    byKey.set(key, entry);
  }

  return [...byKey.entries()]
    .map(([key, { revenue, cost }]) => {
      const [year, month] = key.split("-").map(Number);
      const margin = revenue - cost;
      return {
        year,
        month,
        label: key,
        monthName: MONTH_NAMES[month - 1],
        revenue: Math.round(revenue * 100) / 100,
        cost: Math.round(cost * 100) / 100,
        margin: Math.round(margin * 100) / 100,
        marginPct: revenue > 0 ? (margin / revenue) * 100 : 0,
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}
