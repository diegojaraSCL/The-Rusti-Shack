import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { CATEGORIES, type Category } from "./categories";
import { pickCardImage, getGalleryForColor, type ProductImage } from "./images";

export type Product = {
  sku: string;
  slug: string;
  name: string;
  category: Category;
  subcategory: string;
  price: number;
  rentable: boolean;
  dailyRental: number | null;
  sizes: string[];
  colors: string[];
  onHand: number;
  weight: number;
  description: string;
  cardImage: string | null;
};

type ProductRow = {
  SKU: string;
  ProductName: string;
  Category: string;
  Subcategory: string;
  UnitPrice: number;
  Weight_kg: number;
  RentalRate: number | string;
  Availability: string;
  ParentSKU: string;
  Size: string;
  Color: string;
  VariantType: string;
};

type InventoryRow = { SKU: string; OnHandQty: number };

// Hand-written copy — the spreadsheet has no description column, so these fill in
// the marketing voice. Falls back to a generic line for any SKU not covered here.
const DESCRIPTIONS: Record<string, string> = {
  "FIN-001": "Full-foot open-heel fins built for reef dives and snorkel sessions. Stiff blade delivers powerful thrust with minimal effort — great for fighting light currents around Apo Island.",
  "FIN-002": "Compact travel fins that pack flat so they don't eat your luggage. Softer blade than dive fins, ideal for snorkeling at a relaxed pace.",
  "FIN-003": "Bright aqua fins sized for little feet. Soft rubber blade makes kicking easy for kids exploring shallow reef areas.",
  "SNK-001": "Wide-view tempered-glass mask with silicone skirt for a comfortable seal. The go-to choice for first-time snorkelers visiting the reef.",
  "SNK-002": "Anti-fog coating on the tempered lens keeps your view crystal clear even on long dives. Low-volume design reduces drag.",
  "SNK-003": "Complete set for young snorkelers: kid-sized mask, dry-top snorkel, and short fins. Everything fits in the included mesh bag.",
  "SNK-004": "Adult set with pro anti-fog mask, purge-valve snorkel, and lightweight fins. Great value for guests who want one kit that covers everything.",
  "SNK-005": "Dry-top valve seals automatically when submerged so you resurface with a clear tube. Comfortable mouthpiece for long sessions.",
  "WET-001": "3mm neoprene shorty that keeps you warm in the Visayan Sea without overheating in tropical conditions. Front zip, UV-resistant coating.",
  "KIT-001": "Everything a beginner needs to start kitesurfing: kite, bar, lines, harness, and board. Available in three kite sizes to match your weight and the wind.",
  "KIT-002": "Waist harness with padded lumbar support and stainless spreader bar. Fits over a rashguard or wetsuit.",
  "SUR-001": "7'2 funboard is the sweet spot between a longboard's stability and a shortboard's maneuverability. Polyester glass layup.",
  "SUR-002": "Classic 9'0 noserider longboard. Wide, stable deck makes it the easiest board to learn on. Perfect for Apo's mellow reef breaks.",
  "SUR-003": "Soft-top foam deck is forgiving on wipeouts — the standard learning board. Available in three lengths to match rider height.",
  "SUR-004": "7mm urethane cord with swivel and Velcro ankle cuff. Choose the length that matches your board.",
  "SUR-005": "Tropical-formula wax stays tacky in water above 24°C. One bar covers a full board.",
  "SUR-006": "Skimboard with fiberglass bottom for speed across wet sand. Concave rails help with spin tricks.",
  "BCH-001": "Bright-colored shovel and bucket set for hours of castle-building. Stackable for easy packing.",
  "BCH-002": "Classic inflatable beach ball. Deflates flat for the flight home.",
  "BCH-003": "100% cotton towel in three tropical prints. Generous 80x160 cm size.",
  "BCH-004": "Ultra-absorbent microfiber dries 3x faster than cotton. Doubles as a sarong or picnic blanket.",
  "BCH-005": "7ft wind-resistant umbrella with UV50+ canopy. Screw-in sand anchor included.",
  "BCH-006": "One-person tent that pops open in seconds and folds back into a disc. SPF 50+ fabric, mesh windows for airflow.",
  "BCH-007": "Reef-safe formula with mineral filters — no oxybenzone or octinoxate. SPF 50, water-resistant 80 minutes.",
  "BCH-008": "Pure aloe vera gel with vitamin E. Soothes sun-exposed skin and works as a post-dive moisturizer.",
  "BCH-009": "Polarized lenses cut glare off the water. Available in six frame and lens combinations.",
  "BCH-010": "Universal-fit waterproof pouch seals with a roll-top closure. Touch-sensitive window for your screen.",
  "BCH-011": "Rubber-soled water shoes protect feet on rocky reef entries and exits. Drains fast and dries faster.",
  "BCH-012": "Insulated bag keeps drinks cold for 8 hours. Available in 16 L, 24 L, and 40 L.",
  "FSH-001": "7ft medium-heavy spinning rod rated for 15-40 lb line. Built for Visayan saltwater species.",
  "FSH-002": "Collapses to 55 cm for travel. Full extension 210 cm with carbon-fibre blanks.",
  "FSH-003": "4000-size reel with 6:1 gear ratio and 10 stainless ball bearings. Front drag system.",
  "FSH-004": "Three-tray organizer with 28 adjustable compartments. Waterproof lid seal.",
  "FSH-005": "Fresh live shrimp sourced daily from local fishermen. Sold by the pound.",
  "FSH-006": "Fresh squid sourced daily. Effective bait for reef species and pelagic fish.",
  "FSH-007": "12-piece assortment of jigs, spoons, and poppers in tropical color patterns that work well in Philippine waters.",
  "FSH-008": "Hand-tied cast net with 8ft radius. 3/8-inch mesh suitable for baitfish and shrimp.",
  "APP-001": "Soft 180-gsm cotton tee with the Rusti Shack wave logo on the chest. A wearable piece of Apo Island.",
  "APP-002": "Souvenir tee featuring Apo Island's iconic lighthouse. Printed on sand-colored ring-spun cotton.",
  "APP-003": "Quick-dry boardshorts with elastic waist, drawstring, and velcro fly. 4-way stretch fabric.",
  "APP-004": "Two-piece set with underwire-free top and full-coverage bottom. Mix-and-match colors available.",
  "APP-005": "Sporty one-piece with built-in shelf bra and UPF 30 protection.",
  "APP-006": "Wide-brim hat with 360° UPF 50+ coverage. Crushable for packing.",
  "APP-007": "Lightweight EVA sole with tropical-print straps. Worn on the beach and beyond.",
  "WET-002": "Long-sleeve rashguard with UPF 50+ protection. Flatlock seams prevent chafing during long surf sessions.",
};

