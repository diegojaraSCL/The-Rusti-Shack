"use client";

import Link from "next/link";
import { useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import { useCart } from "@/lib/cart-context";
import CartDrawer from "./CartDrawer";

export default function Header() {
  const { totalItems } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  return (
    <>
      <header className="bg-navy-800 text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2" onClick={() => setMenuOpen(false)}>
              <span className="text-2xl">🌊</span>
              <span className="font-bold text-xl tracking-tight text-sand-100">The Rusti Shack</span>
            </Link>

            <div className="flex items-center gap-3">
              <Link
                href="/apo-island"
                className="hidden md:block px-3 py-1.5 rounded-md text-sm font-medium text-sand-200 hover:bg-navy-700 hover:text-white transition-colors"
              >
                Apo Island
              </Link>
              <button
                onClick={() => setCartOpen(true)}
                className="relative p-2 hover:bg-navy-700 rounded-lg transition-colors"
                aria-label="Open cart"
              >
                <span className="text-xl">🛒</span>
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-coral-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </button>

              <button
                className="md:hidden p-2 hover:bg-navy-700 rounded-lg transition-colors"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Toggle menu"
              >
                <span className="text-xl">{menuOpen ? "✕" : "☰"}</span>
              </button>
            </div>
          </div>

          <nav className="hidden md:flex gap-1 pb-2">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/${cat.slug}`}
                className="px-3 py-1.5 rounded-md text-sm font-medium text-sand-200 hover:bg-navy-700 hover:text-white transition-colors"
              >
                {cat.icon} {cat.label}
              </Link>
            ))}
          </nav>
        </div>

        {menuOpen && (
          <nav className="md:hidden border-t border-navy-700 bg-navy-900">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/${cat.slug}`}
                className="block px-4 py-3 text-sand-200 hover:bg-navy-700 hover:text-white transition-colors border-b border-navy-800"
                onClick={() => setMenuOpen(false)}
              >
                {cat.icon} {cat.label}
              </Link>
            ))}
            <Link
              href="/apo-island"
              className="block px-4 py-3 text-sand-200 hover:bg-navy-700 hover:text-white transition-colors last:border-0"
              onClick={() => setMenuOpen(false)}
            >
              🏝️ About Apo Island
            </Link>
          </nav>
        )}
      </header>

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
