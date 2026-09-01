// Palette catégorielle vive : une couleur par "code" de cours (ex. "S5.A&B.01",
// "R5.A.L1"), de sorte que toutes les séances d'un même cours (CM, TD, TP)
// gardent la même couleur — et la même d'une vue à l'autre, puisque la couleur
// est dérivée d'un hash du code et non d'un index d'affichage.
const COURSE_PALETTE = [
  '#7c6df2', // violet
  '#2ea6ff', // bleu
  '#1fc7b6', // turquoise
  '#3ecf5f', // vert
  '#ff9f43', // orange
  '#ff5c7a', // corail
  '#e854c9', // magenta
  '#5b6bd8', // indigo
  '#f0c419', // ambre
  '#22b0a3', // sarcelle
];

// Extrait le code de cours en tête du titre ("S5.A&B.01" dans
// "S5.A&B.01 Autonomie IUT GA1"). À défaut de code, le titre complet sert de
// clé de regroupement.
export function getCourseKey(title) {
  if (!title) return '';
  const match = title.match(/^[A-Z0-9]+(?:[.&][A-Z0-9]+)*/);
  return (match ? match[0] : title).trim();
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function getCourseColor(title) {
  const key = getCourseKey(title);
  if (!key) return COURSE_PALETTE[0];
  return COURSE_PALETTE[hashString(key) % COURSE_PALETTE.length];
}

// Titre débarrassé du code de cours (déjà porté par la couleur du bloc), pour
// laisser la place au libellé utile dans les colonnes étroites de la semaine.
export function getDisplayTitle(title) {
  if (!title) return '';
  const key = getCourseKey(title);
  if (key && title.startsWith(key)) {
    return title.slice(key.length).trim() || title;
  }
  return title;
}
