// One-off: regenerate valid branded placeholder images for public/.
// The previous public/*.webp were corrupted (binary mangled into UTF-8
// replacement chars), so no browser could decode them. These are clean,
// on-brand (dark + gold) placeholders until real product photography lands.
import sharp from 'sharp';

const GOLD = '#c5a059';
const DARKGOLD = '#8a6d2f';
const BG = '#0a0a0a';

// Vertical cricket-bat silhouette, centered — simple stylized shape.
function bat(cx, topY, h) {
  const bladeW = h * 0.12;
  const handleW = bladeW * 0.45;
  const handleH = h * 0.32;
  const bladeH = h - handleH;
  const bladeTop = topY + handleH;
  return `
    <rect x="${cx - handleW / 2}" y="${topY}" width="${handleW}" height="${handleH}" rx="${handleW / 2}" fill="${DARKGOLD}"/>
    <rect x="${cx - bladeW / 2}" y="${bladeTop}" width="${bladeW}" height="${bladeH}" rx="${bladeW * 0.18}" fill="${GOLD}"/>
    <rect x="${cx - bladeW / 2 + bladeW * 0.32}" y="${bladeTop + bladeH * 0.08}" width="${bladeW * 0.06}" height="${bladeH * 0.84}" fill="${BG}" opacity="0.35"/>
  `;
}

const productSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1500" viewBox="0 0 1200 1500">
  <rect width="1200" height="1500" fill="${BG}"/>
  <rect x="40" y="40" width="1120" height="1420" fill="none" stroke="${GOLD}" stroke-opacity="0.25" stroke-width="2"/>
  ${bat(600, 360, 820)}
  <text x="600" y="180" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="84" letter-spacing="14" fill="${GOLD}">GRAINOOD</text>
  <text x="600" y="1320" text-anchor="middle" font-family="Arial, sans-serif" font-size="40" letter-spacing="10" fill="#ffffff" fill-opacity="0.7">ENGLISH WILLOW</text>
  <text x="600" y="1390" text-anchor="middle" font-family="Arial, sans-serif" font-size="26" letter-spacing="6" fill="#ffffff" fill-opacity="0.35">PRODUCT IMAGE COMING SOON</text>
</svg>`;

const storySvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0a0a0a"/>
      <stop offset="1" stop-color="#1a1408"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#g)"/>
  ${bat(1300, 180, 560)}
  <text x="160" y="430" font-family="Georgia, 'Times New Roman', serif" font-size="92" letter-spacing="6" fill="${GOLD}">Handcrafted</text>
  <text x="160" y="540" font-family="Georgia, 'Times New Roman', serif" font-size="92" letter-spacing="6" fill="#ffffff" fill-opacity="0.85">Mastery</text>
  <rect x="164" y="600" width="120" height="3" fill="${GOLD}"/>
</svg>`;

// Hero background — landscape, dark gradient with faint gold bat motif.
// No text: the hero headline is overlaid by the page itself.
const heroSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900" viewBox="0 0 1600 900">
  <defs>
    <radialGradient id="rg" cx="0.7" cy="0.3" r="0.9">
      <stop offset="0" stop-color="#1d1707"/>
      <stop offset="0.55" stop-color="#0d0b08"/>
      <stop offset="1" stop-color="#070707"/>
    </radialGradient>
  </defs>
  <rect width="1600" height="900" fill="url(#rg)"/>
  <g opacity="0.10">
    ${bat(1140, 90, 720)}
    ${bat(1330, 150, 620)}
  </g>
  <rect x="0" y="0" width="1600" height="900" fill="${BG}" opacity="0.25"/>
</svg>`;

async function gen(svg, out) {
  await sharp(Buffer.from(svg)).webp({ quality: 82 }).toFile(out);
  console.log('wrote', out);
}

await gen(productSvg, 'public/product-bat.webp');
await gen(storySvg, 'public/handmade-mastery.webp');
await gen(heroSvg, 'public/hero-bat.webp');
