import AsyncStorage from '@react-native-async-storage/async-storage';
import { SCHEDULE_SOURCES } from '../config/scheduleSources';
import { parseIcs } from '../utils/icsParser';
import { setSchedule } from '../config/schedules';

const CACHE_KEY = '@edt_schedules_cache_v1';

/**
 * Rappelle les flux .ics au lancement de l'app, pour ne pas dépendre de la
 * fraîcheur du dernier déploiement.
 *
 * Trois sources, par ordre de préférence :
 *   1. le flux de l'université, rappelé maintenant ;
 *   2. la dernière réponse réussie, gardée sur l'appareil — c'est elle qui
 *      évite qu'un emploi du temps disparaisse parce qu'un build s'est fait
 *      éconduire par le serveur de l'université ;
 *   3. l'instantané figé dans le bundle au moment du build.
 */

// Réinjecte le cache local : l'app affiche des données avant même la réponse
// du réseau. Renvoie la date de la dernière synchronisation réussie.
export async function loadCachedSchedules() {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    Object.entries(cache.schedules || {}).forEach(([personId, events]) => {
      if (Array.isArray(events) && events.length > 0) setSchedule(personId, events);
    });
    return cache.syncedAt || null;
  } catch (e) {
    console.warn('Cache des emplois du temps illisible.', e);
    return null;
  }
}

async function fetchPerson(url) {
  // `no-store` : sans cela le navigateur peut resservir sa copie, et l'app
  // afficherait un emploi du temps périmé en croyant l'avoir actualisé.
  //
  // Aucun en-tête ajouté volontairement : un simple `Accept` suffirait à faire
  // de l'appel une requête « préalable » (OPTIONS), que les serveurs ADE ne
  // savent en général pas traiter.
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const events = parseIcs(await res.text());
  if (events.length === 0) throw new Error('0 créneau dans la réponse');
  return events;
}

/**
 * Récupère tous les flux configurés. Chaque personne est traitée séparément :
 * un flux muet n'empêche pas les autres de s'actualiser, et les données déjà
 * chargées restent affichées.
 */
export async function refreshSchedules() {
  const entries = Object.entries(SCHEDULE_SOURCES).filter(([, url]) => !!url);
  if (entries.length === 0) return { syncedAt: null, results: [] };

  const results = await Promise.all(
    entries.map(async ([personId, url]) => {
      try {
        const events = await fetchPerson(url);
        setSchedule(personId, events);
        return { personId, ok: true, count: events.length, events };
      } catch (e) {
        console.warn(`Flux de ${personId} injoignable (${e.message}).`);
        return { personId, ok: false, error: e.message };
      }
    })
  );

  const fresh = results.filter((r) => r.ok);
  if (fresh.length === 0) return { syncedAt: null, results };

  // Le cache est complété, jamais remplacé : un flux en échec aujourd'hui
  // garde la copie réussie d'hier.
  let previous = {};
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) previous = JSON.parse(raw).schedules || {};
  } catch (e) {
    previous = {};
  }

  const schedules = { ...previous };
  fresh.forEach(({ personId, events }) => {
    schedules[personId] = events;
  });

  const syncedAt = new Date().toISOString();
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ syncedAt, schedules }));
  } catch (e) {
    console.warn('Cache des emplois du temps non enregistré.', e);
  }

  return { syncedAt, results };
}
