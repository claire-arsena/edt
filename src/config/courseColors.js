import { SCHEDULES_BY_PERSON } from './schedules';

// Une couleur distincte par UE, dans la gamme de tons de chaque personne.
//
// Les couleurs ne viennent pas d'une liste figée : pour chaque personne, on
// relève les codes d'UE réellement présents dans son emploi du temps (R1.01,
// R1.07, S5.A&B.01…) et on répartit autant de teintes que nécessaire sur la
// plage de tons qui lui est attribuée. Deux UE différentes ne peuvent donc
// jamais recevoir la même couleur, quel qu'en soit le nombre — et toutes les
// séances d'une même UE (CM, TD, TP) gardent la même, identique en vue jour et
// en vue semaine.
//
// Chaque personne a sa gamme :
//   Claire — pastel : toutes les teintes, mais claires et peu saturées
//   Alban  — hiver  : teintes froides (sapin, glacier, nuit, indigo, prune), sombres
//   Clara  — été    : teintes chaudes et vives (rose, corail, orange, soleil, lagon)
// Une pastel bleue et une bleu nuit restent donc bien distinctes.
// Chaque personne a sa gamme de tons, décrite par trois paliers
// (saturation / luminosité) ; les teintes, elles, parcourent tout le cercle
// chromatique, ce qui laisse la place nécessaire pour distinguer autant d'UE
// que l'année en compte :
//   Claire — pastel : clair et doux
//   Alban  — hiver  : sombre et froid (sapin, glacier, nuit, indigo, prune)
//   Clara  — été    : vif et saturé (corail, orange, soleil, lagon)
// Un pastel bleu et un bleu nuit restent donc bien distincts.
const FAMILIES = {
  claire:  { hueStart: 330, tones: [{ s: 58, l: 84 }, { s: 72, l: 74 }, { s: 46, l: 66 }] },
  alban:   { hueStart: 190, tones: [{ s: 44, l: 39 }, { s: 34, l: 27 }, { s: 54, l: 51 }] },
  clara:   { hueStart: 340, tones: [{ s: 94, l: 57 }, { s: 80, l: 45 }, { s: 90, l: 65 }] },
  // Personne inconnue : gamme neutre, ni pastel ni hivernale.
  default: { hueStart: 250, tones: [{ s: 70, l: 60 }, { s: 60, l: 48 }, { s: 76, l: 70 }] },
};

// Ajustement de luminosité en thème sombre : les tons foncés d'Alban seraient
// avalés par le fond, les pastels de Claire éblouiraient un peu trop.
const DARK_LIGHT_SHIFT = { claire: -4, alban: 8, clara: -3, default: -3 };

function hslToHex(h, s, l) {
  const sat = s / 100;
  const light = l / 100;
  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = light - c / 2;
  const [r, g, b] = (
    h < 60 ? [c, x, 0] :
    h < 120 ? [x, c, 0] :
    h < 180 ? [0, c, x] :
    h < 240 ? [0, x, c] :
    h < 300 ? [x, 0, c] : [c, 0, x]
  ).map((v) => Math.round((v + m) * 255));
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

// Grille teinte × palier : les UE se répartissent d'abord sur le cercle des
// teintes, puis changent de palier de luminosité. Deux UE de teinte voisine
// tombent ainsi sur des paliers différents, et deux UE de même palier sont
// éloignées sur le cercle — c'est ce qui garde les couleurs séparables même
// avec une douzaine d'UE.
function buildPalette(personId, count, isDark) {
  const family = FAMILIES[personId] || FAMILIES.default;
  const shift = DARK_LIGHT_SHIFT[personId] ?? DARK_LIGHT_SHIFT.default;
  const n = Math.max(count, 1);
  const levels = family.tones.length;
  const hueSteps = Math.max(1, Math.ceil(n / levels));

  return Array.from({ length: n }, (_, i) => {
    const hueIndex = i % hueSteps;
    const level = Math.floor(i / hueSteps) % levels;
    // Le décalage par palier évite que deux paliers retombent sur les mêmes
    // teintes exactes.
    const hue =
      (family.hueStart + (360 * hueIndex) / hueSteps + (level * 360) / (hueSteps * levels)) % 360;
    const { s, l } = family.tones[level];
    return hslToHex(hue, s, Math.min(92, Math.max(16, l + (isDark ? shift : 0))));
  });
}

// Extrait le code d'UE en tête du titre ("R1.01" dans "-R1.01-05-TDA (MECA)",
// "R5.A.L1" dans "R5.A.L1 Compléments IA TD GA1"). Les intitulés ADE
// commencent parfois par un tiret, et le code s'arrête au premier séparateur
// qui n'en fait pas partie : "-R1.01-05-TDA" et "-R1.01-06-TDB" partagent donc
// la clé "R1.01", donc la couleur de l'UE.
export function getCourseKey(title) {
  if (!title) return '';
  const cleaned = title.replace(/^[^A-Za-z0-9]+/, '');
  const match = cleaned.match(/^[A-Z0-9]+(?:[.&][A-Z0-9]+)*/);
  return (match ? match[0] : cleaned).trim();
}

// Codes d'UE d'une personne, triés : l'ordre ne dépend pas de l'ordre des
// créneaux, donc la couleur d'une UE ne change pas d'un affichage à l'autre.
const courseKeysCache = {};

function getCourseKeys(personId) {
  if (!courseKeysCache[personId]) {
    courseKeysCache[personId] = [
      ...new Set((SCHEDULES_BY_PERSON[personId] || []).map((e) => getCourseKey(e.title)).filter(Boolean)),
    ].sort();
  }
  return courseKeysCache[personId];
}

const paletteCache = {};

function getPalette(personId, isDark) {
  const count = getCourseKeys(personId).length;
  const cacheKey = `${personId}|${isDark}|${count}`;
  if (!paletteCache[cacheKey]) paletteCache[cacheKey] = buildPalette(personId, count, isDark);
  return paletteCache[cacheKey];
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function getCourseColor(title, isDark = false, personId = null) {
  const key = getCourseKey(title);
  const palette = getPalette(personId, isDark);
  if (!key) return palette[0];

  // Rang de l'UE dans l'emploi du temps de la personne ; à défaut (cours
  // absent du flux chargé), on retombe sur un hash du code.
  const index = getCourseKeys(personId).indexOf(key);
  return palette[(index === -1 ? hashString(key) : index) % palette.length];
}

// Luminance relative (WCAG) : sur un pastel ou un jaune, un texte blanc
// devient illisible — on repasse alors en texte sombre.
function relativeLuminance(hex) {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function getTextOnCourse(color) {
  return relativeLuminance(color) > 0.38
    ? { strong: '#1c1c1e', soft: 'rgba(0,0,0,0.62)', dot: 'rgba(0,0,0,0.35)' }
    : { strong: '#ffffff', soft: 'rgba(255,255,255,0.88)', dot: 'rgba(255,255,255,0.9)' };
}

// Titre débarrassé du code d'UE (déjà porté par la couleur du bloc), pour
// laisser la place au libellé utile dans les colonnes étroites.
export function getDisplayTitle(title) {
  if (!title) return '';
  const cleaned = title.replace(/^[^A-Za-z0-9]+/, '');
  const key = getCourseKey(title);
  if (key && cleaned.startsWith(key)) {
    const rest = cleaned.slice(key.length).replace(/^[\s\-–—:.]+/, '').trim();
    return rest || cleaned;
  }
  return cleaned;
}
