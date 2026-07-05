import { notFound } from "next/navigation";
import Link from "next/link";
import { CATEGORIES, getCategoryBySlug } from "@/lib/categories";
import { getProductsByCategory } from "@/lib/products";
import ProductCard from "@/components/ProductCard";

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.slug }));
}

type Props = { params: Promise<{ category: string }> };

export default async function CategoryPage({ params }: Props) {
  const { category: categorySlug } = await params;
  const cat = getCategoryBySlug(categorySlug);
  if (!cat) notFound();

  const items = await getProductsByCategory(cat.label);
  const rentable = items.filter((p) => p.rentable);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <nav className="text-sm text-gray-500 mb-4">
        <Link href="/" className="hover:text-teal-600 transition-colors">Home</Link>
        <span className="mx-2">/</span>
        <span className="text-navy-800 font-medium">{cat.label}</span>
      </nav>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-navy-800 mb-2">
          {cat.icon} {cat.label}
        </h1>
        <p className="text-gray-600">{cat.tagline}</p>
        <div className="flex flex-wrap gap-3 mt-3 text-sm text-gray-500">
          <span>{items.length} products</span>
          {rentable.length > 0 && (
            <span className="text-teal-600 font-medium">
              · {rentable.length} available to rent on the island
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {CATEGORIES.map((c) => (
          <Link
            key={c.slug}
            href={`/${c.slug}`}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              c.slug === categorySlug
                ? "bg-navy-800 text-white border-navy-800"
                : "bg-white text-gray-600 border-sand-200 hover:border-navy-800 hover:text-navy-800"
            }`}
          >
            {c.icon} {c.label}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {items.map((product) => (
          <ProductCard key={product.sku} product={product} />
        ))}
      </div>
    </div>
  );
}
