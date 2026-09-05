import { PEOPLE, getPerson } from './people';
import { formatLocalDate } from '../utils/planningTime';
import { isExamEvent } from './exams';
import claireSchedule from '../data/schedules/claire.json';
import albanSchedule from '../data/schedules/alban.json';
import claraSchedule from '../data/schedules/clara.json';

// Emplois du temps générés au build par scripts/fetch-schedules.js. Une
// personne dont le flux .ics n'est pas encore configuré a simplement un
// tableau vide : son interrupteur reste sans effet jusqu'à ce que son lien
// soit renseigné.
export const SCHEDULES_BY_PERSON = {
  claire: claireSchedule,
  alban: albanSchedule,
  clara: claraSchedule,
};

export const hasSchedule = (personId) => (SCHEDULES_BY_PERSON[personId] || []).length > 0;

// Tous les créneaux des personnes actuellement affichées, chacun annoté de la
// personne à qui il appartient.
export function getMergedSchedule(visiblePeople) {
  const events = [];
  PEOPLE.forEach(({ id, name, accent }) => {
    if (visiblePeople && visiblePeople[id] === false) return;
    (SCHEDULES_BY_PERSON[id] || []).forEach((evt) => {
      events.push({ ...evt, personId: id, personName: name, personAccent: accent });
    });
  });
  return events;
}

// Pour le calendrier : quelles personnes ont cours chaque jour, et si la
// journée comporte un examen. Une seule passe sur les flux chargés.
export function getDayIndex(visiblePeople) {
  const index = new Map();
  PEOPLE.forEach(({ id, accent }) => {
    if (visiblePeople && visiblePeople[id] === false) return;
    (SCHEDULES_BY_PERSON[id] || []).forEach((evt) => {
      const key = formatLocalDate(new Date(evt.start));
      const entry = index.get(key) || { accents: [], exam: false };
      if (!entry.accents.includes(accent)) entry.accents.push(accent);
      if (isExamEvent(evt)) entry.exam = true;
      index.set(key, entry);
    });
  });
  return index;
}

// ── Compatibilité des journées ───────────────────────────────────────────────

// Tolérance d'écart entre deux journées pour les considérer "compatibles"
// (arrivée et départ à moins d'une heure d'écart : trajet commun possible).
export const MATCH_TOLERANCE_MIN = 60;

// Claire et Alban font le trajet ensemble : quand leurs journées coïncident,
// on annonce explicitement le covoiturage plutôt qu'une simple journée
// alignée. Les autres paires restent de simples compatibilités d'horaires.
const CARPOOL_PAIR = ['claire', 'alban'];

const isCarpoolPair = (a, b) => CARPOOL_PAIR.includes(a) && CARPOOL_PAIR.includes(b) && a !== b;

// Première arrivée et dernier départ d'une personne un jour donné, ou null si
// elle n'a pas cours ce jour-là.
export function getDayBounds(personId, dateStr) {
  let start = null;
  let end = null;
  (SCHEDULES_BY_PERSON[personId] || []).forEach((evt) => {
    if (evt.allDay) return;
    if (formatLocalDate(new Date(evt.start)) !== dateStr) return;
    const evtStart = new Date(evt.start);
    const evtEnd = new Date(evt.end || evt.start);
    if (!start || evtStart < start) start = evtStart;
    if (!end || evtEnd > end) end = evtEnd;
  });
  return start && end ? { start, end } : null;
}

// Paires de personnes (parmi celles affichées) présentes le même jour avec des
// horaires de début ET de fin proches à MATCH_TOLERANCE_MIN près. La paire
// Claire / Alban est signalée comme covoiturage possible.
export function getDayMatches(dateStr, visiblePeople) {
  const ids = PEOPLE.map((p) => p.id).filter((id) => !visiblePeople || visiblePeople[id] !== false);
  const matches = [];

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const a = getDayBounds(ids[i], dateStr);
      const b = getDayBounds(ids[j], dateStr);
      if (!a || !b) continue;

      const startDiffMin = Math.abs(a.start - b.start) / 60000;
      const endDiffMin = Math.abs(a.end - b.end) / 60000;
      if (startDiffMin <= MATCH_TOLERANCE_MIN && endDiffMin <= MATCH_TOLERANCE_MIN) {
        matches.push({
          carpool: isCarpoolPair(ids[i], ids[j]),
          ids: [ids[i], ids[j]],
          names: [getPerson(ids[i]).name, getPerson(ids[j]).name],
          accents: [getPerson(ids[i]).accent, getPerson(ids[j]).accent],
          startDiffMin: Math.round(startDiffMin),
          endDiffMin: Math.round(endDiffMin),
        });
      }
    }
  }
  return matches;
}
