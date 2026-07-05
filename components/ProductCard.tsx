import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/lib/products";
import { formatPrice } from "@/lib/format";

const CATEGORY_EMOJI: Record<string, string> = {
  "Snorkel & Dive": "🤿",
  Surfing: "🏄",
  "Beach Essentials": "🏖️",
  Fishing: "🎣",
  Apparel: "👕",
};

export default function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/products/${product.slug}`}
      className="group bg-white rounded-2xl shadow-sm hover:shadow-lg border border-sand-200 overflow-hidden transition-all duration-200 flex flex-col"
    >
      <div className="relative aspect-square bg-gradient-to-br from-sand-100 to-teal-400/20 overflow-hidden">
        {product.cardImage ? (
          <Image
            src={product.cardImage}
            alt={product.name}
            fill
            sizes="(max-width: 768px) 50vw, 20vw"
            className="object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">
            {CATEGORY_EMOJI[product.category] ?? "📦"}
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        <p className="text-xs font-medium text-teal-600 uppercase tracking-wide mb-1">
          {product.subcategory}
        </p>
        <h3 className="font-semibold text-navy-800 text-sm leading-snug mb-auto group-hover:text-teal-600 transition-colors">
          {product.name}
        </h3>
        <div className="mt-3 flex items-end justify-between gap-2">
          <span className="text-lg font-bold text-navy-800">{formatPrice(product.price)}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full bg-navy-50 text-navy-800">
            For sale
          </span>
        </div>
        {product.rentable && product.dailyRental && (
          <p className="text-xs text-teal-600 font-medium mt-1">
            🏝️ Also rentable on-island — {formatPrice(product.dailyRental)}/day
          </p>
        )}
      </div>
    </Link>
  );
}
