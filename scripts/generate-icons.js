#!/usr/bin/env node
/**
 * Génère toutes les icônes (app, favicon, apple-touch-icon, PWA) avant le
 * build web. Les PNG sont dessinés ici même — encodeur PNG minimal basé sur
 * zlib, aucune dépendance externe et aucun binaire versionné : le dépôt reste
 * léger et le build ne peut pas échouer sur une icône manquante.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');

const SIZES = {
  'icon.png': 1024,
  'adaptive-icon.png': 1024,
  'favicon.png': 64,
  'apple-touch-icon-57x57.png': 57,
  'apple-touch-icon-60x60.png': 60,
  'apple-touch-icon-72x72.png': 72,
  'apple-touch-icon-76x76.png': 76,
  'apple-touch-icon-114x114.png': 114,
  'apple-touch-icon-120x120.png': 120,
  'apple-touch-icon-144x144.png': 144,
  'apple-touch-icon-152x152.png': 152,
  'apple-touch-icon-167x167.png': 167,
  'apple-touch-icon-180x180.png': 180,
  'pwa-icon-192x192.png': 192,
  'pwa-icon-512x512.png': 512,
};

// ── Encodeur PNG (RGBA 8 bits) ───────────────────────────────────────────────

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([len, typeAndData, crc]);
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // profondeur
  ihdr[9] = 6;  // RGBA
  // Chaque ligne est préfixée de son type de filtre (0 = aucun).
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Dessin de l'icône (coordonnées normalisées 0 → 1) ────────────────────────

const PINK = [216, 27, 96];      // #d81b60
const PINK_LIGHT = [233, 30, 99]; // #e91e63
const PINK_DEEP = [194, 24, 91];  // #c2185b
const OFF_WHITE = [248, 249, 252]; // #f8f9fc

// Appartenance d'un point à un rectangle à coins arrondis.
function inRoundedRect(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

// Couleur du calendrier rose iOS en un point donné, ou null hors icône.
function sample(x, y) {
  if (!inRoundedRect(x, y, 0, 0, 1, 1, 0.225)) return null;

  // Anneaux de reliure, au-dessus de la carte
  if (
    inRoundedRect(x, y, 0.30, 0.17, 0.375, 0.32, 0.037) ||
    inRoundedRect(x, y, 0.625, 0.17, 0.70, 0.32, 0.037)
  ) {
    return OFF_WHITE;
  }

  if (inRoundedRect(x, y, 0.17, 0.245, 0.83, 0.82, 0.075)) {
    // Bandeau d'en-tête du calendrier
    if (y < 0.375) return PINK_DEEP;

    // Grille de pastilles (3 colonnes × 2 lignes)
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const x0 = 0.245 + col * 0.185;
        const y0 = 0.46 + row * 0.17;
        if (inRoundedRect(x, y, x0, y0, x0 + 0.115, y0 + 0.10, 0.028)) {
          // La dernière pastille est pleine (le "jour" en cours)
          return row === 1 && col === 2 ? PINK : [216, 27, 96, 0.35];
        }
      }
    }
    return OFF_WHITE;
  }

  // Fond : dégradé vertical rose iOS
  const t = y;
  return [
    Math.round(PINK_LIGHT[0] + (PINK_DEEP[0] - PINK_LIGHT[0]) * t),
    Math.round(PINK_LIGHT[1] + (PINK_DEEP[1] - PINK_LIGHT[1]) * t),
    Math.round(PINK_LIGHT[2] + (PINK_DEEP[2] - PINK_LIGHT[2]) * t),
  ];
}

// Rendu avec suréchantillonnage 3×3 pour lisser les bords arrondis.
function renderIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  const SS = 3;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;

      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = (px + (sx + 0.5) / SS) / size;
          const y = (py + (sy + 0.5) / SS) / size;
          const c = sample(x, y);
          if (!c) continue;

          // Une pastille translucide se fond dans le blanc cassé de la carte.
          const alpha = c.length === 4 ? c[3] : 1;
          r += c[0] * alpha + OFF_WHITE[0] * (1 - alpha);
          g += c[1] * alpha + OFF_WHITE[1] * (1 - alpha);
          b += c[2] * alpha + OFF_WHITE[2] * (1 - alpha);
          a += 1;
        }
      }

      const idx = (py * size + px) * 4;
      const total = SS * SS;
      if (a === 0) continue; // pixel transparent
      rgba[idx] = Math.round(r / a);
      rgba[idx + 1] = Math.round(g / a);
      rgba[idx + 2] = Math.round(b / a);
      rgba[idx + 3] = Math.round((a / total) * 255);
    }
  }

  return encodePng(size, size, rgba);
}

function main() {
  fs.mkdirSync(ASSETS_DIR, { recursive: true });
  console.log('🎨  Génération des icônes…\n');

  // Une seule image par taille distincte, réutilisée pour les noms partageant
  // cette taille (le rendu 1024 est le plus coûteux).
  const cache = new Map();
  Object.entries(SIZES).forEach(([name, size]) => {
    if (!cache.has(size)) cache.set(size, renderIcon(size));
    fs.writeFileSync(path.join(ASSETS_DIR, name), cache.get(size));
    console.log(`✅  assets/${name} (${size}×${size})`);
  });

  console.log('\n🎉  Icônes générées.');
}

if (require.main === module) main();

module.exports = { renderIcon };
