import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { isValidSession, MANAGEMENT_COOKIE_NAME } from "@/lib/management-auth";
import { fetchOrders, fetchOrderLines } from "@/lib/management-data";
import { computeMonthlyFinancials } from "@/lib/management-aggregates";
import { toCsv } from "@/lib/csv";

export async function GET() {
  const cookieStore = await cookies();
  const session = cookieStore.get(MANAGEMENT_COOKIE_NAME)?.value;
  if (!isValidSession(session)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [orders, lines] = await Promise.all([fetchOrders(), fetchOrderLines()]);
  const monthly = computeMonthlyFinancials(orders, lines);

  const header = ["Month", "Revenue", "Cost", "Margin", "MarginPct"];
  const csv = toCsv(
    header,
    monthly.map((m) => [m.label, m.revenue.toFixed(2), m.cost.toFixed(2), m.margin.toFixed(2), m.marginPct.toFixed(1)])
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rusti-shack-monthly-financials.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
