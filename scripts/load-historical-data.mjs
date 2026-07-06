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
if (!env.SUPABASE_SECRET_KEY) throw new Error("Missing SUPABASE_SECRET_KEY in .env.local");
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY);

function excelDate(serial) {
  if (serial === "" || serial == null) return null;
  if (typeof serial === "string") return serial;
  return new Date(Math.round((serial - 25569) * 86400 * 1000)).toISOString().slice(0, 10);
}
function nullIfEmpty(v) {
  return v === "" || v == null ? null : v;
}

async function insertAll(table, rows, batchSize = 500) {
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

  console.log("Reading workbooks...");
  const stores = sheet(wb1, "Stores");
  const employees = sheet(wb1, "Employees");
  const customersCore = sheet(wb1, "Customers_Core");
  const customersContact = sheet(wb1, "Customers_Contact");
  const customersDemo = sheet(wb1, "Customers_Demographics");
  const inventory = sheet(wb1, "Inventory");
  const promotions = sheet(wb1, "Promotions");
  const dateDim = sheet(wb1, "DateDimension");
  const orders = [...sheet(wb1, "Orders"), ...sheet(wb2, "Orders_Apr2026")];
  const orderLines = [...sheet(wb1, "OrderLines"), ...sheet(wb2, "OrderLines_Apr2026")];
  const orderPromos = [...sheet(wb1, "OrderPromotions"), ...sheet(wb2, "OrderPromotions_Apr2026")];
  const rentals = [...sheet(wb1, "RentalTransactions"), ...sheet(wb2, "RentalTransactions_Apr2026")];

  // 1. Stores
  await insertAll(
    "Stores",
    stores.map((r) => ({
      LocationCode: r.LocationCode,
      LocationName: r.LocationName,
      StoreType: r.StoreType,
      Country: nullIfEmpty(r.Country),
    }))
  );

  // 2. Employees
  await insertAll(
    "Employees",
    employees.map((r) => ({
      EmpID: r.EmpID,
      FirstName: r.FirstName,
      LastName: r.LastName,
      Role: r.Role,
      HireDate: excelDate(r.HireDate),
      HomeStore: nullIfEmpty(r.HomeStore),
    }))
  );

  // 3. Customers_Core (historical — reserved C9xxxx web range untouched)
  await insertAll(
    "Customers_Core",
    customersCore.map((r) => ({
      CustomerID: r.CustomerID,
      FirstName: r.FirstName,
      LastName: r.LastName,
      CustomerType: r.CustomerType,
      JoinDate: excelDate(r.JoinDate),
      City: nullIfEmpty(r.City),
      Country: nullIfEmpty(r.Country),
    }))
  );

  // 4. Customers_Contact
  await insertAll(
    "Customers_Contact",
    customersContact.map((r) => ({
      CustomerID: r.CustomerID,
      Email: nullIfEmpty(r.Email),
      Phone: nullIfEmpty(r.Phone),
      LoyaltyMember: nullIfEmpty(r.LoyaltyMember),
    }))
  );

  // 5. Customers_Demographics
  await insertAll(
    "Customers_Demographics",
    customersDemo.map((r) => ({
      CustomerID: r.CustomerID,
      Gender: nullIfEmpty(r.Gender),
      Occupation: nullIfEmpty(r.Occupation),
    }))
  );

  // 6. products — update the new inventory columns per SKU (products rows already exist)
  console.log("Updating products with inventory detail...");
  let invDone = 0;
  for (const r of inventory) {
    const { error } = await supabase
      .from("products")
      .update({
        ReorderPoint: r.ReorderPoint === "" ? null : Number(r.ReorderPoint),
        RentalUnits: r.RentalUnits === "" ? null : Number(r.RentalUnits),
        AvailableForSale: r.AvailableForSale === "" ? null : Number(r.AvailableForSale),
        WarehouseLocation: nullIfEmpty(r.WarehouseLocation),
        LastCountDate: excelDate(r.LastCountDate),
      })
      .eq("SKU", r.SKU);
    if (error) throw new Error(`products update ${r.SKU}: ${error.message}`);
    invDone++;
    process.stdout.write(`\r  products (inventory detail): ${invDone}/${inventory.length}`);
  }
  console.log();

  // 7. Orders (historical — reserved ORD9xxxxx web range untouched)
  await insertAll(
    "Orders",
    orders.map((r) => ({
      OrderID: r.OrderID,
      OrderDate: excelDate(r.OrderDate),
      CustID: r.CustID,
      LocationID: r.LocationID,
      SalesAssociate: nullIfEmpty(r.SalesAssociate),
      Channel: r.Channel,
      ShippingFee: Number(r.ShippingFee) || 0,
      OrderTotal: Number(r.OrderTotal),
      PaymentMethod: r.PaymentMethod,
    })),
    1000
  );

  // 8. OrderLines
  await insertAll(
    "OrderLines",
    orderLines.map((r) => ({
      OrderID: r.OrderID,
      LineNumber: Number(r.LineNumber),
      ProductCode: r.ProductCode,
      Quantity: Number(r.Quantity),
      UnitPrice: Number(r.UnitPrice),
      DiscountPct: Number(r.DiscountPct) || 0,
      LineRevenue: Number(r.LineRevenue),
      LineCost: Number(r.LineCost),
      EffectiveDiscountAmount: Number(r.EffectiveDiscountAmount) || 0,
    })),
    1000
  );

  // 9. Promotions
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

  // 10. OrderPromotions
  await insertAll(
    "OrderPromotions",
    orderPromos.map((r) => ({ OrderID: r.OrderID, PromoCode: r.PromoCode })),
    1000
  );

  // 11. RentalTransactions
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
    })),
    1000
  );

  // 12. DateDimension
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
    })),
    1000
  );

  console.log("\nDone. Historical data loaded.");
}

main().catch((err) => {
  console.error("\nFAILED:", err.message);
  process.exit(1);
});
