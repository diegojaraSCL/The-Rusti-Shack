import Link from "next/link";
import { CATEGORIES } from "@/lib/categories";
import { getAllProducts, getProductsByCategory } from "@/lib/products";
import ProductCard from "@/components/ProductCard";

export default function HomePage() {
  const products = getAllProducts();
  const featured = CATEGORIES.map((cat) => getProductsByCategory(cat.label)[0]).filter(Boolean);

  return (
    <>
      <section className="bg-gradient-to-b from-navy-800 to-navy-700 text-white px-4 py-16 text-center">
        <div className="max-w-3xl mx-auto">
          <p className="text-4xl mb-4">🌊🤿🏄</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
            Beach gear for rent &amp; sale on <span className="text-teal-400">Apo Island</span>
          </h1>
          <p className="text-sand-200 text-lg mb-6 max-w-xl mx-auto">
            Masks, fins, surfboards, fishing tackle, and more — everything you need to make the most of the Visayan Sea.
          </p>
          <div className="inline-flex items-center gap-2 bg-teal-500/20 border border-teal-400/40 text-teal-300 px-5 py-2 rounded-full text-sm font-medium mb-8">
            <span>🌍</span>
            <span>We ship worldwide — Australia, USA, Germany, Japan, and more</span>
          </div>
          <div className="flex flex-wrap gap-3 justify-center">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/${cat.slug}`}
                className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                {cat.icon} {cat.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="bg-teal-500 text-white text-center py-3 px-4 text-sm font-medium">
        🚢 Free shipping on orders over $150 · We ship to 8+ countries worldwide
      </div>

      <section className="max-w-7xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-navy-800 mb-6">Shop by Category</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {CATEGORIES.map((cat) => {
            const count = getProductsByCategory(cat.label).length;
            return (
              <Link
                key={cat.slug}
                href={`/${cat.slug}`}
                className="group bg-white hover:bg-navy-800 border border-sand-200 rounded-2xl p-4 text-center transition-all duration-200 hover:shadow-lg hover:border-navy-700"
              >
                <p className="text-4xl mb-2">{cat.icon}</p>
                <p className="font-semibold text-sm text-navy-800 group-hover:text-white transition-colors">
                  {cat.label}
                </p>
                <p className="text-xs text-gray-500 group-hover:text-sand-300 transition-colors mt-1">
                  {count} products
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 pb-12">
        <h2 className="text-2xl font-bold text-navy-800 mb-6">Popular Picks</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {featured.map((p) => p && <ProductCard key={p.sku} product={p} />)}
        </div>
      </section>

      <section className="bg-white border-y border-sand-200 py-8 px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { icon: "🌍", label: "Ships worldwide", sub: "8+ countries" },
            { icon: "🤿", label: `${products.length} products`, sub: "Rent or buy" },
            { icon: "🏖️", label: "Apo Island", sub: "World-class reef" },
            { icon: "📦", label: "Fast dispatch", sub: "From the Philippines" },
          ].map((item) => (
            <div key={item.label}>
              <p className="text-3xl mb-1">{item.icon}</p>
              <p className="font-semibold text-sm text-navy-800">{item.label}</p>
              <p className="text-xs text-gray-500">{item.sub}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
