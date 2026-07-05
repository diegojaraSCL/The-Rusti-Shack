import { notFound } from "next/navigation";
import { getAllProducts, getProductBySlug, getProductGallery } from "@/lib/products";
import { CATEGORIES } from "@/lib/categories";
import ProductDetail from "@/components/ProductDetail";

export function generateStaticParams() {
  return getAllProducts().map((p) => ({ slug: p.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();

  const cat = CATEGORIES.find((c) => c.label === product.category);
  const images = getProductGallery(product.sku, null);

  return <ProductDetail product={product} images={images} categorySlug={cat?.slug} categoryLabel={cat?.label} />;
}
