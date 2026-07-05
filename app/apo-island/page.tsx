import Link from "next/link";

export default function ApoIslandPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-gradient-to-b from-navy-800 to-navy-700 text-white rounded-3xl px-6 py-12 text-center mb-10">
        <p className="text-4xl mb-3">🏝️🐢</p>
        <h1 className="text-3xl md:text-4xl font-bold mb-3">About Apo Island</h1>
        <p className="text-sand-200 max-w-xl mx-auto">
          A small volcanic island off Negros Oriental, protected as a marine sanctuary since 1985 —
          and home to The Rusti Shack.
        </p>
      </div>

      <div className="space-y-8 text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-navy-800 mb-2">Why divers and snorkelers come here</h2>
          <p>
            Apo Island is one of the oldest community-managed marine sanctuaries in the Philippines.
            Decades of protection mean the reef right off the beach is thick with hard coral, green
            sea turtles, and reef fish in numbers you rarely see this close to shore. Most visitors
            never need a boat to reach good snorkeling — you can walk in from the sand.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-navy-800 mb-2">Getting here by bangka</h2>
          <p>
            Apo Island has no airport or bridge — the only way over is by <strong>bangka</strong>, the
            outrigger boats used throughout the Visayas. Most travelers reach the island from Dauin or
            the Malatapay public market pier, both on mainland Negros Oriental, about a 20–30 minute
            boat ride away. Boats are weather-dependent, so mornings tend to be calmer than afternoons.
            If you&rsquo;re coming from Dumaguete City, it&rsquo;s roughly a 45-minute tricycle or jeepney
            ride down to the pier before the boat crossing.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-navy-800 mb-2">Find us on the island</h2>
          <p>
            The Rusti Shack sits a short walk from the main beach landing. Look for the shack with the
            wave sign — we&rsquo;re usually open from sunrise until the last boat back to the mainland.
            Everything you rent from us stays on Apo Island; anything you buy, we&rsquo;ll ship anywhere
            in the world.
          </p>
        </section>
      </div>

      <div className="mt-10 text-center">
        <Link
          href="/"
          className="inline-block bg-teal-500 hover:bg-teal-600 text-white font-bold px-6 py-3 rounded-xl transition-colors"
        >
          Back to the shop
        </Link>
      </div>
    </div>
  );
}
