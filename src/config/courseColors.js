import { SCHEDULES_BY_PERSON, onSchedulesChanged } from './schedules';

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

// Repère le code d'UE dans le titre. Il n'est pas toujours en tête : certains
// intitulés ADE sont préfixés du groupe ("1A-R1.05-05a-CM-CMA (OUTILS_INFO)"),
// d'autres commencent directement par le code ("S5.A&B.01 Autonomie IUT GA1").
// On découpe donc le titre et on retient le premier morceau qui a la forme
// d'un code de module : lettres + chiffres + au moins un point ("R1.05",
// "R1.03A", "S5.A&B.01", "R5.A.L1", "L3.DROIT.11").
const CODE_WITH_DOT = /^[A-Za-z]{1,4}\d+(?:[.&][A-Za-z0-9]+)+$/;
const CODE_PLAIN = /^[A-Za-z]{1,4}\d+[A-Za-z]?$/;
const TOKEN_SEPARATORS = /[\s\-–—_()[\]/,;:]+/;

function findCourseCode(title) {
  const tokens = title.split(TOKEN_SEPARATORS).filter(Boolean);
  const dotted = tokens.find((t) => CODE_WITH_DOT.test(t));
  if (dotted) return dotted;
  // Code sans point : seulement s'il ouvre le titre, pour ne pas confondre
  // avec un libellé de groupe en fin d'intitulé ("… TD GA1").
  if (tokens[0] && CODE_PLAIN.test(tokens[0])) return tokens[0];
  return null;
}

// Certains emplois du temps ne portent aucun code d'UE : le même cours y
// apparaît sous plusieurs libellés (« TD Anglais 1- GR1 », « TD Anglais 1 -
// GR1 »), et son CM et son TD sous des formulations différentes. On ramène
// alors le titre à son ossature — sans type de séance, sans numéro de groupe,
// sans ponctuation ni accents — pour que ces variantes se rejoignent.
function normalizeTitleKey(title) {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(cm|td|tp|tda|tdb|tpa|tpb)\b/g, ' ')
    .replace(/\bgroupe\s*\d+\b|\bgr\s*\d+\b|\bg\d+\b/g, ' ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(de|du|des|d|le|la|les|l)\s+/, '');
}

export function getCourseKey(title) {
  if (!title) return '';
  const code = findCourseCode(title);
  return code || normalizeTitleKey(title);
}

// Longueur minimale d'un préfixe pour absorber les libellés qui le prolongent
// (« Connaître le droit du travail » et « … CM Mme Chopin »). En dessous, deux
// matières sans rapport risqueraient de se retrouver confondues.
const MIN_PREFIX_LENGTH = 8;

let courseKeysCache = {};

function getCourseKeys(personId) {
  if (!courseKeysCache[personId]) {
    const events = SCHEDULES_BY_PERSON[personId] || [];
    const rawKeys = [...new Set(events.map((e) => getCourseKey(e.title)).filter(Boolean))];
    const titles = new Set(events.map((e) => e.title));

    // Un libellé qui en prolonge un autre désigne le même cours : la forme la
    // plus courte sert de clé commune.
    const bases = [...rawKeys].sort((a, b) => a.length - b.length);
    const groupOf = new Map(
      rawKeys.map((key) => [
        key,
        bases.find((b) => b.length >= MIN_PREFIX_LENGTH && (key === b || key.startsWith(`${b} `))) || key,
      ])
    );

    let keys = [...new Set(groupOf.values())].sort();

    // Garde-fou : si un format d'intitulé inattendu faisait retomber tout un
    // emploi du temps sur une ou deux clés, tous les cours prendraient la même
    // couleur. Dans ce cas on repasse à une couleur par intitulé — moins
    // regroupé, mais jamais monochrome.
    if (keys.length <= 2 && titles.size >= 8) {
      keys = [...titles].sort();
      courseKeysCache[personId] = { keys, resolve: (_, title) => title };
    } else {
      courseKeysCache[personId] = { keys, resolve: (key) => groupOf.get(key) || key };
    }
  }
  return courseKeysCache[personId];
}

let paletteCache = {};

// Quand un emploi du temps est actualisé, le nombre d'UE d'une personne peut
// avoir changé — donc sa palette et le rang de chaque UE.
export function resetCourseColorCache() {
  courseKeysCache = {};
  paletteCache = {};
}

onSchedulesChanged(resetCourseColorCache);

function getPalette(personId, isDark) {
  const count = getCourseKeys(personId).keys.length;
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

  // Rang du cours dans l'emploi du temps de la personne ; à défaut (cours
  // absent des données chargées), on retombe sur un hash de la clé.
  const { keys, resolve } = getCourseKeys(personId);
  const index = keys.indexOf(resolve(key, title));
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

/**
 * Libellé court pour les blocs trop étroits : le code d'UE quand il y en a un,
 * sinon le début du vrai titre. La clé de regroupement, elle, ne s'affiche
 * jamais — c'est une forme normalisée, sans accents ni majuscules.
 */
export function getShortTitle(title, maxLength = 22) {
  if (!title) return '';
  const code = findCourseCode(title);
  if (code) return code;

  const clean = getDisplayTitle(title);
  if (clean.length <= maxLength) return clean;
  // Coupe au dernier mot entier qui tient.
  const cut = clean.slice(0, maxLength);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > maxLength / 2 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

// Le titre est affiché à partir du code d'UE : le préfixe de groupe qui le
// précède parfois n'apporte rien dans un bloc étroit, alors que le code, lui,
// identifie l'UE — et se retrouve dans la couleur.
export function getDisplayTitle(title) {
  if (!title) return '';
  const code = findCourseCode(title);
  if (!code) return title;
  // Le titre commence au code d'UE : le préfixe de groupe qui le précède
  // parfois n'apporte rien.
  const at = title.indexOf(code);
  return at > 0 ? title.slice(at) : title;
}