let _products: Product[] | null = null;

function buildProducts(): Product[] {
  const file = path.join(process.cwd(), "data", "The_Rusti_Shack_Dataset.xlsx");
  const buffer = fs.readFileSync(file);
  const wb = XLSX.read(buffer, { type: "buffer" });
  const rows = XLSX.utils.sheet_to_json<ProductRow>(wb.Sheets["Products"], { defval: "" });
  const inventory = XLSX.utils.sheet_to_json<InventoryRow>(wb.Sheets["Inventory"], { defval: "" });
  const onHandBySku = new Map(inventory.map((r) => [r.SKU, Number(r.OnHandQty) || 0]));

  const families = new Map<string, ProductRow[]>();
  for (const row of rows) {
    const key = row.ParentSKU || row.SKU;
    if (!families.has(key)) families.set(key, []);
    families.get(key)!.push(row);
  }

  const validCategories = new Set(CATEGORIES.map((c) => c.label));
  const products: Product[] = [];

  for (const [familySku, group] of families) {
    const parent = group.find((r) => r.VariantType !== "Variant") ?? group[0];
    const variants = group.filter((r) => r.VariantType === "Variant");
    const sizes = [...new Set(variants.map((r) => r.Size).filter(Boolean))];
    const colors = [...new Set(variants.map((r) => r.Color).filter(Boolean))];

    if (!validCategories.has(parent.Category as Category)) continue;

    const rentable = parent.Availability === "Both";
    const dailyRental = rentable && parent.RentalRate ? Number(parent.RentalRate) : null;

    products.push({
      sku: familySku,
      slug: familySku.toLowerCase(),
      name: parent.ProductName,
      category: parent.Category as Category,
      subcategory: parent.Subcategory,
      price: Number(parent.UnitPrice),
      rentable,
      dailyRental,
      sizes,
      colors,
      onHand: onHandBySku.get(familySku) ?? 0,
      weight: Number(parent.Weight_kg),
      description: DESCRIPTIONS[familySku] ?? `${parent.ProductName} — available at The Rusti Shack on Apo Island.`,
      cardImage: pickCardImage(familySku, colors),
    });
  }

  return products.sort((a, b) => a.sku.localeCompare(b.sku));
}

export function getAllProducts(): Product[] {
  if (!_products) _products = buildProducts();
  return _products;
}

export function getProductBySlug(slug: string): Product | undefined {
  return getAllProducts().find((p) => p.slug === slug);
}

export function getProductsByCategory(category: Category): Product[] {
  return getAllProducts().filter((p) => p.category === category);
}

export function getProductGallery(sku: string, color: string | null): ProductImage[] {
  return getGalleryForColor(sku, color);
}
