// Repérage des créneaux d'examen : ADE les annonce dans l'intitulé (parfois
// dans la description) sans champ dédié. Ces créneaux sont affichés en rouge
// et scintillent, pour qu'ils sautent aux yeux au milieu des cours ordinaires.

// Comparaison sans accents ni casse : "Contrôle" et "controle" se valent.
const normalize = (s) =>
  (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const EXAM_WORDS =
  /\b(examens?|exams?|tests?|partiels?|controles?|evaluations?|rattrapages?|soutenances?)\b/;

// "DS" (devoir surveillé) seulement en capitales : en minuscules, ce serait
// une syllabe quelconque.
const DS_ABBREVIATION = /\bDS\b/;

export function isExamEvent(event) {
  if (!event) return false;
  const haystack = [event.title, ...(event.details || [])].join(' ');
  return EXAM_WORDS.test(normalize(haystack)) || DS_ABBREVIATION.test(haystack);
}

// Rouge d'alerte, décliné pour les deux thèmes.
export const EXAM_COLOR = { light: '#e53935', dark: '#d32f2f' };

export const getExamColor = (isDark) => (isDark ? EXAM_COLOR.dark : EXAM_COLOR.light);
