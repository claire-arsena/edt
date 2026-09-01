# Emplois du temps — Claire, Alban & Clara

Application web (React Native + Expo, export web statique) dont le seul but est
d'afficher côte à côte les emplois du temps universitaires de trois personnes.
Même pile technique que « Ma Liste », déploiement Render en site statique.

## Fonctionnement

Un flux iCal (`.ics`) par personne est téléchargé **au moment du build**, converti
en JSON et embarqué dans le bundle : à l'exécution, l'app ne fait aucun appel
réseau, elle lit `src/data/schedules/<prénom>.json`. Les emplois du temps sont
donc rafraîchis à chaque déploiement.

## Vues

| Largeur d'écran | Vue |
| --- | --- |
| < 900 px (mobile) | Timeline jour par jour, 8h → 23h, navigation jour précédent / suivant, cadre centré type application |
| ≥ 900 px (PC) | Semaine du lundi au vendredi en 5 colonnes, même plage horaire, navigation semaine par semaine, plein écran |

La vue est choisie à partir de la largeur de la fenêtre : ouverte depuis un PC,
l'app affiche directement la semaine, sans écran d'accueil intermédiaire.

- **Interrupteurs par personne** : afficher / masquer Claire, Alban ou Clara pour
  superposer ou isoler les emplois du temps (appui long sur un nom = n'afficher
  que cette personne). Le choix est mémorisé sur l'appareil.
- **Couleurs par cours** : la couleur d'un bloc vient d'un hash du code de cours
  (`S5.A&B.01`, `R5.A.L1`…), donc toutes les séances d'un même cours (CM, TD, TP)
  partagent la même couleur, identique en vue jour et en vue semaine. La pastille
  dans le coin du bloc indique, elle, à qui appartient le créneau.
- **Cours simultanés** : quand deux emplois du temps se chevauchent, les blocs se
  partagent la largeur au lieu de se recouvrir.
- **Enseignants** : les noms de profs sont extraits du champ `DESCRIPTION` du
  flux ADE (formats « DUPONT JEAN » et « M. Dupont » reconnus, codes de cours et
  libellés de groupe écartés) et affichés dans le bloc dès que sa hauteur le
  permet. Si aucun nom n'est reconnu, la première ligne utile de la description
  est affichée à la place.
- **Covoiturage Claire / Alban** : quand leurs deux journées commencent *et*
  finissent à moins d'une heure d'écart, un bandeau annonce « Covoiturage
  possible le <jour> <mois> » en vue jour, et une icône de voiture apparaît dans
  l'en-tête de colonne en vue semaine. Les autres paires (avec Clara) sont
  signalées comme simples « journées alignées ».
- **Thème sombre** : sombre par défaut, avec une bascule Sombre → Clair → Auto
  dans l'en-tête (« Auto » suit le réglage clair/sombre du système). Le choix est
  mémorisé, et la page est peinte dans la bonne couleur avant même le démarrage
  de React, donc sans flash blanc. Les couleurs de cours sont adoucies en thème
  sombre tout en gardant les mêmes teintes, pour rester reconnaissables sans
  éblouir.
- **Profil et accent** : le choix « Je suis Claire / Alban / Clara » est purement
  indicatif et la couleur d'accent (rose, bleu, vert) se change en un clic. Pas
  de code PIN : l'app se contente d'afficher des emplois du temps déjà publiés
  par l'université, un verrou n'y protégerait rien.

## Configurer les flux `.ics`

Les URL sont définies dans [`scripts/fetch-schedules.js`](scripts/fetch-schedules.js),
au format ADE :

```
https://.../anonymous_cal.jsp?projectId=X&resources=Y&calType=ical&firstDate=AAAA-MM-JJ&lastDate=AAAA-MM-JJ
```

Chacune peut être surchargée sans commit par une variable d'environnement (côté
Render : *Environment*), ce qui évite de republier le dépôt quand l'université
change les dates ou l'identifiant de ressource :

| Personne | Variable |
| --- | --- |
| Claire | `EDT_CLAIRE_ICS` |
| Alban  | `EDT_ALBAN_ICS` |
| Clara  | `EDT_CLARA_ICS` |

Le parser iCal est écrit à la main (RFC 5545 : dépliage des lignes, `VEVENT`,
`DTSTART`/`DTEND` avec ou sans heure, déséchappement du texte) — aucune
dépendance externe.

**Le build ne casse jamais sur un flux indisponible** : le JSON déjà présent dans
le dépôt est conservé et un diagnostic est écrit dans les logs (statut HTTP,
`Content-Type`, taille et aperçu de la réponse, nombre de `BEGIN:VEVENT`
réellement trouvés).

## Développement

```bash
npm install
npm run fetch-schedules   # récupère les .ics et écrit src/data/schedules/*.json
npm run web               # serveur de développement Expo
npm run build:web         # export statique complet dans dist/
```

`build:web` enchaîne : récupération des flux → génération des icônes (PNG
dessinés par `scripts/generate-icons.js`, sans dépendance ni binaire versionné)
→ `expo export --platform web` → `scripts/post-build.js` (manifest PWA, icônes
iOS, balises `index.html`).

## Déploiement Render

[`render.yaml`](render.yaml) décrit un site statique :

- build : `npm install && npm run build:web`
- dossier publié : `dist`
- auto-déploiement sur `main`
- réécriture `/*` → `/index.html`

## Structure

```
App.js                     Racine (contexte, cadre, écran unique)
scripts/fetch-schedules.js Téléchargement + parser iCal (build)
scripts/generate-icons.js  Génération des PNG (build)
scripts/post-build.js      Manifest PWA + balises iOS (build)
src/config/people.js       Les trois personnes et leurs couleurs
src/config/courseColors.js Palette et hash des codes de cours (clair + sombre)
src/config/schedules.js    Fusion des flux, covoiturage et journées alignées
src/theme.js               Palettes claire et sombre, accents, ombres
src/ctx/AppContext.jsx     Préférences (personnes, thème, mode, profil)
src/utils/planningTime.js  Plage horaire, positions, chevauchements
src/views/DayView.jsx      Timeline mobile
src/views/WeekView.jsx     Semaine PC
```
