import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/lib/cart-context";
import Header from "@/components/Header";
import Link from "next/link";

export const metadata: Metadata = {
  title: "The Rusti Shack — Apo Island Beach Gear",
  description:
    "Snorkel, dive, surf, and beach gear for rent and sale on Apo Island, Philippines. We ship worldwide.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">
        <CartProvider>
          <Header />
          <main>{children}</main>
          <footer className="bg-navy-900 text-sand-200 mt-16 py-10 px-4">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <p className="text-lg font-bold text-white mb-2">🌊 The Rusti Shack</p>
                <p className="text-sm leading-relaxed">
                  Your one-stop beach gear shop on Apo Island, Philippines. Gear up, dive in.
                </p>
                <Link
                  href="/apo-island"
                  className="inline-block text-sm text-teal-400 hover:text-teal-300 mt-2 transition-colors"
                >
                  About Apo Island →
                </Link>
              </div>
              <div>
                <p className="font-semibold text-white mb-2">Shipping</p>
                <p className="text-sm">We ship worldwide 🌍</p>
                <p className="text-sm mt-1">AU · USA · Germany · Japan · and more</p>
                <p className="text-xs text-sand-300 mt-2">
                  Gear marked &ldquo;also rentable&rdquo; is pickup-only on Apo Island — rentals don&rsquo;t ship.
                </p>
              </div>
              <div>
                <p className="font-semibold text-white mb-2">Find Us</p>
                <p className="text-sm">Apo Island, Dauin, Negros Oriental</p>
                <p className="text-sm mt-1">Philippines</p>
              </div>
            </div>
            <p className="text-center text-xs text-sand-300 mt-8">
              © {new Date().getFullYear()} The Rusti Shack. All rights reserved.
            </p>
          </footer>
        </CartProvider>
      </body>
    </html>
  );
}
