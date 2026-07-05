"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import type { Product } from "@/lib/products";
import type { ProductImage } from "@/lib/images";
import { formatPrice, slugifyColor } from "@/lib/format";
import { useCart } from "@/lib/cart-context";

const CATEGORY_EMOJI: Record<string, string> = {
  "Snorkel & Dive": "🤿",
  Surfing: "🏄",
  "Beach Essentials": "🏖️",
  Fishing: "🎣",
  Apparel: "👕",
};

type Props = {
  product: Product;
  images: ProductImage[];
  categorySlug?: string;
  categoryLabel?: string;
};

export default function ProductDetail({ product, images, categorySlug, categoryLabel }: Props) {
  const { addItem } = useCart();
  const [selectedSize, setSelectedSize] = useState<string>(product.sizes[0] ?? "");
  const [selectedColor, setSelectedColor] = useState<string>(product.colors[0] ?? "");
  const [added, setAdded] = useState(false);

  const gallery = useMemo(() => {
    if (!selectedColor) return images;
    const slug = slugifyColor(selectedColor);
    const matched = images.filter((i) => i.colorSlug === slug);
    return matched.length > 0 ? matched : images;
  }, [images, selectedColor]);

  const [activeImage, setActiveImage] = useState(0);
  const shown = gallery[Math.min(activeImage, gallery.length - 1)];

  function handleAddToCart() {
    addItem({
      sku: product.sku,
      name: product.name,
      price: product.price,
      image: shown?.src ?? product.cardImage,
      size: selectedSize || undefined,
      color: selectedColor || undefined,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <nav className="text-sm text-gray-500 mb-6 flex flex-wrap gap-1 items-center">
        <Link href="/" className="hover:text-teal-600 transition-colors">Home</Link>
        <span>/</span>
        {categorySlug && (
          <>
            <Link href={`/${categorySlug}`} className="hover:text-teal-600 transition-colors">
              {categoryLabel}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-navy-800 font-medium truncate">{product.name}</span>
      </nav>

      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        <div>
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-gradient-to-br from-sand-100 to-teal-400/30">
            {shown ? (
              <Image
                key={shown.src}
                src={shown.src}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-8xl">
                {CATEGORY_EMOJI[product.category] ?? "📦"}
              </div>
            )}
          </div>
          {gallery.length > 1 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {gallery.map((img, i) => (
                <button
                  key={img.src}
                  onClick={() => setActiveImage(i)}
                  className={`relative w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors ${
                    i === activeImage ? "border-navy-800" : "border-sand-200"
                  }`}
                >
                  <Image src={img.src} alt="" fill sizes="64px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <p className="text-xs font-semibold text-teal-600 uppercase tracking-widest mb-1">
            {product.subcategory}
          </p>
          <h1 className="text-2xl md:text-3xl font-bold text-navy-800 mb-3 leading-snug">
            {product.name}
          </h1>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-3xl font-bold text-navy-800">{formatPrice(product.price)}</span>
            <span className="text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded-full bg-navy-50 text-navy-800">
              For sale
            </span>
          </div>

          {product.rentable && product.dailyRental && (
            <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 mb-5 text-sm text-teal-700">
              🏝️ Also available to rent on the island — <strong>{formatPrice(product.dailyRental)}/day</strong>.
              Rentals are pickup-only at Apo Island and can&rsquo;t be shipped.
            </div>
          )}

          <p className="text-gray-600 text-sm leading-relaxed mb-6">{product.description}</p>

          {product.sizes.length > 0 && (
            <div className="mb-4">
              <label className="block text-sm font-semibold text-navy-800 mb-2">Size</label>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                      selectedSize === size
                        ? "bg-navy-800 text-white border-navy-800"
                        : "bg-white text-gray-700 border-sand-200 hover:border-navy-800"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.colors.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-navy-800 mb-2">Color / Style</label>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      setSelectedColor(color);
                      setActiveImage(0);
                    }}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                      selectedColor === color
                        ? "bg-navy-800 text-white border-navy-800"
                        : "bg-white text-gray-700 border-sand-200 hover:border-navy-800"
                    }`}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleAddToCart}
            className={`w-full py-4 rounded-2xl font-bold text-lg transition-all duration-200 ${
              added ? "bg-teal-500 text-white scale-95" : "bg-coral-500 hover:bg-coral-600 text-white hover:shadow-lg"
            }`}
          >
            {added ? "✓ Added to Cart!" : "Add to Cart"}
          </button>

          <div className="mt-6 pt-6 border-t border-sand-200 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-500">SKU</p>
              <p className="font-medium text-navy-800">{product.sku}</p>
            </div>
            <div>
              <p className="text-gray-500">Weight</p>
              <p className="font-medium text-navy-800">{product.weight} kg</p>
            </div>
            <div>
              <p className="text-gray-500">Category</p>
              <p className="font-medium text-navy-800">{product.category}</p>
            </div>
            <div>
              <p className="text-gray-500">In stock</p>
              <p className={`font-medium ${product.onHand > 5 ? "text-teal-600" : "text-coral-500"}`}>
                {product.onHand > 0 ? `${product.onHand} units` : "Out of stock"}
              </p>
            </div>
          </div>

          <div className="mt-4 text-xs text-gray-500 flex items-center gap-2">
            <span>🌍</span>
            <span>We ship worldwide — Australia, USA, Germany, Japan, and more.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
