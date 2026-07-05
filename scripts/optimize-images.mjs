import sharp from "sharp";
import { readdir, mkdir, stat } from "fs/promises";
import path from "path";

const SRC = process.argv[2];
const DEST = "public/images/products";

if (!SRC) {
  console.error("Usage: node scripts/optimize-images.mjs <source-folder>");
  process.exit(1);
}

const STUDIO_WIDTH = 1000;
const LIFE_WIDTH = 1400;

async function run() {
  await mkdir(DEST, { recursive: true });
  const files = (await readdir(SRC)).filter((f) => f.toLowerCase().endsWith(".png"));

  let totalBefore = 0;
  let totalAfter = 0;

  for (const file of files) {
    const srcPath = path.join(SRC, file);
    const isLifestyle = file.toLowerCase().includes("-life");
    const width = isLifestyle ? LIFE_WIDTH : STUDIO_WIDTH;
    const outName = file.replace(/\.png$/i, ".webp");
    const outPath = path.join(DEST, outName);

    totalBefore += (await stat(srcPath)).size;

    await sharp(srcPath)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(outPath);

    totalAfter += (await stat(outPath)).size;

    console.log(`${file} -> ${outName}`);
  }

  const mb = (n) => (n / 1024 / 1024).toFixed(1);
  console.log(`\nConverted ${files.length} images to ${DEST}`);
  console.log(`Size: ${mb(totalBefore)} MB -> ${mb(totalAfter)} MB`);
}

run();
