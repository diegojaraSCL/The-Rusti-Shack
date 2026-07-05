import Link from "next/link";

export default function CheckoutPlaceholderPage() {
  return (
    <div className="max-w-xl mx-auto px-4 py-20 text-center">
      <p className="text-5xl mb-4">🚧</p>
      <h1 className="text-2xl font-bold text-navy-800 mb-2">Checkout is coming soon</h1>
      <p className="text-gray-600 mb-6">
        We&rsquo;re still building the checkout form and payment step. Your cart is saved — check back shortly.
      </p>
      <Link
        href="/cart"
        className="inline-block bg-teal-500 hover:bg-teal-600 text-white font-bold px-6 py-3 rounded-xl transition-colors"
      >
        Back to cart
      </Link>
    </div>
  );
}
