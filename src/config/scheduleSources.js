/**
 * Flux .ics de chaque personne, au format ADE :
 *   https://.../anonymous_cal.jsp?projectId=X&resources=Y&calType=ical&firstDate=…&lastDate=…
 *
 * Ces adresses servent deux fois : au build (scripts/fetch-schedules.js, qui
 * fige un instantané dans le bundle) et au lancement de l'app, qui rappelle
 * les flux pour repartir de données fraîches. En CommonJS pour être lisible
 * par Node comme par Metro.
 *
 * Une personne peut aussi être alimentée par des fichiers .ics versionnés
 * plutôt que par un flux : ils sont alors lus et fusionnés au build, et rien
 * n'est rappelé au lancement puisqu'il n'y a pas d'adresse à interroger.
 */
const SCHEDULE_SOURCES = {
  claire:
    'https://agenda-web-consult.univ-amu.fr/jsp/custom/modules/plannings/anonymous_cal.jsp?projectId=8&resources=42526&calType=ical&firstDate=2026-08-17&lastDate=2027-08-15',
  alban:
    'https://agenda-web-consult.univ-amu.fr/jsp/custom/modules/plannings/anonymous_cal.jsp?projectId=8&resources=16173&calType=ical&firstDate=2026-08-17&lastDate=2027-08-15',
  // Clara : pas de flux, ses deux exports .ics sont versionnés (voir
  // LOCAL_SOURCES) et fusionnés au build.
  clara: '',
};

// Emplois du temps fournis sous forme de fichiers plutôt que de flux. Les
// fichiers d'une même personne sont fusionnés, les créneaux partagés entre
// deux exports n'étant comptés qu'une fois.
const LOCAL_SOURCES = {
  clara: ['clara/m1-grh.ics', 'clara/option-conseil.ics'],
};

// Au build seulement : une variable d'environnement prend le pas sur l'adresse
// ci-dessus, ce qui permet de corriger un flux sans commit.
function resolveSource(personId) {
  const fromEnv =
    typeof process !== 'undefined' && process.env
      ? process.env[`EDT_${personId.toUpperCase()}_ICS`]
      : null;
  return fromEnv || SCHEDULE_SOURCES[personId] || '';
}

module.exports = { SCHEDULE_SOURCES, LOCAL_SOURCES, resolveSource };
