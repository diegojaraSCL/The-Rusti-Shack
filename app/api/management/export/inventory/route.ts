import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isValidSession, MANAGEMENT_COOKIE_NAME } from "@/lib/management-auth";
import { fetchOrders, fetchOrderLines, fetchProducts } from "@/lib/management-data";
import { computeReorderAnalysis } from "@/lib/management-inventory";
import { toCsv } from "@/lib/csv";

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get(MANAGEMENT_COOKIE_NAME)?.value;
  if (!isValidSession(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [orders, lines, products] = await Promise.all([fetchOrders(), fetchOrderLines(), fetchProducts()]);
  const rows = computeReorderAnalysis(orders, lines, products);

  const header = ["ProductCode", "ProductName", "Category", "InStock", "ReorderPoint", "DaysOfStockLeft", "Status"];
  const csv = toCsv(
    header,
    rows.map((r) => [
      r.familySku,
      r.productName,
      r.category,
      r.availableStock,
      r.reorderPoint.toFixed(1),
      r.daysOfStockLeft == null ? "" : r.daysOfStockLeft.toFixed(0),
      r.needsReorder ? "Reorder now" : "OK",
    ])
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rusti-shack-inventory.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
