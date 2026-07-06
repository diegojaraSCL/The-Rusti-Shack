import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const content = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
  const env = {};
  for (const line of content.split("\n")) {
    if (!line.includes("=") || line.trim().startsWith("#")) continue;
    const i = line.indexOf("=");
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return env;
}

const env = loadEnv();
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY);

function excelDate(serial) {
  if (serial === "" || serial == null) return null;
  if (typeof serial === "string") return serial;
  return new Date(Math.round((serial - 25569) * 86400 * 1000)).toISOString().slice(0, 10);
}
function nullIfEmpty(v) {
  return v === "" || v == null ? null : v;
}

async function insertAll(table, rows, batchSize = 1000) {
  let done = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).insert(batch);
    if (error) throw new Error(`${table} @ row ${i}: ${error.message}`);
    done += batch.length;
    process.stdout.write(`\r  ${table}: ${done}/${rows.length}`);
  }
  console.log();
}

async function main() {
  const wb1 = XLSX.read(fs.readFileSync(path.join(process.cwd(), "data", "The_Rusti_Shack_Dataset.xlsx")), { type: "buffer" });
  const wb2 = XLSX.read(fs.readFileSync(path.join(process.cwd(), "data", "The_Rusti_Shack_Apr2026_Update.xlsx")), { type: "buffer" });
  const sheet = (wb, name) => XLSX.utils.sheet_to_json(wb.Sheets[name], { defval: "" });

  const promotions = sheet(wb1, "Promotions");
  const dateDim = sheet(wb1, "DateDimension");
  const orderPromos = [...sheet(wb1, "OrderPromotions"), ...sheet(wb2, "OrderPromotions_Apr2026")];
  const rentals = [...sheet(wb1, "RentalTransactions"), ...sheet(wb2, "RentalTransactions_Apr2026")];

  await insertAll(
    "Promotions",
    promotions.map((r) => ({
      PromoCode: r.PromoCode,
      PromoName: r.PromoName,
      PromoType: r.PromoType,
      DiscountPct: Number(r.DiscountPct),
      StartDate: excelDate(r.StartDate),
      EndDate: excelDate(r.EndDate),
      Channel: r.Channel,
    }))
  );

  await insertAll(
    "OrderPromotions",
    orderPromos.map((r) => ({ OrderID: r.OrderID, PromoCode: r.PromoCode }))
  );

  await insertAll(
    "RentalTransactions",
    rentals.map((r) => ({
      RentalID: r.RentalID,
      RentalDate: excelDate(r.RentalDate),
      CustID: r.CustID,
      LocationID: nullIfEmpty(r.LocationID),
      SalesAssociate: nullIfEmpty(r.SalesAssociate),
      SKU: r.SKU,
      Quantity: Number(r.Quantity),
      DailyRate: Number(r.DailyRate),
      RentalRevenue: Number(r.RentalRevenue),
      Returned: r.Returned,
    }))
  );

  await insertAll(
    "DateDimension",
    dateDim.map((r) => ({
      Date: excelDate(r.Date),
      Year: Number(r.Year),
      Quarter: r.Quarter,
      Month: Number(r.Month),
      MonthName: r.MonthName,
      Day: Number(r.Day),
      DayOfWeek: r.DayOfWeek,
      WeekNum: Number(r.WeekNum),
      IsWeekend: r.IsWeekend,
      Season: r.Season,
      FiscalYear: r.FiscalYear,
    }))
  );

  console.log("\nDone. Remaining historical data loaded.");
}

main().catch((err) => {
  console.error("\nFAILED:", err.message);
  process.exit(1);
});
