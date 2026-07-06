-- The Rusti Shack — Part C schema additions for the historical data + back office
-- Schema only, no data (the bulk historical rows are loaded separately by
-- scripts/load-historical-data.mjs using the Supabase secret key, since the
-- ~40,000+ historical rows are too large to paste into the SQL Editor).
-- Run this once in the Supabase SQL Editor before running that script.

-- ── Reference tables ──────────────────────────────────────────────────────
create table if not exists "Stores" (
  "LocationCode" text primary key,
  "LocationName" text not null,
  "StoreType" text not null check ("StoreType" in ('Walk-in','Shipping')),
  "Country" text
);

create table if not exists "Employees" (
  "EmpID" text primary key,
  "FirstName" text not null,
  "LastName" text not null,
  "Role" text not null,
  "HireDate" date not null,
  "HomeStore" text references "Stores"("LocationCode")
);

create table if not exists "DateDimension" (
  "Date" date primary key,
  "Year" integer not null,
  "Quarter" text not null,
  "Month" integer not null,
  "MonthName" text not null,
  "Day" integer not null,
  "DayOfWeek" text not null,
  "WeekNum" integer not null,
  "IsWeekend" text not null check ("IsWeekend" in ('Yes','No')),
  "Season" text not null check ("Season" in ('Shoulder','Typhoon','Dry Peak')),
  "FiscalYear" text not null
);

-- ── Customer detail ───────────────────────────────────────────────────────
create table if not exists "Customers_Demographics" (
  "CustomerID" text primary key references "Customers_Core"("CustomerID"),
  "Gender" text,
  "Occupation" text
);

-- ── Promotions ────────────────────────────────────────────────────────────
create table if not exists "Promotions" (
  "PromoCode" text primary key,
  "PromoName" text not null,
  "PromoType" text not null check ("PromoType" in ('Seasonal','Loyalty','Daily','Shipping')),
  "DiscountPct" integer not null check ("DiscountPct" between 0 and 100),
  "StartDate" date not null,
  "EndDate" date not null,
  "Channel" text not null check ("Channel" in ('Walk-in','Shipping','Both'))
);

create table if not exists "OrderPromotions" (
  "OrderID" text not null references "Orders"("OrderID"),
  "PromoCode" text not null references "Promotions"("PromoCode"),
  primary key ("OrderID", "PromoCode")
);

-- ── Rentals ───────────────────────────────────────────────────────────────
create table if not exists "RentalTransactions" (
  "RentalID" text primary key,
  "RentalDate" date not null,
  "CustID" text not null references "Customers_Core"("CustomerID"),
  "LocationID" text references "Stores"("LocationCode"),
  "SalesAssociate" text references "Employees"("EmpID"),
  "SKU" text not null references products("SKU"),
  "Quantity" integer not null check ("Quantity" > 0),
  "DailyRate" numeric(10,2) not null check ("DailyRate" >= 0),
  "RentalRevenue" numeric(10,2) not null check ("RentalRevenue" >= 0),
  "Returned" text not null check ("Returned" in ('Yes','No'))
);

-- ── Extra inventory detail on the products table ─────────────────────────
alter table products add column if not exists "ReorderPoint" integer;
alter table products add column if not exists "RentalUnits" integer;
alter table products add column if not exists "AvailableForSale" integer;
alter table products add column if not exists "WarehouseLocation" text;
alter table products add column if not exists "LastCountDate" date;

-- ── Lock everything down: manager-only data, same as Orders/Customers ────
-- No public policies on any of these -- RLS enabled with zero grants means
-- the anon/publishable key can neither read nor write them. Only the
-- server-side admin client (secret key) used by /management can see this.
alter table "Stores" enable row level security;
alter table "Employees" enable row level security;
alter table "DateDimension" enable row level security;
alter table "Customers_Demographics" enable row level security;
alter table "Promotions" enable row level security;
alter table "OrderPromotions" enable row level security;
alter table "RentalTransactions" enable row level security;
