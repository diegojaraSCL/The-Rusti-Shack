import fs from "fs";
import path from "path";
import { slugifyColor } from "./format";

const PRODUCT_IMAGE_DIR = path.join(process.cwd(), "public", "images", "products");
const GENDER_TOKENS = new Set(["m", "w", "u", "kids"]);

let _files: string[] | null = null;

function listFiles(): string[] {
  if (_files === null) {
    _files = fs.existsSync(PRODUCT_IMAGE_DIR)
      ? fs.readdirSync(PRODUCT_IMAGE_DIR).filter((f) => f.toLowerCase().endsWith(".webp"))
      : [];
  }
  return _files;
}

export type ProductImage = { src: string; isLifestyle: boolean; colorSlug: string | null };

function classify(remainder: string): { isLifestyle: boolean; colorSlug: string | null } {
  const parts = remainder ? remainder.split("-") : [];
  let isLifestyle = false;
  while (parts.length > 0) {
    const last = parts[parts.length - 1];
    if (last === "life") {
      isLifestyle = true;
      parts.pop();
      continue;
    }
    if (GENDER_TOKENS.has(last)) {
      parts.pop();
      continue;
    }
    break;
  }
  return { isLifestyle, colorSlug: parts.length ? parts.join("-") : null };
}

export function getImagesForSku(sku: string): ProductImage[] {
  const prefix = `${sku}-`;
  return listFiles()
    .filter((f) => f === `${sku}.webp` || f.startsWith(prefix))
    .map((f) => {
      const base = f.replace(/\.webp$/i, "");
      const remainder = base === sku ? "" : base.slice(prefix.length);
      const { isLifestyle, colorSlug } = classify(remainder);
      return { src: `/images/products/${f}`, isLifestyle, colorSlug };
    });
}

export function pickCardImage(sku: string, colors: string[]): string | null {
  const imgs = getImagesForSku(sku);
  if (imgs.length === 0) return null;
  const studio = imgs.filter((i) => !i.isLifestyle);
  const pool = studio.length > 0 ? studio : imgs;
  const firstSlug = colors[0] ? slugifyColor(colors[0]) : null;
  const byColor = firstSlug ? pool.find((i) => i.colorSlug === firstSlug) : undefined;
  return (byColor ?? pool[0]).src;
}

export function getGalleryForColor(sku: string, color: string | null): ProductImage[] {
  const imgs = getImagesForSku(sku);
  if (!color) return imgs;
  const slug = slugifyColor(color);
  const matched = imgs.filter((i) => i.colorSlug === slug);
  return matched.length > 0 ? matched : imgs;
}
