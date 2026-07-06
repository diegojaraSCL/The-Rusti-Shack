import "server-only";
import type {
  OrderRow,
  OrderLineRow,
  CustomerCoreRow,
  ProductRow,
  RentalRow,
  PromotionRow,
  OrderPromotionRow,
  EmployeeRow,
} from "./management-data";
import { computeMonthlyFinancials } from "./management-aggregates";
import {
  computeProductPerformance,
  computeRentalsVsSales,
  computeCustomerInsights,
  computePromotionPerformance,
  computeEmployeePerformance,
  computeSeasonality,
} from "./management-extra-aggregates";
import { computeReorderAnalysis } from "./management-inventory";
import {
  computeTopCustomersBySpend,
  computeProductAffinity,
  computeMonthlyRevenueByCustomerType,
  computeMonthlyRevenueByChannel,
  computePaymentMethodBreakdown,
} from "./management-assistant-aggregates";
import type { ToolDeclaration } from "./management-assistant-gemini";

// Every tool here is read-only: it queries in-memory data already fetched
// with the existing lib/management-data.ts fetchers and returns a compact,
// pre-aggregated result. None of them ever touch FirstName/LastName/City/
// Country from Customers_Core, and none can write to Supabase. See
// Part_D_Research_Writeup.docx Section 2 and 4 for why.

export const MAX_CHART_ITEMS = 15;

function capLimit(requested: unknown, fallback = 10): number {
  const n = typeof requested === "number" && Number.isFinite(requested) ? Math.floor(requested) : fallback;
  return Math.max(1, Math.min(MAX_CHART_ITEMS, n));
}

export type ChartDirective =
  | { type: "bar"; title: string; labels: string[]; values: number[]; colors?: string[] }
  | { type: "pie"; title: string; labels: string[]; values: number[] }
  | { type: "line"; title: string; xLabels: string[]; series: { name: string; values: number[] }[] }
  | { type: "number_card"; label: string; value: number; format?: "currency" | "number" | "percent" };

export type AssistantData = {
  orders: OrderRow[];
  lines: OrderLineRow[];
  customers: CustomerCoreRow[];
  products: ProductRow[];
  rentals: RentalRow[];
  promotions: PromotionRow[];
  orderPromotions: OrderPromotionRow[];
  employees: EmployeeRow[];
};

const numberArraySchema = { type: "array", items: { type: "number" } } as const;
const stringArraySchema = { type: "array", items: { type: "string" } } as const;

