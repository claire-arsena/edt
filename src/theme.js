// Palette iOS "glass" partagée par toute l'app : blanc cassé, jamais de blanc
// pur, ombres douces et bordures fines translucides.
export const COLORS = {
  // Fonds
  appBg:        '#e5e5ea', // Plan de travail derrière le cadre (visible sur PC)
  screenBg:     '#f2f2f7', // Fond de l'app
  card:         '#f8f9fc', // Carte blanc cassé
  cardBorder:   'rgba(0, 0, 0, 0.07)',
  hairline:     'rgba(0, 0, 0, 0.06)',

  // Accent principal (rose iOS profond) et variantes de thème
  pink:         '#d81b60',
  pinkDeep:     '#c2185b',
  blue:         '#1e88e5',
  green:        '#2ecc71',

  // Typographie
  text:         '#1c1c1e',
  textLight:    '#3c3c43',
  textMuted:    '#8e8e93',
  white:        '#ffffff',

  now:          '#e74c3c',
  match:        '#1a8f4e',
};

// Trois thèmes d'accent au choix : rose (défaut), bleu, vert.
export const THEMES = {
  rose: { key: 'rose', name: 'Rose', primary: COLORS.pink, deep: COLORS.pinkDeep, tint: 'rgba(216, 27, 96, 0.12)' },
  blue: { key: 'blue', name: 'Bleu', primary: COLORS.blue, deep: '#1565c0', tint: 'rgba(30, 136, 229, 0.12)' },
  green: { key: 'green', name: 'Vert', primary: COLORS.green, deep: '#27ae60', tint: 'rgba(46, 204, 113, 0.12)' },
};

export const SHADOWS = {
  // Ombre douce des cartes iOS
  glass: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 20,
    elevation: 6,
  },
  // Ombre resserrée des blocs de cours
  block: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
};

export const RADIUS = {
  sm:   10,
  md:   14,
  lg:   20,
  xl:   24,
  full: 999,
};

export const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
