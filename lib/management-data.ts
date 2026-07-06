import "server-only";
import { supabaseAdmin } from "./supabase-admin";

// Supabase/PostgREST caps a single request at 1000 rows by default. With
// 15,000+ orders, 25,000+ order lines, and 17,000+ rentals now loaded,
// plain .select() calls would silently truncate. Page through everything.
async function fetchAll<T>(table: string, select: string): Promise<T[]> {
  const pageSize = 1000;
  let from = 0;
  const all: T[] = [];
  for (;;) {
    const { data, error } = await supabaseAdmin.from(table).select(select).range(from, from + pageSize - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    all.push(...((data ?? []) as T[]));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

export type OrderRow = {
  OrderID: string;
  OrderDate: string;
  CustID: string;
  LocationID: string;
  SalesAssociate: string | null;
  Channel: string;
  ShippingFee: number;
  OrderTotal: number;
  PaymentMethod: string;
};

export type OrderLineRow = {
  OrderID: string;
  LineNumber: number;
  ProductCode: string;
  Quantity: number;
  UnitPrice: number;
  DiscountPct: number;
  LineRevenue: number;
  LineCost: number;
  EffectiveDiscountAmount: number;
};

export type RentalRow = {
  RentalID: string;
  RentalDate: string;
  CustID: string;
  LocationID: string | null;
  SalesAssociate: string | null;
  SKU: string;
  Quantity: number;
  DailyRate: number;
  RentalRevenue: number;
  Returned: string;
};

export type CustomerCoreRow = {
  CustomerID: string;
  FirstName: string;
  LastName: string;
  CustomerType: string;
  JoinDate: string;
  City: string | null;
  Country: string | null;
};

export type ProductRow = {
  SKU: string;
  ProductName: string;
  Category: string;
  Subcategory: string | null;
  UnitCost: number;
  UnitPrice: number;
  Availability: string;
  ParentSKU: string | null;
  VariantType: string;
  OnHandQty: number | null;
  ReorderPoint: number | null;
  RentalUnits: number | null;
  AvailableForSale: number | null;
};

export type PromotionRow = {
  PromoCode: string;
  PromoName: string;
  PromoType: string;
  DiscountPct: number;
  StartDate: string;
  EndDate: string;
  Channel: string;
};

export type OrderPromotionRow = { OrderID: string; PromoCode: string };

export type EmployeeRow = {
  EmpID: string;
  FirstName: string;
  LastName: string;
  Role: string;
  HireDate: string;
  HomeStore: string | null;
};

export const fetchOrders = () =>
  fetchAll<OrderRow>(
    "Orders",
    '"OrderID","OrderDate","CustID","LocationID","SalesAssociate","Channel","ShippingFee","OrderTotal","PaymentMethod"'
  );

export const fetchOrderLines = () =>
  fetchAll<OrderLineRow>(
    "OrderLines",
    '"OrderID","LineNumber","ProductCode","Quantity","UnitPrice","DiscountPct","LineRevenue","LineCost","EffectiveDiscountAmount"'
  );

export const fetchRentals = () =>
  fetchAll<RentalRow>(
    "RentalTransactions",
    '"RentalID","RentalDate","CustID","LocationID","SalesAssociate","SKU","Quantity","DailyRate","RentalRevenue","Returned"'
  );

export const fetchCustomers = () =>
  fetchAll<CustomerCoreRow>(
    "Customers_Core",
    '"CustomerID","FirstName","LastName","CustomerType","JoinDate","City","Country"'
  );

export const fetchProducts = () =>
  fetchAll<ProductRow>(
    "products",
    '"SKU","ProductName","Category","Subcategory","UnitCost","UnitPrice","Availability","ParentSKU","VariantType","OnHandQty","ReorderPoint","RentalUnits","AvailableForSale"'
  );

export const fetchPromotions = () =>
  fetchAll<PromotionRow>("Promotions", '"PromoCode","PromoName","PromoType","DiscountPct","StartDate","EndDate","Channel"');

export const fetchOrderPromotions = () => fetchAll<OrderPromotionRow>("OrderPromotions", '"OrderID","PromoCode"');

export const fetchEmployees = () =>
  fetchAll<EmployeeRow>("Employees", '"EmpID","FirstName","LastName","Role","HireDate","HomeStore"');
