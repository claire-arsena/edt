#!/usr/bin/env node
/**
 * Télécharge les emplois du temps universitaires (flux .ics ADE) de Claire,
 * Alban et Clara, les convertit en JSON exploitable par l'app
 * (src/data/schedules/<prenom>.json) et s'exécute avant chaque build web.
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

// URL type ADE :
// https://.../anonymous_cal.jsp?projectId=X&resources=Y&calType=ical&firstDate=...&lastDate=...
const SCHEDULE_SOURCES = {
  claire:
    process.env.EDT_CLAIRE_ICS ||
    'https://agenda-web-consult.univ-amu.fr/jsp/custom/modules/plannings/anonymous_cal.jsp?projectId=8&resources=42526&calType=ical&firstDate=2026-08-17&lastDate=2027-08-15',
  alban:
    process.env.EDT_ALBAN_ICS ||
    'https://agenda-web-consult.univ-amu.fr/jsp/custom/modules/plannings/anonymous_cal.jsp?projectId=8&resources=16173&calType=ical&firstDate=2026-08-17&lastDate=2027-08-15',
  // Idem pour Clara (EDT_CLARA_ICS).
  clara: process.env.EDT_CLARA_ICS || '',
};

const OUT_DIR = path.join(__dirname, '..', 'src', 'data', 'schedules');

// ── Parser iCalendar (RFC 5545) minimal ──────────────────────────────────────

// Dépliage des lignes : une ligne repliée continue sur la suivante, préfixée
// par une espace ou une tabulation (RFC 5545 §3.1).
function unfoldLines(raw) {
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = [];
  for (const line of normalized.split('\n')) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }
  return lines;
}

// Déséchappement des valeurs texte (RFC 5545 §3.3.11).
function unescapeText(value) {
  return (value || '')
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

// "DTSTART;TZID=Europe/Paris:20260901T080000" → nom, paramètres, valeur.
function parseProperty(line) {
  const colonIdx = line.indexOf(':');
  if (colonIdx === -1) return null;
  const rawKey = line.slice(0, colonIdx);
  const value = line.slice(colonIdx + 1);
  const [name, ...paramParts] = rawKey.split(';');
  const params = {};
  paramParts.forEach((p) => {
    const eqIdx = p.indexOf('=');
    if (eqIdx !== -1) params[p.slice(0, eqIdx).toUpperCase()] = p.slice(eqIdx + 1);
  });
  return { name: name.toUpperCase(), params, value };
}

function parseIcsDate(value, params) {
  // Journée entière : "VALUE=DATE:20260901".
  if (params.VALUE === 'DATE' || /^\d{8}$/.test(value)) {
    return {
      iso: `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T00:00:00`,
      allDay: true,
    };
  }
  const match = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (!match) return { iso: null, allDay: false };
  const [, y, mo, d, h, mi, s, z] = match;
  if (z) {
    // Horodatage UTC explicite : on garde le "Z", le navigateur affichera
    // l'heure locale de Paris.
    return { iso: `${y}-${mo}-${d}T${h}:${mi}:${s}Z`, allDay: false };
  }
  // Heure flottante ou TZID=Europe/Paris (cas courant d'un EDT français) :
  // on la traite comme heure murale locale.
  return { iso: `${y}-${mo}-${d}T${h}:${mi}:${s}`, allDay: false };
}

// ── Enseignants ──────────────────────────────────────────────────────────────

// Le champ DESCRIPTION d'un flux ADE empile plusieurs informations, une par
// ligne : intitulé du cours, groupe, enseignant(s), puis un pied de page
// d'export. On retire ce qui est déjà affiché ailleurs (titre, salle) ou sans
// intérêt, et on isole les lignes qui ressemblent à des noms d'enseignants.
const EXPORT_LINE = /^\(?\s*export/i;
const GROUP_LINE = /^(groupe|grp|gr\.|promo|semestre|s\d|cm\b|td\b|tp\b|ct\b)/i;

function cleanDescriptionLines(description, { title, location }) {
  return (description || '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !EXPORT_LINE.test(l))
    .filter((l) => l !== title && l !== location);
}

// Un enseignant est écrit en capitales dans ADE ("DUPONT JEAN"), ou sous la
// forme "M. Dupont" / "Mme Dupont". On accepte les deux et on écarte les
// lignes de groupe ou de code de cours.
function extractTeachers(lines) {
  return lines.filter((line) => {
    if (GROUP_LINE.test(line)) return false;
    // Un nom d'enseignant ne contient pas de chiffre : cela écarte les codes
    // de cours et les libellés de groupe ("GA1 TD1", "S5.A&B.01"…).
    if (/\d/.test(line)) return false;
    if (/^(M\.|Mme|Mlle|Mr)\s+\S/i.test(line)) return true;

    const letters = line.replace(/[^\p{L}]/gu, '');
    if (letters.length < 3) return false;
    const uppercase = [...letters].filter((c) => c === c.toUpperCase() && c !== c.toLowerCase()).length;
    return uppercase / letters.length > 0.7;
  });
}

function parseIcs(raw) {
  const lines = unfoldLines(raw);
  const events = [];
  let current = null;

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {};
      continue;
    }
    if (line === 'END:VEVENT') {
      if (current && current.start) events.push(current);
      current = null;
      continue;
    }
    if (!current) continue;

    const prop = parseProperty(line);
    if (!prop) continue;

    switch (prop.name) {
      case 'UID':
        current.uid = prop.value;
        break;
      case 'SUMMARY':
        current.title = unescapeText(prop.value);
        break;
      case 'LOCATION':
        current.location = unescapeText(prop.value);
        break;
      case 'DESCRIPTION':
        current.description = unescapeText(prop.value);
        break;
      case 'DTSTART': {
        const { iso, allDay } = parseIcsDate(prop.value, prop.params);
        current.start = iso;
        current.allDay = allDay;
        break;
      }
      case 'DTEND': {
        const { iso } = parseIcsDate(prop.value, prop.params);
        current.end = iso;
        break;
      }
      default:
        break;
    }
  }

  events.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  return events.map((e, i) => {
    const title = e.title || 'Cours';
    const location = e.location || '';
    const details = cleanDescriptionLines(e.description, { title, location });
    const teachers = extractTeachers(details);
    return {
      id: e.uid || `evt-${i}`,
      title,
      location,
      // Enseignants isolés pour l'affichage ; `details` conserve le reste de
      // la description (groupe, précisions) si aucun nom n'est reconnu.
      teachers,
      details,
      description: e.description || '',
      start: e.start,
      end: e.end || e.start,
      allDay: !!e.allDay,
    };
  });
}

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
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  console.log('📅  Récupération des emplois du temps universitaires…\n');
  for (const [personId, url] of Object.entries(SCHEDULE_SOURCES)) {
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

module.exports = { parseIcs, unfoldLines, unescapeText, parseIcsDate };
