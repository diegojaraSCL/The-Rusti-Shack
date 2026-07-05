export type Category =
  | "Snorkel & Dive"
  | "Surfing"
  | "Beach Essentials"
  | "Fishing"
  | "Apparel";

export const CATEGORIES: { label: Category; slug: string; icon: string; tagline: string }[] = [
  { label: "Snorkel & Dive", slug: "snorkel-dive", icon: "🤿", tagline: "Explore Apo Island's world-class reef" },
  { label: "Surfing", slug: "surfing", icon: "🏄", tagline: "Ride the waves around the Visayas" },
  { label: "Beach Essentials", slug: "beach-essentials", icon: "🏖️", tagline: "Everything you need for a perfect beach day" },
  { label: "Fishing", slug: "fishing", icon: "🎣", tagline: "Cast a line in the Visayan Sea" },
  { label: "Apparel", slug: "apparel", icon: "👕", tagline: "Gear up in Rusti Shack style" },
];

export function getCategoryBySlug(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug);
}
