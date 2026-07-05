import Link from "next/link";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { formatPrice } from "@/lib/format";
import ClearCartOnMount from "@/components/ClearCartOnMount";

type Props = { searchParams: Promise<{ session_id?: string }> };

export default async function OrderConfirmedPage({ searchParams }: Props) {
  const { session_id } = await searchParams;

  if (!session_id) {
    return (
      <Placeholder title="No order found" body="This page needs a valid checkout session to show your order." />
    );
  }

  const session = await stripe.checkout.sessions.retrieve(session_id).catch(() => null);
  if (!session || session.payment_status !== "paid") {
    return (
      <Placeholder
        title="We can't confirm this order"
        body="If you just paid, this can take a few seconds — refresh the page shortly."
      />
    );
  }

  const { data: order } = await supabaseAdmin
    .from("Orders")
    .select('"OrderID","OrderTotal"')
    .eq("StripeSessionID", session_id)
    .maybeSingle();

  if (!order) {
    return (
      <Placeholder
        title="Payment received — order is being recorded"
        body="Your payment went through. Give it a few seconds and refresh this page for your order number."
      />
    );
  }

  const { data: lines } = await supabaseAdmin
    .from("OrderLines")
    .select('"ProductCode","Quantity","UnitPrice"')
    .eq("OrderID", order.OrderID)
    .order('"LineNumber"', { ascending: true });

  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center">
      <ClearCartOnMount />
      <p className="text-5xl mb-4">✅</p>
      <h1 className="text-2xl font-bold text-navy-800 mb-2">Thank you!</h1>
      <p className="text-gray-600 mb-1">
        Your order <strong>{order.OrderID}</strong> is confirmed.
      </p>
      <p className="text-gray-600 mb-6">We&rsquo;ll get it packed up and shipped from Apo Island.</p>

      <div className="bg-white rounded-2xl border border-sand-200 p-5 text-left space-y-2 mb-6">
        {(lines ?? []).map((line) => (
          <div key={line.ProductCode} className="flex justify-between text-sm">
            <span className="text-gray-600">
              {line.ProductCode} × {line.Quantity}
            </span>
            <span className="font-medium text-navy-800">
              {formatPrice(Number(line.UnitPrice) * Number(line.Quantity))}
            </span>
          </div>
        ))}
        <div className="flex justify-between font-bold text-navy-800 pt-2 border-t border-sand-200">
          <span>Total</span>
          <span>{formatPrice(Number(order.OrderTotal))}</span>
        </div>
      </div>

      <Link
        href="/"
        className="inline-block bg-teal-500 hover:bg-teal-600 text-white font-bold px-6 py-3 rounded-xl transition-colors"
      >
        Back to the shop
      </Link>
    </div>
  );
}

function Placeholder({ title, body }: { title: string; body: string }) {
  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center">
      <p className="text-5xl mb-4">🕐</p>
      <h1 className="text-2xl font-bold text-navy-800 mb-2">{title}</h1>
      <p className="text-gray-600 mb-6">{body}</p>
      <Link
        href="/"
        className="inline-block bg-teal-500 hover:bg-teal-600 text-white font-bold px-6 py-3 rounded-xl transition-colors"
      >
        Back to the shop
      </Link>
    </div>
  );
}
