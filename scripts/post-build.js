#!/usr/bin/env node
/**
 * Post-build (après `expo export --platform web`) :
 *  1. copie les icônes dans dist/ (racine + dist/assets) aux noms attendus
 *     par iOS Safari ;
 *  2. génère dist/manifest.json pour l'installation en PWA ;
 *  3. complète dist/index.html avec les balises iOS et le viewport anti-zoom.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ASSETS = path.join(ROOT, 'assets');
const DIST = path.join(ROOT, 'dist');
const DIST_ASSETS = path.join(DIST, 'assets');

if (!fs.existsSync(DIST)) {
  console.warn('⚠️  dist/ introuvable : post-build ignoré.');
  process.exit(0);
}

fs.mkdirSync(DIST_ASSETS, { recursive: true });

// ── 1. Icônes ────────────────────────────────────────────────────────────────

fs.readdirSync(ASSETS)
  .filter((f) => f.endsWith('.png'))
  .forEach((file) => fs.copyFileSync(path.join(ASSETS, file), path.join(DIST_ASSETS, file)));

const iconPath = path.join(ASSETS, 'apple-touch-icon-180x180.png');
const faviconPath = path.join(ASSETS, 'favicon.png');

if (fs.existsSync(iconPath)) {
  ['apple-touch-icon.png', 'apple-touch-icon-precomposed.png', 'apple-touch-icon-180x180.png'].forEach(
    (name) => fs.copyFileSync(iconPath, path.join(DIST, name))
  );
}
if (fs.existsSync(faviconPath)) {
  ['favicon.png', 'favicon.ico'].forEach((name) =>
    fs.copyFileSync(faviconPath, path.join(DIST, name))
  );
}
console.log('✅  Icônes copiées à la racine de dist/.');

// ── 2. Manifest PWA ──────────────────────────────────────────────────────────

const manifest = {
  name: 'Emplois du temps',
  short_name: 'EDT',
  description: 'Les emplois du temps de Claire, Alban et Clara',
  start_url: '/',
  display: 'standalone',
  background_color: '#0b0b0d',
  theme_color: '#121215',
  icons: [
    { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' },
    { src: '/assets/pwa-icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
    { src: '/assets/pwa-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
  ],
};

fs.writeFileSync(path.join(DIST, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log('✅  dist/manifest.json généré.');

// ── 3. index.html ────────────────────────────────────────────────────────────

const indexPath = path.join(DIST, 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

html = html.replace(
  /<meta name="viewport" content="[^"]*"/,
  '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no"'
);

// On repart de zéro sur les liens d'icônes pour éviter les doublons ajoutés
// par l'export Expo.
html = html
  .replace(/<link rel="shortcut icon"[^>]*>/gi, '')
  .replace(/<link rel="icon"[^>]*>/gi, '')
  .replace(/<link rel="apple-touch-icon[^>]*>/gi, '')
  .replace(/<link rel="manifest"[^>]*>/gi, '');

// Le thème par défaut est sombre : la page est peinte en sombre avant même
// que React ne démarre, et un script minuscule relit la préférence
// enregistrée pour éviter tout flash de fond clair (ou l'inverse).
const themeBoot = `
    <style>
      html, body { background-color: #0b0b0d; }
    </style>
    <script>
      (function () {
        try {
          var mode = localStorage.getItem('@edt_mode_v1') || 'dark';
          var dark = mode === 'dark'
            || (mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
          var bg = dark ? '#0b0b0d' : '#e5e5ea';
          document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
          document.documentElement.style.backgroundColor = bg;
          document.addEventListener('DOMContentLoaded', function () {
            document.body.style.backgroundColor = bg;
          });
        } catch (e) {}
      })();
    </script>`;

const headTags = `
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <link rel="apple-touch-icon-precomposed" href="/apple-touch-icon-precomposed.png" />
    <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-180x180.png" />
    <link rel="icon" type="image/png" href="/favicon.png" />
    <link rel="shortcut icon" href="/favicon.ico" />
    <link rel="manifest" href="/manifest.json" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="theme-color" content="#121215" />
    <meta name="apple-mobile-web-app-title" content="EDT" />`;

html = html.replace(/<meta name="theme-color"[^>]*>/gi, '');
html = html.replace('</head>', `${headTags}${themeBoot}\n  </head>`);
fs.writeFileSync(indexPath, html);
console.log('✅  dist/index.html complété (icônes iOS, manifest, viewport).');
console.log('\n🚀  Post-build terminé.');
