// Les trois emplois du temps affichés par l'app. `accent` sert uniquement à
// identifier la personne (pastille, filtres, badges) : les blocs de cours,
// eux, sont colorés par cours et non par personne (voir courseColors.js).
export const PEOPLE = [
  { id: 'claire', name: 'Claire', accent: '#d81b60' },
  { id: 'alban',  name: 'Alban',  accent: '#1e88e5' },
  { id: 'clara',  name: 'Clara',  accent: '#8e24aa' },
];

export const getPerson = (id) => PEOPLE.find((p) => p.id === id) || null;
