"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/lib/cart-context";
import { formatPrice } from "@/lib/format";

type Props = { open: boolean; onClose: () => void };

export default function CartDrawer({ open, onClose }: Props) {
  const { items, removeItem, totalItems, subtotal } = useCart();

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} aria-hidden />

      <aside className="fixed right-0 top-0 h-full w-full max-w-sm bg-white z-50 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-sand-200 bg-navy-800 text-white">
          <h2 className="font-bold text-lg">Cart ({totalItems})</h2>
          <button onClick={onClose} className="text-2xl hover:text-sand-300 transition-colors" aria-label="Close cart">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="text-center text-gray-500 mt-12">
              <p className="text-4xl mb-3">🛒</p>
              <p>Your cart is empty.</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={`${item.sku}-${item.size}-${item.color}`}
                className="flex gap-3 p-3 bg-sand-50 rounded-lg border border-sand-200"
              >
                <div className="relative w-14 h-14 shrink-0 rounded-md overflow-hidden bg-sand-100">
                  {item.image && (
                    <Image src={item.image} alt={item.name} fill sizes="56px" className="object-cover" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-navy-800 text-sm leading-snug">{item.name}</p>
                  {item.size && <p className="text-xs text-gray-500 mt-0.5">Size: {item.size}</p>}
                  {item.color && <p className="text-xs text-gray-500">Color: {item.color}</p>}
                  <p className="text-sm font-semibold text-teal-600 mt-1">
                    {formatPrice(item.price)} × {item.quantity}
                  </p>
                </div>
                <button
                  onClick={() => removeItem(item.sku, item.size, item.color)}
                  className="text-gray-400 hover:text-red-500 transition-colors text-lg self-start"
                  aria-label="Remove item"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="p-4 border-t border-sand-200 space-y-3 bg-white">
            <div className="flex justify-between font-bold text-lg text-navy-800">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <Link
              href="/cart"
              onClick={onClose}
              className="block text-center w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-3 rounded-xl transition-colors"
            >
              View Cart
            </Link>
          </div>
        )}
      </aside>
    </>
  );
}
