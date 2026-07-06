import "server-only";
import type { OrderRow, OrderLineRow, ProductRow } from "./management-data";

// Assumptions the data doesn't give us directly -- both explained in the
// info button so Rusti knows exactly what she's looking at.
export const LEAD_TIME_DAYS = 14; // mainland suppliers, boat delivery to the island
export const SERVICE_Z = 1.65; // ~95% service level (standard retail default)
const DEMAND_WINDOW_DAYS = 365;

export type InventoryRow = {
  familySku: string;
  productName: string;
  category: string;
  availableStock: number;
  meanDailyDemand: number;
  stdDailyDemand: number;
  reorderPoint: number;
  daysOfStockLeft: number | null;
  needsReorder: boolean;
};

export function computeReorderAnalysis(
  orders: OrderRow[],
  lines: OrderLineRow[],
  products: ProductRow[]
): InventoryRow[] {
  // Map every SKU (parent, standalone, or variant) to its product family --
  // OrderLines.ProductCode can be either, depending on order date.
  const skuToFamily = new Map<string, string>();
  for (const p of products) skuToFamily.set(p.SKU, p.ParentSKU || p.SKU);

  const families = new Map<
    string,
    { productName: string; category: string; availableStock: number }
  >();
  for (const p of products) {
    const familySku = p.ParentSKU || p.SKU;
    if (p.VariantType === "Variant") continue; // family identity comes from the parent/standalone row
    families.set(familySku, {
      productName: p.ProductName,
      category: p.Category,
      availableStock: 0,
    });
  }
  // Sum stock across every row (parent + its variants) under each family.
  for (const p of products) {
    const familySku = p.ParentSKU || p.SKU;
    const fam = families.get(familySku);
    if (!fam) continue;
    const stock = p.AvailableForSale ?? p.OnHandQty ?? 0;
    fam.availableStock += stock;
  }

  // Only real historical orders define the demand baseline -- excludes the
  // reserved web-order ID range (ORD9xxxxx) so a couple of test purchases
  // don't skew a 365-day daily-demand statistic.
  const historicalOrders = orders.filter((o) => !o.OrderID.startsWith("ORD9"));
  const orderDateById = new Map(historicalOrders.map((o) => [o.OrderID, o.OrderDate]));
  const cutoffDate = historicalOrders.reduce((max, o) => (o.OrderDate > max ? o.OrderDate : max), "");
  const windowStart = new Date(cutoffDate);
  windowStart.setDate(windowStart.getDate() - DEMAND_WINDOW_DAYS);
  const windowStartStr = windowStart.toISOString().slice(0, 10);

  // Daily quantity per family, zero-filled for days with no sales -- needed
  // for a correct standard deviation, not just an average of the sale days.
  const dayCount = DEMAND_WINDOW_DAYS;
  const dailyByFamily = new Map<string, number[]>();
  const dayIndex = (dateStr: string) => {
    const d = Math.floor((new Date(dateStr).getTime() - windowStart.getTime()) / 86400000);
    return d;
  };

  for (const line of lines) {
    const date = orderDateById.get(line.OrderID);
    if (!date || date < windowStartStr || date > cutoffDate) continue;
    const familySku = skuToFamily.get(line.ProductCode);
    if (!familySku || !families.has(familySku)) continue;
    const idx = dayIndex(date);
    if (idx < 0 || idx >= dayCount) continue;
    if (!dailyByFamily.has(familySku)) dailyByFamily.set(familySku, new Array(dayCount).fill(0));
    dailyByFamily.get(familySku)![idx] += Number(line.Quantity);
  }

  const rows: InventoryRow[] = [];
  for (const [familySku, fam] of families) {
    const daily = dailyByFamily.get(familySku) ?? new Array(dayCount).fill(0);
    const mean = daily.reduce((s, x) => s + x, 0) / dayCount;
    const variance = daily.reduce((s, x) => s + (x - mean) ** 2, 0) / dayCount;
    const std = Math.sqrt(variance);

    const reorderPoint = mean * LEAD_TIME_DAYS + SERVICE_Z * std * Math.sqrt(LEAD_TIME_DAYS);
    const daysOfStockLeft = mean > 0 ? fam.availableStock / mean : null;

    rows.push({
      familySku,
      productName: fam.productName,
      category: fam.category,
      availableStock: fam.availableStock,
      meanDailyDemand: mean,
      stdDailyDemand: std,
      reorderPoint,
      daysOfStockLeft,
      needsReorder: fam.availableStock < reorderPoint,
    });
  }

  return rows.sort((a, b) => {
    if (a.needsReorder !== b.needsReorder) return a.needsReorder ? -1 : 1;
    const aDays = a.daysOfStockLeft ?? Infinity;
    const bDays = b.daysOfStockLeft ?? Infinity;
    return aDays - bDays;
  });
}
