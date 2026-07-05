import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";

const SHIPPING_FEE = 12;
const MAX_QUANTITY_PER_LINE = 20;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RequestItem = { sku: string; quantity: number; size?: string; color?: string };
type RequestCustomer = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  streetAddress: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  joinLoyalty: boolean;
};

function isValidCustomer(c: unknown): c is RequestCustomer {
  if (!c || typeof c !== "object") return false;
  const r = c as Record<string, unknown>;
  return (
    typeof r.firstName === "string" &&
    r.firstName.trim().length > 0 &&
    typeof r.lastName === "string" &&
    r.lastName.trim().length > 0 &&
    typeof r.email === "string" &&
    EMAIL_RE.test(r.email.trim()) &&
    typeof r.streetAddress === "string" &&
    r.streetAddress.trim().length > 0 &&
    typeof r.city === "string" &&
    r.city.trim().length > 0 &&
    typeof r.postalCode === "string" &&
    r.postalCode.trim().length > 0 &&
    typeof r.country === "string" &&
    r.country.trim().length > 0
  );
}

export async function POST(req: Request) {
  let body: { items?: unknown; customer?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? (body.items as RequestItem[]) : [];
  if (items.length === 0) {
    return NextResponse.json({ error: "Your cart is empty." }, { status: 400 });
  }
  if (!isValidCustomer(body.customer)) {
    return NextResponse.json({ error: "Please fill in all required fields." }, { status: 400 });
  }
  const customer = body.customer;

  const skus = items.map((i) => String(i.sku));
  const { data: products, error } = await supabase
    .from("products")
    .select('"SKU","ProductName","UnitPrice","Availability"')
    .in("SKU", skus);

  if (error) {
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }

  const bySku = new Map((products ?? []).map((p) => [p.SKU as string, p]));

  const lineItems: Array<{
    price_data: {
      currency: string;
      unit_amount: number;
      product_data: { name: string; metadata: Record<string, string> };
    };
    quantity: number;
  }> = [];

  for (const item of items) {
    const quantity = Math.trunc(Number(item.quantity));
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY_PER_LINE) {
      return NextResponse.json({ error: "Invalid quantity in cart." }, { status: 400 });
    }
    const product = bySku.get(String(item.sku));
    if (!product) {
      return NextResponse.json({ error: "One of your items is no longer available." }, { status: 400 });
    }

    // Price always comes from the database, never from the request body.
    lineItems.push({
      price_data: {
        currency: "usd",
        unit_amount: Math.round(Number(product.UnitPrice) * 100),
        product_data: {
          name: product.ProductName as string,
          metadata: {
            sku: product.SKU as string,
            size: item.size ?? "",
            color: item.color ?? "",
          },
        },
      },
      quantity,
    });
  }

  lineItems.push({
    price_data: {
      currency: "usd",
      unit_amount: Math.round(SHIPPING_FEE * 100),
      product_data: { name: "Shipping", metadata: { kind: "shipping" } },
    },
    quantity: 1,
  });

  const origin = new URL(req.url).origin;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    success_url: `${origin}/order-confirmed?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/checkout`,
    customer_email: customer.email.trim().toLowerCase(),
    metadata: {
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email.trim().toLowerCase(),
      phone: customer.phone,
      streetAddress: customer.streetAddress,
      city: customer.city,
      region: customer.region,
      postalCode: customer.postalCode,
      country: customer.country,
      joinLoyalty: customer.joinLoyalty ? "1" : "0",
    },
  });

  return NextResponse.json({ url: session.url });
}
