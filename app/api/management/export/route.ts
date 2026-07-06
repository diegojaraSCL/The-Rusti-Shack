import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isValidSession, MANAGEMENT_COOKIE_NAME } from "@/lib/management-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

function csvField(value: unknown): string {
  let s = String(value ?? "");
  // Neutralize CSV formula injection: a customer-supplied name like
  // "=HYPERLINK(...)" would otherwise execute as a formula when this file
  // is opened in Excel/Sheets. Prefixing with a quote forces literal text.
  if (/^[=+\-@]/.test(s)) s = `'${s}`;
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// Supabase/PostgREST caps a single request at 1000 rows by default. With
// 15,000+ orders and 25,000+ order lines now loaded, a plain .select()
// would silently truncate the export. Page through in batches instead.
async function fetchAll<T>(table: string, select: string): Promise<T[]> {
  const pageSize = 1000;
  let from = 0;
  const all: T[] = [];
  for (;;) {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select(select)
      .range(from, from + pageSize - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    all.push(...((data ?? []) as T[]));
    if (!data || data.length < pageSize) break;
    from += pageSize;
  }
  return all;
}

type OrderRow = {
  OrderID: string;
  OrderDate: string;
  CustID: string;
  ShippingFee: number;
  OrderTotal: number;
  PaymentMethod: string;
};
type LineRow = { OrderID: string; ProductCode: string; Quantity: number; UnitPrice: number; LineRevenue: number };
type CustomerRow = { CustomerID: string; FirstName: string; LastName: string; Country: string | null };
type ProductRow = { SKU: string; ProductName: string };

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get(MANAGEMENT_COOKIE_NAME)?.value;
  if (!isValidSession(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [orders, lines, customers, products] = await Promise.all([
    fetchAll<OrderRow>("Orders", '"OrderID","OrderDate","CustID","ShippingFee","OrderTotal","PaymentMethod"'),
    fetchAll<LineRow>("OrderLines", '"OrderID","ProductCode","Quantity","UnitPrice","LineRevenue"'),
    fetchAll<CustomerRow>("Customers_Core", '"CustomerID","FirstName","LastName","Country"'),
    fetchAll<ProductRow>("products", '"SKU","ProductName"'),
  ]);

  const orderById = new Map(orders.map((o) => [o.OrderID, o]));
  const customerById = new Map(customers.map((c) => [c.CustomerID, c]));
  const productBySku = new Map(products.map((p) => [p.SKU, p.ProductName]));

  const header = [
    "OrderID",
    "OrderDate",
    "FirstName",
    "LastName",
    "Country",
    "ProductCode",
    "ProductName",
    "Quantity",
    "UnitPrice",
    "LineRevenue",
    "ShippingFee",
    "OrderTotal",
    "PaymentMethod",
  ];

  const rows = lines.map((line) => {
    const order = orderById.get(line.OrderID);
    const customer = order ? customerById.get(order.CustID) : undefined;
    return [
      line.OrderID,
      order?.OrderDate ?? "",
      customer?.FirstName ?? "",
      customer?.LastName ?? "",
      customer?.Country ?? "",
      line.ProductCode,
      productBySku.get(line.ProductCode) ?? line.ProductCode,
      line.Quantity,
      line.UnitPrice,
      line.LineRevenue,
      order?.ShippingFee ?? "",
      order?.OrderTotal ?? "",
      order?.PaymentMethod ?? "",
    ]
      .map(csvField)
      .join(",");
  });

  const csv = [header.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rusti-shack-sales.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
