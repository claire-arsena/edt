// Constantes et helpers de positionnement temporel partagés par la timeline
// mobile (DayView) et la vue semaine PC (WeekView), pour que les deux vues
// placent les créneaux exactement de la même façon.
export const HOUR_HEIGHT = 56;
export const START_HOUR = 8;
export const END_HOUR = 23;
export const TOTAL_HOURS = END_HOUR - START_HOUR;
export const GRID_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT;

export const formatLocalDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const formatHM = (iso) => {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

export const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};

// Lundi de la semaine contenant `d` (les semaines affichées vont du lundi au
// vendredi).
export const getMonday = (d) => {
  const date = new Date(d);
  const day = date.getDay(); // 0 = dimanche
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  date.setHours(0, 0, 0, 0);
  return date;
};

// Position verticale d'un créneau dans la grille, bornée à la plage affichée
// (8h–23h) pour qu'un cours qui déborde reste visible et cliquable.
export const getPosition = (startH, startM, endH, endM, hourHeight = HOUR_HEIGHT) => {
  const rawTop = (startH - START_HOUR) * hourHeight + (startM / 60) * hourHeight;
  const rawBottom = (endH - START_HOUR) * hourHeight + (endM / 60) * hourHeight;
  const gridHeight = TOTAL_HOURS * hourHeight;
  const top = Math.min(Math.max(0, rawTop), gridHeight - 24);
  const bottom = Math.min(Math.max(rawBottom, top + 24), gridHeight);
  return { top, height: bottom - top };
};

export const getEventPosition = (evt, hourHeight = HOUR_HEIGHT) => {
  const s = new Date(evt.start);
  const e = new Date(evt.end || evt.start);
  return getPosition(s.getHours(), s.getMinutes(), e.getHours(), e.getMinutes(), hourHeight);
};

// Répartit les créneaux qui se chevauchent en colonnes côte à côte : quand
// deux emplois du temps sont superposés, les cours simultanés se partagent la
// largeur au lieu de se recouvrir. Renvoie chaque événement enrichi de
// { lane, laneCount }.
export function layoutOverlaps(events) {
  const sorted = [...events].sort(
    (a, b) => new Date(a.start) - new Date(b.start) || new Date(a.end) - new Date(b.end)
  );

  const out = [];
  let cluster = [];      // événements qui se chevauchent en chaîne
  let clusterEnd = null; // fin la plus tardive du cluster courant

  // Attribution gloutonne : chaque événement prend la première colonne libre.
  const flush = () => {
    const laneEnds = [];
    cluster.forEach((evt) => {
      const start = new Date(evt.start);
      const end = new Date(evt.end || evt.start);
      let lane = laneEnds.findIndex((laneEnd) => laneEnd <= start);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(end);
      } else {
        laneEnds[lane] = end;
      }
      evt.__lane = lane;
    });
    cluster.forEach((evt) => {
      out.push({ ...evt, lane: evt.__lane, laneCount: laneEnds.length });
      delete evt.__lane;
    });
    cluster = [];
    clusterEnd = null;
  };

  sorted.forEach((evt) => {
    const start = new Date(evt.start);
    const end = new Date(evt.end || evt.start);
    if (cluster.length > 0 && start >= clusterEnd) flush();
    cluster.push(evt);
    clusterEnd = clusterEnd && clusterEnd > end ? clusterEnd : end;
  });
  if (cluster.length > 0) flush();

  return out;
}
