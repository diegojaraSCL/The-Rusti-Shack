import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isValidSession, MANAGER_COOKIE_NAME } from "@/lib/manager-auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

function csvField(value: unknown): string {
  const s = String(value ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get(MANAGER_COOKIE_NAME)?.value;
  if (!isValidSession(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: orders } = await supabaseAdmin
    .from("Orders")
    .select('"OrderID","OrderDate","CustID","ShippingFee","OrderTotal","PaymentMethod"');
  const { data: lines } = await supabaseAdmin
    .from("OrderLines")
    .select('"OrderID","ProductCode","Quantity","UnitPrice","LineRevenue"')
    .order('"OrderID"')
    .order('"LineNumber"');
  const { data: customers } = await supabaseAdmin.from("Customers_Core").select('"CustomerID","FirstName","LastName","Country"');
  const { data: products } = await supabaseAdmin.from("products").select('"SKU","ProductName"');

  const orderById = new Map((orders ?? []).map((o) => [o.OrderID, o]));
  const customerById = new Map((customers ?? []).map((c) => [c.CustomerID, c]));
  const productBySku = new Map((products ?? []).map((p) => [p.SKU, p.ProductName]));

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

  const rows = (lines ?? []).map((line) => {
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
