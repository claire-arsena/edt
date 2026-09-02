import { SCHEDULES_BY_PERSON } from './schedules';

// Une couleur par "code" de cours (ex. "R5.A.L1", "S5.A&B.01"), tirée de la
// palette de la personne à qui appartient le créneau. Toutes les séances d'un
// même cours (CM, TD, TP) partagent donc la même couleur, identique en vue
// jour et en vue semaine — la couleur vient d'un hash du code, jamais d'un
// index d'affichage.
//
// Chaque personne a sa propre famille de couleurs, ce qui permet de
// reconnaître d'un coup d'œil à qui appartient un bloc quand les trois
// emplois du temps sont superposés.

// Claire — pastel
const PASTEL = [
  '#f7a8c4', // rose dragée
  '#f9c784', // abricot
  '#fae08a', // jaune poussin
  '#c3e8a0', // vert tendre
  '#a8e6cf', // menthe
  '#a5dee5', // turquoise clair
  '#a9c9f5', // bleu ciel
  '#c9b8f0', // lilas
  '#e8b4e3', // mauve
  '#f5b7b1', // corail poudré
];

// Alban — couleurs d'hiver
const WINTER = [
  '#1f6f8b', // bleu glacier profond
  '#2e8b7a', // vert sapin
  '#3a5a8c', // bleu nuit
  '#5b5f97', // indigo givré
  '#7d5a8c', // prune
  '#417d9e', // bleu givre
  '#2f6b5e', // épicéa
  '#6b7a99', // ardoise
  '#8ab6d6', // bleu glace
  '#4a4e8c', // encre
];

// Clara — couleurs d'été
const SUMMER = [
  '#ff8a3d', // orange
  '#ffc93c', // soleil
  '#ff6b6b', // corail
  '#2ec4b6', // lagon
  '#06d6a0', // menthe vive
  '#f45b69', // framboise
  '#ff9f1c', // mangue
  '#e84a5f', // pastèque
  '#3bceac', // aqua
  '#ffd166', // sable doré
];

// Palette de repli : personne inconnue (ou créneau sans propriétaire).
const DEFAULT_PALETTE = [
  '#7c6df2', '#2ea6ff', '#1fc7b6', '#3ecf5f', '#ff9f43',
  '#ff5c7a', '#e854c9', '#5b6bd8', '#f0c419', '#22b0a3',
];

const PALETTES_BY_PERSON = {
  claire: PASTEL,
  alban: WINTER,
  clara: SUMMER,
};

// Registre des couleurs : plutôt qu'un simple hash modulo (deux cours
// différents peuvent tomber sur la même couleur), on numérote les codes de
// cours réellement présents dans l'emploi du temps de chaque personne. Tant
// qu'elle a au plus dix cours distincts, deux cours n'ont jamais la même
// couleur. Le tri alphabétique rend l'attribution stable d'une vue à l'autre
// et d'un rechargement à l'autre.
const indexMapCache = {};

function getCourseIndexMap(personId) {
  if (!indexMapCache[personId]) {
    const keys = [
      ...new Set((SCHEDULES_BY_PERSON[personId] || []).map((e) => getCourseKey(e.title))),
    ].sort();
    indexMapCache[personId] = new Map(keys.map((key, i) => [key, i]));
  }
  return indexMapCache[personId];
}

const parseHex = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

// Mélange une couleur vers le fond sombre : mêmes teintes, donc mêmes repères
// visuels d'une vue à l'autre, mais des aplats moins éblouissants sur un
// écran foncé.
function blendToward(hex, target, amount) {
  const [r, g, b] = parseHex(hex);
  const [tr, tg, tb] = parseHex(target);
  const mix = (c, t) => Math.round(c + (t - c) * amount);
  return `#${[mix(r, tr), mix(g, tg), mix(b, tb)]
    .map((c) => c.toString(16).padStart(2, '0'))
    .join('')}`;
}

// Les pastels sont à peine assombris (ils perdraient leur identité) ;
// les couleurs vives le sont davantage.
const darkVariant = (palette, amount) => palette.map((c) => blendToward(c, '#15151a', amount));

const DARK_PALETTES_BY_PERSON = {
  claire: darkVariant(PASTEL, 0.10),
  alban: darkVariant(WINTER, 0.1),
  clara: darkVariant(SUMMER, 0.24),
};
const DEFAULT_PALETTE_DARK = darkVariant(DEFAULT_PALETTE, 0.26);

// Extrait le code de cours en tête du titre ("R5.A.L1" dans
// "R5.A.L1 Compléments IA TD GA1"). À défaut de code, le titre complet sert de
// clé de regroupement.
export function getCourseKey(title) {
  if (!title) return '';
  // Les intitulés ADE commencent parfois par un tiret ("-R1.01-05-TDA (MECA)") :
  // on l'ignore, et on s'arrête au premier séparateur qui n'appartient pas au
  // code lui-même, de sorte que "-R1.01-05-TDA" et "-R1.01-06-TDB" partagent la
  // clé "R1.01" — donc la couleur du module.
  const cleaned = title.replace(/^[^A-Za-z0-9]+/, '');
  const match = cleaned.match(/^[A-Z0-9]+(?:[.&][A-Z0-9]+)*/);
  return (match ? match[0] : cleaned).trim();
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function getCourseColor(title, isDark = false, personId = null) {
  const palette = isDark
    ? DARK_PALETTES_BY_PERSON[personId] || DEFAULT_PALETTE_DARK
    : PALETTES_BY_PERSON[personId] || DEFAULT_PALETTE;
  const key = getCourseKey(title);
  if (!key) return palette[0];

  // Numéro attribué au cours dans l'emploi du temps de la personne ; à défaut
  // (cours absent du flux), on retombe sur un hash du code.
  const index = getCourseIndexMap(personId).get(key);
  return palette[(index === undefined ? hashString(key) : index) % palette.length];
}

// Luminance relative (WCAG) : sur un pastel ou un jaune, un texte blanc
// devient illisible — on repasse alors en texte sombre.
function relativeLuminance(hex) {
  const [r, g, b] = parseHex(hex)
    .map((c) => c / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function getTextOnCourse(color) {
  return relativeLuminance(color) > 0.38
    ? { strong: '#1c1c1e', soft: 'rgba(0,0,0,0.62)', dot: 'rgba(0,0,0,0.35)' }
    : { strong: '#ffffff', soft: 'rgba(255,255,255,0.88)', dot: 'rgba(255,255,255,0.9)' };
}

// Titre débarrassé du code de cours (déjà porté par la couleur du bloc), pour
// laisser la place au libellé utile dans les colonnes étroites de la semaine.
export function getDisplayTitle(title) {
  if (!title) return '';
  const cleaned = title.replace(/^[^A-Za-z0-9]+/, '');
  const key = getCourseKey(title);
  if (key && cleaned.startsWith(key)) {
    // Le reste peut commencer par un séparateur ("-05-TDA (MECA)") : on le
    // retire pour ne garder que la partie utile du libellé.
    const rest = cleaned.slice(key.length).replace(/^[\s\-–—:.]+/, '').trim();
    return rest || cleaned;
  }
  return cleaned;
}
