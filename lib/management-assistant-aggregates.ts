import "server-only";
import type { OrderRow, OrderLineRow, ProductRow } from "./management-data";

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
