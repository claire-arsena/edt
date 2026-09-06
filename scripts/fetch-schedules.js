#!/usr/bin/env node
/**
 * Télécharge les emplois du temps universitaires (flux .ics ADE) de Claire,
 * Alban et Clara et les fige dans src/data/schedules/<prenom>.json, embarqué
 * dans le bundle. Cet instantané sert de point de départ : l'app rappelle
 * ensuite les mêmes flux à chaque lancement (src/services/scheduleSync.js)
 * pour repartir de données fraîches.
 *
 * Règle d'or : ce script ne doit JAMAIS casser le build. Si un flux est
 * injoignable ou renvoie une réponse inattendue, on conserve le fichier JSON
 * déjà présent dans le dépôt (l'emploi du temps affiché en production reste
 * celui du dernier build réussi) et on écrit un diagnostic lisible dans les
 * logs Render : statut HTTP, Content-Type, aperçu du corps de la réponse et
 * nombre de "BEGIN:VEVENT" réellement trouvés.
 *
 * Les URL peuvent être surchargées sans commit via les variables
 * d'environnement EDT_CLAIRE_ICS / EDT_ALBAN_ICS / EDT_CLARA_ICS (Render →
 * Environment), ce qui évite de republier le dépôt quand l'université change
 * les dates de l'année universitaire ou l'identifiant de ressource.
 */

const fs = require('fs');
const path = require('path');

const { SCHEDULE_SOURCES, resolveSource } = require('../src/config/scheduleSources');

// Adresses effectives de ce build (variables d'environnement comprises).
const BUILD_SOURCES = Object.fromEntries(
  Object.keys(SCHEDULE_SOURCES).map((personId) => [personId, resolveSource(personId)])
);

const OUT_DIR = path.join(__dirname, '..', 'src', 'data', 'schedules');

const { parseIcs } = require('../src/utils/icsParser');

// ── Récupération ─────────────────────────────────────────────────────────────

function logDiagnostic(personId, { status, contentType, raw }) {
  const veventCount = (raw.match(/BEGIN:VEVENT/g) || []).length;
  console.log(
    `   ↳ Diagnostic ${personId} : HTTP ${status}, Content-Type: ${contentType}, ` +
      `taille ${raw.length} octets, ${veventCount} "BEGIN:VEVENT" trouvés dans la réponse brute.`
  );
  console.log(`   ↳ Aperçu des 300 premiers caractères :\n${raw.slice(0, 300).replace(/\n/g, '\\n')}`);
}

function keepExisting(personId, reason) {
  const outPath = path.join(OUT_DIR, `${personId}.json`);
  const exists = fs.existsSync(outPath);
  console.warn(
    `⚠️  Emploi du temps de ${personId} non mis à jour (${reason}). ` +
      (exists ? 'Fichier existant conservé.' : 'Création d\'un fichier vide.')
  );
  if (!exists) fs.writeFileSync(outPath, '[]\n');
}

async function fetchSchedule(personId, url) {
  if (!url) {
    keepExisting(personId, 'aucune URL .ics configurée');
    return;
  }

  let res;
  let raw = '';
  try {
    res = await fetch(url, { headers: { Accept: 'text/calendar' } });
    raw = await res.text();
  } catch (e) {
    keepExisting(personId, `échec réseau : ${e.message}`);
    return;
  }

  const contentType = res.headers.get('content-type') || '(inconnu)';

  if (!res.ok) {
    logDiagnostic(personId, { status: res.status, contentType, raw });
    keepExisting(personId, `HTTP ${res.status}`);
    return;
  }

  let events;
  try {
    events = parseIcs(raw);
  } catch (e) {
    logDiagnostic(personId, { status: res.status, contentType, raw });
    keepExisting(personId, `parsing impossible : ${e.message}`);
    return;
  }

  if (events.length === 0) {
    // Réponse HTTP 200 mais aucun créneau : page d'erreur déguisée, mauvais
    // identifiant de ressource, plage de dates vide… Le diagnostic permet de
    // trancher sans avoir à rejouer la requête à la main.
    logDiagnostic(personId, { status: res.status, contentType, raw });
    keepExisting(personId, '0 créneau dans la réponse');
    return;
  }

  fs.writeFileSync(path.join(OUT_DIR, `${personId}.json`), `${JSON.stringify(events, null, 2)}\n`);
  console.log(`✅  Emploi du temps de ${personId} mis à jour (${events.length} créneaux).`);

  // Aperçu du format des intitulés : c'est de lui que l'app déduit le code
  // d'UE (donc la couleur du cours). Le voir dans les logs de build évite de
  // deviner comment l'université nomme les créneaux.
  const titles = [...new Set(events.map((e) => e.title))];
  console.log(`   ↳ ${titles.length} intitulés distincts, par exemple :`);
  titles.slice(0, 5).forEach((t) => console.log(`      · ${t}`));
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log('📅  Récupération des emplois du temps universitaires…\n');
  for (const [personId, url] of Object.entries(BUILD_SOURCES)) {
    try {
      await fetchSchedule(personId, url);
    } catch (e) {
      // Filet de sécurité : quoi qu'il arrive, le build continue.
      keepExisting(personId, `erreur inattendue : ${e.message}`);
    }
  }
  console.log('\n🎉  Emplois du temps synchronisés.');
}

if (require.main === module) {
  main().catch((e) => {
    console.warn(`⚠️  Synchronisation des emplois du temps interrompue (${e.message}). Build poursuivi.`);
  });
}

module.exports = { parseIcs };