export const TOOL_DECLARATIONS: ToolDeclaration[] = [
  {
    name: "get_revenue_summary",
    description: "Monthly revenue, cost, margin, and margin % for the whole shop.",
    parameters: {
      type: "object",
      properties: { months: { type: "number", description: "How many recent months to return, max 36. Defaults to 12." } },
    },
  },
  {
    name: "get_top_products",
    description: "Top-selling product families ranked by revenue, margin, or units sold.",
    parameters: {
      type: "object",
      properties: {
        metric: { type: "string", enum: ["revenue", "margin", "units"], description: "What to rank by. Defaults to revenue." },
        limit: { type: "number", description: `Max rows to return, capped at ${MAX_CHART_ITEMS}. Defaults to 10.` },
      },
    },
  },
  {
    name: "get_rentals_vs_sales_summary",
    description: "Monthly sales revenue vs. rental revenue, plus totals and a per-product breakdown of rental revenue.",
    parameters: {
      type: "object",
      properties: { limit: { type: "number", description: `Max products to include, capped at ${MAX_CHART_ITEMS}. Defaults to 10.` } },
    },
  },
  {
    name: "get_top_customers_by_spend",
    description:
      "Top customers by total lifetime spend or order count. Returns only an anonymous customer ID (e.g. CUST00042) and numbers — never a name, email, or address.",
    parameters: {
      type: "object",
      properties: { limit: { type: "number", description: `Max rows, capped at ${MAX_CHART_ITEMS}. Defaults to 10.` } },
    },
  },
  {
    name: "get_customer_segments",
    description: "Customer counts and revenue grouped by customer type (Local/Tourist/Shipping), plus repeat vs. one-time customer counts and revenue.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "get_revenue_by_customer_type",
    description:
      "Monthly revenue broken down by customer type (Local/Tourist/Shipping) over time. Use this — not get_customer_segments — for trend or line-chart questions comparing how customer types' spending has moved month to month.",
    parameters: {
      type: "object",
      properties: { months: { type: "number", description: "How many recent months to return, max 36. Defaults to 12." } },
    },
  },
  {
    name: "get_customer_geography",
    description: "Customer counts and revenue grouped by country. Aggregated only — never tied to an individual customer.",
    parameters: {
      type: "object",
      properties: { limit: { type: "number", description: `Max countries, capped at ${MAX_CHART_ITEMS}. Defaults to 10.` } },
    },
  },
  {
    name: "get_product_affinity",
    description: "Which product families tend to sell together in the same order (market-basket co-occurrence).",
    parameters: {
      type: "object",
      properties: { limit: { type: "number", description: `Max pairs, capped at ${MAX_CHART_ITEMS}. Defaults to 10.` } },
    },
  },
  {
    name: "get_revenue_by_channel",
    description: "Monthly revenue broken down by sales channel (Walk-in vs. Shipping/online) over time — use for trend or line-chart questions about online vs. in-person business.",
    parameters: {
      type: "object",
      properties: { months: { type: "number", description: "How many recent months to return, max 36. Defaults to 12." } },
    },
  },
  {
    name: "get_payment_method_breakdown",
    description: "Order count and revenue grouped by payment method (Card/Cash/GCash/BankTransfer).",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "get_promotion_performance",
    description: "How each promo code performed: times used, total discount given, and average order value, plus the baseline average order value for non-promo orders.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "get_employee_performance",
    description: "Orders handled and revenue generated per staff member (staff data, not customer data).",
    parameters: {
      type: "object",
      properties: { limit: { type: "number", description: `Max rows, capped at ${MAX_CHART_ITEMS}. Defaults to 10.` } },
    },
  },
  {
    name: "get_seasonality",
    description: "Revenue and order counts by Apo Island's tourism seasons (Dry Peak, Shoulder, Typhoon).",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "get_inventory_alerts",
    description: "Products currently below their reorder point, with available stock, reorder point, and estimated days of stock left.",
    parameters: {
      type: "object",
      properties: { limit: { type: "number", description: `Max rows, capped at ${MAX_CHART_ITEMS}. Defaults to 10.` } },
    },
  },
  {
    name: "render_bar_chart",
    description: `Render a horizontal bar chart. Provide parallel labels/values arrays (max ${MAX_CHART_ITEMS} items each) and optional per-bar colors.`,
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        labels: stringArraySchema,
        values: numberArraySchema,
        colors: { ...stringArraySchema, description: "Optional CSS colors, one per bar." },
      },
      required: ["title", "labels", "values"],
    },
  },
  {
    name: "render_pie_chart",
    description: `Render a pie chart. Provide parallel labels/values arrays (max ${MAX_CHART_ITEMS} items each); slice geometry is computed by the chart library, not the model.`,
    parameters: {
      type: "object",
      properties: { title: { type: "string" }, labels: stringArraySchema, values: numberArraySchema },
      required: ["title", "labels", "values"],
    },
  },
  {
    name: "render_line_chart",
    description: `Render a line chart for a trend over time. Provide xLabels (e.g. months) and one or more named series of parallel values (max ${MAX_CHART_ITEMS} points each).`,
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        xLabels: stringArraySchema,
        series: {
          type: "array",
          items: {
            type: "object",
            properties: { name: { type: "string" }, values: numberArraySchema },
            required: ["name", "values"],
          },
        },
      },
      required: ["title", "xLabels", "series"],
    },
  },
  {
    name: "render_number_card",
    description: "Render a single headline number (e.g. this month's revenue).",
    parameters: {
      type: "object",
      properties: {
        label: { type: "string" },
        value: { type: "number" },
        format: { type: "string", enum: ["currency", "number", "percent"] },
      },
      required: ["label", "value"],
    },
  },
];

