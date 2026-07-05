"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/format";

const SHIPPING_FEE = 12;

export default function CartPage() {
  const { items, removeItem, updateQuantity, subtotal } = useCart();

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <p className="text-5xl mb-4">🛒</p>
        <h1 className="text-2xl font-bold text-navy-800 mb-2">Your cart is empty</h1>
        <p className="text-gray-600 mb-6">Looks like you haven&rsquo;t added any gear yet.</p>
        <Link
          href="/"
          className="inline-block bg-teal-500 hover:bg-teal-600 text-white font-bold px-6 py-3 rounded-xl transition-colors"
        >
          Keep shopping
        </Link>
      </div>
    );
  }

  const total = subtotal + SHIPPING_FEE;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-navy-800 mb-6">Your Cart</h1>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={`${item.sku}-${item.size}-${item.color}`}
            className="flex gap-4 p-4 bg-white rounded-2xl border border-sand-200"
          >
            <div className="relative w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-sand-100">
              {item.image && (
                <Image src={item.image} alt={item.name} fill sizes="96px" className="object-cover" />
              )}
            </div>

            <div className="flex-1 min-w-0 flex flex-col">
              <p className="font-semibold text-navy-800 leading-snug">{item.name}</p>
              <div className="text-xs text-gray-500 mt-0.5 space-x-2">
                {item.size && <span>Size: {item.size}</span>}
                {item.color && <span>Color: {item.color}</span>}
              </div>
              <p className="text-sm font-semibold text-teal-600 mt-1">{formatPrice(item.price)}</p>

              <div className="mt-auto flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQuantity(item.sku, item.size, item.color, item.quantity - 1)}
                    className="w-7 h-7 rounded-lg border border-sand-200 text-gray-600 hover:border-navy-800 hover:text-navy-800 transition-colors"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.sku, item.size, item.color, item.quantity + 1)}
                    className="w-7 h-7 rounded-lg border border-sand-200 text-gray-600 hover:border-navy-800 hover:text-navy-800 transition-colors"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
                <button
                  onClick={() => removeItem(item.sku, item.size, item.color)}
                  className="text-sm text-gray-400 hover:text-red-500 transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>

            <p className="font-bold text-navy-800 shrink-0">{formatPrice(item.price * item.quantity)}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 bg-white rounded-2xl border border-sand-200 p-5 space-y-2">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Subtotal</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Shipping</span>
          <span>{formatPrice(SHIPPING_FEE)}</span>
        </div>
        <div className="flex justify-between font-bold text-lg text-navy-800 pt-2 border-t border-sand-200">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <Link
          href="/"
          className="flex-1 text-center py-3 rounded-xl border border-sand-200 font-medium text-navy-800 hover:border-navy-800 transition-colors"
        >
          Keep shopping
        </Link>
        <Link
          href="/checkout"
          className="flex-1 text-center py-3 rounded-xl bg-coral-500 hover:bg-coral-600 text-white font-bold transition-colors"
        >
          Check out
        </Link>
      </div>
    </div>
  );
}
