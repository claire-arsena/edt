// Repérage des créneaux d'examen : ADE les annonce dans l'intitulé (parfois
// dans la description) sans champ dédié. Ces créneaux sont affichés en rouge
// et scintillent, pour qu'ils sautent aux yeux au milieu des cours ordinaires.

// Comparaison sans accents ni casse : "Contrôle" et "controle" se valent.
const normalize = (s) =>
  (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

// Mots qui désignent toujours une épreuve.
const EXAM_WORDS =
  /\b(examens?|exams?|tests?|partiels?|evaluations?|rattrapages?|soutenances?)\b/;

// « Contrôle » est à part : c'est un mot d'épreuve, mais aussi un nom de
// matière (« contrôle de gestion »). Il ne compte donc que s'il n'est pas
// désamorcé par l'un des deux indices ci-dessous.
const CONTROLE_WORD = /\bcontroles?\b/;

// 1. Un type de séance dans le même intitulé (CM, TD, TP et leurs variantes
//    TDA, TPB, CMA…) : c'est un cours ordinaire de la matière, pas l'épreuve.
const SESSION_TYPE = /\b(cm|td|tp)[a-z]?\d*\b/;

// 2. « Contrôle de … » introduit presque toujours un intitulé de matière
//    (contrôle de gestion, contrôle de qualité). L'exception est « contrôle
//    de connaissances », qui est bien une épreuve.
const CONTROLE_AS_SUBJECT = /\bcontroles?\s+(de|du|des)\s+(?!connaissances?\b)\p{L}/u;

// "DS" (devoir surveillé) seulement en capitales : en minuscules, ce serait
// une syllabe quelconque.
const DS_ABBREVIATION = /\bDS\b/;

export function isExamEvent(event) {
  if (!event) return false;
  const haystack = [event.title, ...(event.details || [])].join(' ');
  const text = normalize(haystack);

  if (EXAM_WORDS.test(text) || DS_ABBREVIATION.test(haystack)) return true;

  // Le titre seul décide du sort de « contrôle » : la description porte des
  // libellés de groupe (« GA1 TD1 ») qui fausseraient le test.
  const title = normalize(event.title);
  if (!CONTROLE_WORD.test(title)) return false;
  return !SESSION_TYPE.test(title) && !CONTROLE_AS_SUBJECT.test(title);
}

// Rouge d'alerte, décliné pour les deux thèmes.
export const EXAM_COLOR = { light: '#e53935', dark: '#d32f2f' };

export const getExamColor = (isDark) => (isDark ? EXAM_COLOR.dark : EXAM_COLOR.light);
