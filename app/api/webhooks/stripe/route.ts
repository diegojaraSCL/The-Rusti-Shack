import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";
import { createOrderFromSession, type CheckoutCustomer, type CheckoutLineItem } from "@/lib/orders";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(req: Request) {
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  if (session.payment_status !== "paid") {
    return NextResponse.json({ received: true });
  }

  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
    expand: ["data.price.product"],
  });

  const metadata = session.metadata ?? {};
  const customer: CheckoutCustomer = {
    firstName: metadata.firstName ?? "",
    lastName: metadata.lastName ?? "",
    email: metadata.email ?? "",
    phone: metadata.phone ?? "",
    streetAddress: metadata.streetAddress ?? "",
    city: metadata.city ?? "",
    region: metadata.region ?? "",
    postalCode: metadata.postalCode ?? "",
    country: metadata.country ?? "",
    joinLoyalty: metadata.joinLoyalty === "1",
  };

  const productLines = lineItems.data.filter((li) => {
    const product = li.price?.product as Stripe.Product | undefined;
    return product?.metadata?.kind !== "shipping";
  });
  const shippingLine = lineItems.data.find((li) => {
    const product = li.price?.product as Stripe.Product | undefined;
    return product?.metadata?.kind === "shipping";
  });
  const shippingFee = shippingLine ? (shippingLine.amount_total ?? 0) / 100 : 0;

  const skus = productLines
    .map((li) => (li.price?.product as Stripe.Product | undefined)?.metadata?.sku)
    .filter((sku): sku is string => Boolean(sku));

  const { data: products } = await supabase.from("products").select('"SKU","UnitCost"').in("SKU", skus);
  const costBySku = new Map((products ?? []).map((p) => [p.SKU as string, Number(p.UnitCost) || 0]));

  const lines: CheckoutLineItem[] = productLines.map((li) => {
    const product = li.price?.product as Stripe.Product;
    const sku = product.metadata.sku;
    return {
      sku,
      quantity: li.quantity ?? 1,
      unitPrice: (li.price?.unit_amount ?? 0) / 100,
      unitCost: costBySku.get(sku) ?? 0,
    };
  });

  try {
    await createOrderFromSession(session.id, customer, lines, shippingFee);
  } catch (err) {
    console.error("Failed to record order from Stripe session:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Failed to record order." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
