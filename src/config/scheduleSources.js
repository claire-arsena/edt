/**
 * Flux .ics de chaque personne, au format ADE :
 *   https://.../anonymous_cal.jsp?projectId=X&resources=Y&calType=ical&firstDate=…&lastDate=…
 *
 * Ces adresses servent deux fois : au build (scripts/fetch-schedules.js, qui
 * fige un instantané dans le bundle) et au lancement de l'app, qui rappelle
 * les flux pour repartir de données fraîches. En CommonJS pour être lisible
 * par Node comme par Metro.
 */
const SCHEDULE_SOURCES = {
  claire:
    'https://agenda-web-consult.univ-amu.fr/jsp/custom/modules/plannings/anonymous_cal.jsp?projectId=8&resources=42526&calType=ical&firstDate=2026-08-17&lastDate=2027-08-15',
  alban:
    'https://agenda-web-consult.univ-amu.fr/jsp/custom/modules/plannings/anonymous_cal.jsp?projectId=8&resources=16173&calType=ical&firstDate=2026-08-17&lastDate=2027-08-15',
  // Flux de Clara à renseigner (ou variable EDT_CLARA_ICS côté Render).
  clara: '',
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

module.exports = { SCHEDULE_SOURCES, resolveSource };