export function executeAssistantTool(
  name: string,
  args: Record<string, unknown>,
  data: AssistantData
): { result?: unknown; chart?: ChartDirective } {
  switch (name) {
    case "get_revenue_summary": {
      const months = Math.max(1, Math.min(36, typeof args.months === "number" ? args.months : 12));
      const all = computeMonthlyFinancials(data.orders, data.lines);
      return { result: all.slice(-months) };
    }
    case "get_top_products": {
      const metric = (args.metric as string) ?? "revenue";
      const limit = capLimit(args.limit);
      const rows = computeProductPerformance(data.lines, data.products);
      const sorted = [...rows].sort((a, b) => {
        if (metric === "units") return b.unitsSold - a.unitsSold;
        if (metric === "margin") return b.margin - a.margin;
        return b.revenue - a.revenue;
      });
      return { result: sorted.slice(0, limit) };
    }
    case "get_rentals_vs_sales_summary": {
      const limit = capLimit(args.limit);
      const { monthly, byProduct, totalSales, totalRentals } = computeRentalsVsSales(
        data.orders,
        data.lines,
        data.rentals,
        data.products
      );
      return { result: { monthly, totalSales, totalRentals, byProduct: byProduct.slice(0, limit) } };
    }
    case "get_top_customers_by_spend": {
      const limit = capLimit(args.limit);
      return { result: computeTopCustomersBySpend(data.orders, limit) };
    }
    case "get_customer_segments": {
      const { bySegment, repeatCustomers, oneTimeCustomers, repeatRevenue, oneTimeRevenue } = computeCustomerInsights(
        data.orders,
        data.customers
      );
      return { result: { bySegment, repeatCustomers, oneTimeCustomers, repeatRevenue, oneTimeRevenue } };
    }
    case "get_revenue_by_customer_type": {
      const months = Math.max(1, Math.min(36, typeof args.months === "number" ? args.months : 12));
      return { result: computeMonthlyRevenueByCustomerType(data.orders, data.customers, months) };
    }
    case "get_customer_geography": {
      const limit = capLimit(args.limit);
      const { byCountry } = computeCustomerInsights(data.orders, data.customers);
      return { result: byCountry.slice(0, limit) };
    }
    case "get_product_affinity": {
      const limit = capLimit(args.limit);
      return { result: computeProductAffinity(data.lines, data.products, limit) };
    }
    case "get_revenue_by_channel": {
      const months = Math.max(1, Math.min(36, typeof args.months === "number" ? args.months : 12));
      return { result: computeMonthlyRevenueByChannel(data.orders, months) };
    }
    case "get_payment_method_breakdown": {
      return { result: computePaymentMethodBreakdown(data.orders) };
    }
    case "get_promotion_performance": {
      return { result: computePromotionPerformance(data.orders, data.orderPromotions, data.promotions, data.lines) };
    }
    case "get_employee_performance": {
      const limit = capLimit(args.limit);
      return { result: computeEmployeePerformance(data.orders, data.employees).slice(0, limit) };
    }
    case "get_seasonality": {
      return { result: computeSeasonality(data.orders) };
    }
    case "get_inventory_alerts": {
      const limit = capLimit(args.limit);
      const rows = computeReorderAnalysis(data.orders, data.lines, data.products).filter((r) => r.needsReorder);
      return { result: rows.slice(0, limit) };
    }
    case "render_bar_chart": {
      const labels = ((args.labels as string[]) ?? []).slice(0, MAX_CHART_ITEMS);
      const values = ((args.values as number[]) ?? []).slice(0, MAX_CHART_ITEMS);
      const colors = args.colors ? (args.colors as string[]).slice(0, MAX_CHART_ITEMS) : undefined;
      const chart: ChartDirective = { type: "bar", title: String(args.title ?? ""), labels, values, colors };
      return { result: "Chart rendered.", chart };
    }
    case "render_pie_chart": {
      const labels = ((args.labels as string[]) ?? []).slice(0, MAX_CHART_ITEMS);
      const values = ((args.values as number[]) ?? []).slice(0, MAX_CHART_ITEMS);
      const chart: ChartDirective = { type: "pie", title: String(args.title ?? ""), labels, values };
      return { result: "Chart rendered.", chart };
    }
    case "render_line_chart": {
      const xLabels = ((args.xLabels as string[]) ?? []).slice(0, MAX_CHART_ITEMS);
      const series = ((args.series as { name: string; values: number[] }[]) ?? []).map((s) => ({
        name: s.name,
        values: (s.values ?? []).slice(0, MAX_CHART_ITEMS),
      }));
      const chart: ChartDirective = { type: "line", title: String(args.title ?? ""), xLabels, series };
      return { result: "Chart rendered.", chart };
    }
    case "render_number_card": {
      const chart: ChartDirective = {
        type: "number_card",
        label: String(args.label ?? ""),
        value: Number(args.value ?? 0),
        format: (args.format as "currency" | "number" | "percent" | undefined) ?? "number",
      };
      return { result: "Card rendered.", chart };
    }
    default:
      return { result: { error: `Unknown tool: ${name}` } };
  }
}
