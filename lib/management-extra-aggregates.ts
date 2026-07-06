import "server-only";
import type {
  OrderRow,
  OrderLineRow,
  RentalRow,
  CustomerCoreRow,
  ProductRow,
  PromotionRow,
  OrderPromotionRow,
  EmployeeRow,
} from "./management-data";

// ── Product performance: which products truly earn their keep ──────────
export type ProductPerformance = {
  familySku: string;
  productName: string;
  category: string;
  unitsSold: number;
  revenue: number;
  cost: number;
  margin: number;
  marginPct: number;
};

export function computeProductPerformance(lines: OrderLineRow[], products: ProductRow[]): ProductPerformance[] {
  const skuToFamily = new Map(products.map((p) => [p.SKU, p.ParentSKU || p.SKU]));
  const familyMeta = new Map(
    products.filter((p) => p.VariantType !== "Variant").map((p) => [p.ParentSKU || p.SKU, p])
  );

  const byFamily = new Map<string, { units: number; revenue: number; cost: number }>();
  for (const line of lines) {
    const familySku = skuToFamily.get(line.ProductCode);
    if (!familySku) continue;
    const entry = byFamily.get(familySku) ?? { units: 0, revenue: 0, cost: 0 };
    entry.units += Number(line.Quantity);
    entry.revenue += Number(line.LineRevenue);
    entry.cost += Number(line.LineCost);
    byFamily.set(familySku, entry);
  }

  const rows: ProductPerformance[] = [];
  for (const [familySku, agg] of byFamily) {
    const meta = familyMeta.get(familySku);
    const margin = agg.revenue - agg.cost;
    rows.push({
      familySku,
      productName: meta?.ProductName ?? familySku,
      category: meta?.Category ?? "",
      unitsSold: agg.units,
      revenue: Math.round(agg.revenue * 100) / 100,
      cost: Math.round(agg.cost * 100) / 100,
      margin: Math.round(margin * 100) / 100,
      marginPct: agg.revenue > 0 ? (margin / agg.revenue) * 100 : 0,
    });
  }
  return rows.sort((a, b) => b.margin - a.margin);
}

// ── Rentals vs. sales: helping, or eating into, sales? ──────────────────
export type RentalsVsSales = {
  monthly: { label: string; salesRevenue: number; rentalRevenue: number }[];
  byProduct: { familySku: string; productName: string; salesRevenue: number; rentalRevenue: number }[];
  totalSales: number;
  totalRentals: number;
};

export function computeRentalsVsSales(
  orders: OrderRow[],
  lines: OrderLineRow[],
  rentals: RentalRow[],
  products: ProductRow[]
): RentalsVsSales {
  const skuToFamily = new Map(products.map((p) => [p.SKU, p.ParentSKU || p.SKU]));
  const familyName = new Map(
    products.filter((p) => p.VariantType !== "Variant").map((p) => [p.ParentSKU || p.SKU, p.ProductName])
  );
  const orderDateById = new Map(orders.map((o) => [o.OrderID, o.OrderDate]));

  const monthlyMap = new Map<string, { salesRevenue: number; rentalRevenue: number }>();
  const productMap = new Map<string, { salesRevenue: number; rentalRevenue: number }>();

  for (const line of lines) {
    const date = orderDateById.get(line.OrderID);
    if (!date) continue;
    const monthKey = date.slice(0, 7);
    const m = monthlyMap.get(monthKey) ?? { salesRevenue: 0, rentalRevenue: 0 };
    m.salesRevenue += Number(line.LineRevenue);
    monthlyMap.set(monthKey, m);

    const familySku = skuToFamily.get(line.ProductCode) ?? line.ProductCode;
    const p = productMap.get(familySku) ?? { salesRevenue: 0, rentalRevenue: 0 };
    p.salesRevenue += Number(line.LineRevenue);
    productMap.set(familySku, p);
  }

  for (const rental of rentals) {
    const monthKey = rental.RentalDate.slice(0, 7);
    const m = monthlyMap.get(monthKey) ?? { salesRevenue: 0, rentalRevenue: 0 };
    m.rentalRevenue += Number(rental.RentalRevenue);
    monthlyMap.set(monthKey, m);

    const familySku = skuToFamily.get(rental.SKU) ?? rental.SKU;
    const p = productMap.get(familySku) ?? { salesRevenue: 0, rentalRevenue: 0 };
    p.rentalRevenue += Number(rental.RentalRevenue);
    productMap.set(familySku, p);
  }

  const monthly = [...monthlyMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, v]) => ({ label, salesRevenue: Math.round(v.salesRevenue), rentalRevenue: Math.round(v.rentalRevenue) }));

  const byProduct = [...productMap.entries()]
    .filter(([, v]) => v.rentalRevenue > 0)
    .map(([familySku, v]) => ({
      familySku,
      productName: familyName.get(familySku) ?? familySku,
      salesRevenue: Math.round(v.salesRevenue),
      rentalRevenue: Math.round(v.rentalRevenue),
    }))
    .sort((a, b) => b.rentalRevenue - a.rentalRevenue);

  return {
    monthly,
    byProduct,
    totalSales: monthly.reduce((s, m) => s + m.salesRevenue, 0),
    totalRentals: monthly.reduce((s, m) => s + m.rentalRevenue, 0),
  };
}

