import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "The_Rusti_Shack_Dataset.xlsx");
const OUT_DIR = path.join(process.cwd(), "supabase", "migrations");
const OUT_FILE = path.join(OUT_DIR, "0001_init.sql");

function sqlString(value) {
  if (value === "" || value === null || value === undefined) return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlNumber(value) {
  if (value === "" || value === null || value === undefined) return "NULL";
  return String(Number(value));
}

function sqlInt(value) {
  if (value === "" || value === null || value === undefined) return "NULL";
  return String(Math.trunc(Number(value)));
}

const wb = XLSX.read(fs.readFileSync(DATA_FILE), { type: "buffer" });
const rows = XLSX.utils.sheet_to_json(wb.Sheets["Products"], { defval: "" });
const inventory = XLSX.utils.sheet_to_json(wb.Sheets["Inventory"], { defval: "" });
const onHandBySku = new Map(inventory.map((r) => [r.SKU, r.OnHandQty]));

// Parent/standalone rows first so the self-referential ParentSKU foreign key
// is always satisfied within this single INSERT.
const ordered = [...rows].sort((a, b) => {
  const aParent = a.ParentSKU ? 1 : 0;
  const bParent = b.ParentSKU ? 1 : 0;
  return aParent - bParent;
});

const valuesSql = ordered
  .map((r) => {
    return `  (${sqlString(r.SKU)}, ${sqlString(r.ProductName)}, ${sqlString(r.Category)}, ${sqlString(r.Subcategory)}, ${sqlNumber(r.UnitCost)}, ${sqlNumber(r.UnitPrice)}, ${sqlNumber(r.Weight_kg)}, ${sqlString(r.Supplier)}, ${sqlNumber(r.RentalRate)}, ${sqlString(r.Availability)}, ${sqlInt(r.YearIntroduced)}, ${sqlString(r.ParentSKU)}, ${sqlString(r.Size)}, ${sqlString(r.Color)}, ${sqlString(r.Gender)}, ${sqlString(r.VariantType)}, ${sqlInt(onHandBySku.get(r.SKU))})`;
  })
  .join(",\n");

const sql = `-- The Rusti Shack — initial Supabase schema + product catalog seed
-- Generated from data/The_Rusti_Shack_Dataset.xlsx by scripts/generate-supabase-migration.mjs
-- Run this once in the Supabase SQL Editor (Project > SQL Editor > New query > paste > Run).

-- ── Products (all ${ordered.length} catalog rows: parents, standalones, and variants) ──
create table if not exists products (
  "SKU" text primary key,
  "ProductName" text not null,
  "Category" text not null,
  "Subcategory" text,
  "UnitCost" numeric(10,2) check ("UnitCost" is null or "UnitCost" >= 0),
  "UnitPrice" numeric(10,2) not null check ("UnitPrice" >= 0),
  "Weight_kg" numeric(10,3),
  "Supplier" text,
  "RentalRate" numeric(10,2) check ("RentalRate" is null or "RentalRate" >= 0),
  "Availability" text not null check ("Availability" in ('Both','Sale only','Rental only')),
  "YearIntroduced" integer,
  "ParentSKU" text references products("SKU"),
  "Size" text,
  "Color" text,
  "Gender" text,
  "VariantType" text not null check ("VariantType" in ('Parent','Variant','Standalone')),
  "OnHandQty" integer default 0 check ("OnHandQty" >= 0)
);

alter table products enable row level security;

drop policy if exists "Public read access" on products;
create policy "Public read access" on products for select using (true);

grant select on products to anon, authenticated;

insert into products (
  "SKU", "ProductName", "Category", "Subcategory", "UnitCost", "UnitPrice", "Weight_kg",
  "Supplier", "RentalRate", "Availability", "YearIntroduced", "ParentSKU", "Size", "Color",
  "Gender", "VariantType", "OnHandQty"
) values
${valuesSql}
on conflict ("SKU") do update set
  "ProductName" = excluded."ProductName",
  "Category" = excluded."Category",
  "Subcategory" = excluded."Subcategory",
  "UnitCost" = excluded."UnitCost",
  "UnitPrice" = excluded."UnitPrice",
  "Weight_kg" = excluded."Weight_kg",
  "Supplier" = excluded."Supplier",
  "RentalRate" = excluded."RentalRate",
  "Availability" = excluded."Availability",
  "YearIntroduced" = excluded."YearIntroduced",
  "ParentSKU" = excluded."ParentSKU",
  "Size" = excluded."Size",
  "Color" = excluded."Color",
  "Gender" = excluded."Gender",
  "VariantType" = excluded."VariantType",
  "OnHandQty" = excluded."OnHandQty";

-- ── Customers (empty — filled in once the checkout goes live) ──
create table if not exists "Customers_Core" (
  "CustomerID" text primary key,
  "FirstName" text not null,
  "LastName" text not null,
  "CustomerType" text not null check ("CustomerType" in ('Local','Tourist','Shipping')),
  "JoinDate" date not null,
  "City" text,
  "Country" text
);

create table if not exists "Customers_Contact" (
  "CustomerID" text primary key references "Customers_Core"("CustomerID"),
  "Email" text,
  "Phone" text,
  "LoyaltyMember" text check ("LoyaltyMember" is null or "LoyaltyMember" in ('Yes','No')),
  "StreetAddress" text,
  "Region" text,
  "PostalCode" text
);

-- ── Orders (empty — filled in once the checkout goes live) ──
create table if not exists "Orders" (
  "OrderID" text primary key,
  "OrderDate" date not null,
  "CustID" text not null references "Customers_Core"("CustomerID"),
  "LocationID" text not null,
  "SalesAssociate" text,
  "Channel" text not null check ("Channel" in ('Walk-in','Shipping')),
  "ShippingFee" numeric(10,2) not null default 0 check ("ShippingFee" >= 0),
  "OrderTotal" numeric(10,2) not null check ("OrderTotal" >= 0),
  "PaymentMethod" text not null check ("PaymentMethod" in ('Card','Cash','GCash','BankTransfer'))
);

create table if not exists "OrderLines" (
  "OrderID" text not null references "Orders"("OrderID"),
  "LineNumber" integer not null check ("LineNumber" > 0),
  "ProductCode" text not null references products("SKU"),
  "Quantity" integer not null check ("Quantity" > 0),
  "UnitPrice" numeric(10,2) not null check ("UnitPrice" >= 0),
  "DiscountPct" integer not null default 0 check ("DiscountPct" between 0 and 100),
  "LineRevenue" numeric(10,2) not null check ("LineRevenue" >= 0),
  "LineCost" numeric(10,2) not null check ("LineCost" >= 0),
  "EffectiveDiscountAmount" numeric(10,2) not null default 0,
  primary key ("OrderID", "LineNumber")
);

-- No public policies on the four tables above: Row Level Security is on with
-- zero grants, so the anon/publishable key can neither read nor write them.
-- Writes will go through server-side code once checkout (6.6/6.7) is built.
alter table "Customers_Core" enable row level security;
alter table "Customers_Contact" enable row level security;
alter table "Orders" enable row level security;
alter table "OrderLines" enable row level security;
`;

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT_FILE, sql);
console.log(`Wrote ${OUT_FILE} (${ordered.length} product rows)`);