// ── Customers: who they are, and who comes back ─────────────────────────
export type CustomerInsights = {
  bySegment: { type: string; customers: number; revenue: number }[];
  byCountry: { country: string; revenue: number; customers: number }[];
  repeatCustomers: number;
  oneTimeCustomers: number;
  repeatRevenue: number;
  oneTimeRevenue: number;
};

export function computeCustomerInsights(orders: OrderRow[], customers: CustomerCoreRow[]): CustomerInsights {
  const customerById = new Map(customers.map((c) => [c.CustomerID, c]));
  const ordersByCustomer = new Map<string, OrderRow[]>();
  for (const o of orders) {
    if (!ordersByCustomer.has(o.CustID)) ordersByCustomer.set(o.CustID, []);
    ordersByCustomer.get(o.CustID)!.push(o);
  }

  const segmentMap = new Map<string, { customers: Set<string>; revenue: number }>();
  const countryMap = new Map<string, { customers: Set<string>; revenue: number }>();
  let repeatCustomers = 0;
  let oneTimeCustomers = 0;
  let repeatRevenue = 0;
  let oneTimeRevenue = 0;

  for (const [custId, custOrders] of ordersByCustomer) {
    const cust = customerById.get(custId);
    const revenue = custOrders.reduce((s, o) => s + Number(o.OrderTotal), 0);
    const type = cust?.CustomerType ?? "Unknown";
    const country = cust?.Country ?? "Unknown";

    const seg = segmentMap.get(type) ?? { customers: new Set(), revenue: 0 };
    seg.customers.add(custId);
    seg.revenue += revenue;
    segmentMap.set(type, seg);

    const c = countryMap.get(country) ?? { customers: new Set(), revenue: 0 };
    c.customers.add(custId);
    c.revenue += revenue;
    countryMap.set(country, c);

    if (custOrders.length > 1) {
      repeatCustomers++;
      repeatRevenue += revenue;
    } else {
      oneTimeCustomers++;
      oneTimeRevenue += revenue;
    }
  }

  return {
    bySegment: [...segmentMap.entries()]
      .map(([type, v]) => ({ type, customers: v.customers.size, revenue: Math.round(v.revenue) }))
      .sort((a, b) => b.revenue - a.revenue),
    byCountry: [...countryMap.entries()]
      .map(([country, v]) => ({ country, customers: v.customers.size, revenue: Math.round(v.revenue) }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10),
    repeatCustomers,
    oneTimeCustomers,
    repeatRevenue: Math.round(repeatRevenue),
    oneTimeRevenue: Math.round(oneTimeRevenue),
  };
}

// ── Promotions: do discounts pay for themselves? ────────────────────────
export type PromotionPerformance = {
  promoCode: string;
  promoName: string;
  promoType: string;
  timesUsed: number;
  totalDiscountGiven: number;
  avgOrderValue: number;
};

export function computePromotionPerformance(
  orders: OrderRow[],
  orderPromotions: OrderPromotionRow[],
  promotions: PromotionRow[],
  lines: OrderLineRow[]
): { promos: PromotionPerformance[]; baselineAvgOrderValue: number } {
  const promoByCode = new Map(promotions.map((p) => [p.PromoCode, p]));
  const orderById = new Map(orders.map((o) => [o.OrderID, o]));
  const discountByOrder = new Map<string, number>();
  for (const line of lines) {
    discountByOrder.set(line.OrderID, (discountByOrder.get(line.OrderID) ?? 0) + Number(line.EffectiveDiscountAmount));
  }

  const promotedOrderIds = new Set(orderPromotions.map((op) => op.OrderID));
  const byPromo = new Map<string, { orders: string[]; discount: number }>();
  for (const op of orderPromotions) {
    const entry = byPromo.get(op.PromoCode) ?? { orders: [], discount: 0 };
    entry.orders.push(op.OrderID);
    entry.discount += discountByOrder.get(op.OrderID) ?? 0;
    byPromo.set(op.PromoCode, entry);
  }

  const promos: PromotionPerformance[] = [...byPromo.entries()].map(([code, v]) => {
    const meta = promoByCode.get(code);
    const total = v.orders.reduce((s, id) => s + Number(orderById.get(id)?.OrderTotal ?? 0), 0);
    return {
      promoCode: code,
      promoName: meta?.PromoName ?? code,
      promoType: meta?.PromoType ?? "",
      timesUsed: v.orders.length,
      totalDiscountGiven: Math.round(v.discount),
      avgOrderValue: v.orders.length > 0 ? Math.round(total / v.orders.length) : 0,
    };
  });

  const nonPromoOrders = orders.filter((o) => !promotedOrderIds.has(o.OrderID));
  const baselineAvgOrderValue =
    nonPromoOrders.length > 0
      ? Math.round(nonPromoOrders.reduce((s, o) => s + Number(o.OrderTotal), 0) / nonPromoOrders.length)
      : 0;

  return { promos: promos.sort((a, b) => b.timesUsed - a.timesUsed), baselineAvgOrderValue };
}

// ── Team performance ─────────────────────────────────────────────────────
export type EmployeePerformance = {
  empId: string;
  name: string;
  role: string;
  ordersHandled: number;
  revenue: number;
};

export function computeEmployeePerformance(orders: OrderRow[], employees: EmployeeRow[]): EmployeePerformance[] {
  const empById = new Map(employees.map((e) => [e.EmpID, e]));
  const byEmp = new Map<string, { orders: number; revenue: number }>();
  for (const o of orders) {
    if (!o.SalesAssociate || o.SalesAssociate === "WEB") continue;
    const entry = byEmp.get(o.SalesAssociate) ?? { orders: 0, revenue: 0 };
    entry.orders += 1;
    entry.revenue += Number(o.OrderTotal);
    byEmp.set(o.SalesAssociate, entry);
  }
  return [...byEmp.entries()]
    .map(([empId, v]) => {
      const emp = empById.get(empId);
      return {
        empId,
        name: emp ? `${emp.FirstName} ${emp.LastName}` : empId,
        role: emp?.Role ?? "",
        ordersHandled: v.orders,
        revenue: Math.round(v.revenue),
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

// ── Seasonality: how it moves with Apo Island's seasons ─────────────────
export type SeasonPerformance = { season: string; revenue: number; orders: number };

function seasonForMonth(month: number): string {
  if (month === 5) return "Shoulder";
  if (month >= 6 && month <= 11) return "Typhoon";
  return "Dry Peak"; // Dec-Apr
}

export function computeSeasonality(orders: OrderRow[]): SeasonPerformance[] {
  const bySeason = new Map<string, { revenue: number; orders: number }>();
  for (const o of orders) {
    const month = Number(o.OrderDate.slice(5, 7));
    const season = seasonForMonth(month);
    const entry = bySeason.get(season) ?? { revenue: 0, orders: 0 };
    entry.revenue += Number(o.OrderTotal);
    entry.orders += 1;
    bySeason.set(season, entry);
  }
  const order = ["Dry Peak", "Shoulder", "Typhoon"];
  return order
    .filter((s) => bySeason.has(s))
    .map((season) => ({ season, revenue: Math.round(bySeason.get(season)!.revenue), orders: bySeason.get(season)!.orders }));
}
