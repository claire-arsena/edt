// Deux palettes complètes — claire et sombre — partageant la même structure :
// les composants lisent la palette active via `useAppTheme()` et n'ont donc
// aucune couleur en dur.

const LIGHT = {
  // Fonds
  appBg:      '#e5e5ea', // Plan de travail derrière le cadre (visible sur PC)
  screenBg:   '#f2f2f7', // Fond de l'app
  card:       '#f8f9fc', // Carte blanc cassé (jamais de blanc pur)
  cardSoft:   'rgba(255,255,255,0.5)',
  cardBorder: 'rgba(0, 0, 0, 0.07)',
  hairline:   'rgba(0, 0, 0, 0.06)',

  // Typographie
  text:       '#1c1c1e',
  textLight:  '#3c3c43',
  textMuted:  '#8e8e93',
  onColor:    '#ffffff',       // Texte posé sur un bloc de cours
  onColorSoft: 'rgba(255,255,255,0.92)',

  now:        '#e74c3c',
  match:      '#1a8f4e',
  matchBg:    'rgba(46, 204, 113, 0.08)',
  matchBorder: 'rgba(46, 204, 113, 0.25)',
};

const DARK = {
  // Gris très sombres plutôt que du noir pur : moins de halo autour des
  // cartes, et les blocs de cours colorés restent lisibles sans éblouir.
  appBg:      '#0b0b0d',
  screenBg:   '#121215',
  card:       '#1c1c20',
  cardSoft:   'rgba(255,255,255,0.04)',
  cardBorder: 'rgba(255, 255, 255, 0.09)',
  hairline:   'rgba(255, 255, 255, 0.08)',

  text:       '#f2f2f7',
  textLight:  '#d1d1d6',
  textMuted:  '#8e8e93',
  onColor:    'rgba(255,255,255,0.95)',
  onColorSoft: 'rgba(255,255,255,0.82)',

  now:        '#ff6b5e',
  match:      '#3ddc84',
  matchBg:    'rgba(61, 220, 132, 0.10)',
  matchBorder: 'rgba(61, 220, 132, 0.28)',
};

export const PALETTES = { light: LIGHT, dark: DARK };

// Couleurs d'accent : la variante sombre est éclaircie pour garder un
// contraste suffisant sur fond foncé.
export const THEMES = {
  rose: {
    key: 'rose',
    name: 'Rose',
    light: { primary: '#d81b60', deep: '#c2185b', tint: 'rgba(216, 27, 96, 0.12)' },
    dark:  { primary: '#ff5c8a', deep: '#ff85a8', tint: 'rgba(255, 92, 138, 0.18)' },
  },
  blue: {
    key: 'blue',
    name: 'Bleu',
    light: { primary: '#1e88e5', deep: '#1565c0', tint: 'rgba(30, 136, 229, 0.12)' },
    dark:  { primary: '#5cb2ff', deep: '#8cc8ff', tint: 'rgba(92, 178, 255, 0.18)' },
  },
  green: {
    key: 'green',
    name: 'Vert',
    light: { primary: '#2ecc71', deep: '#27ae60', tint: 'rgba(46, 204, 113, 0.12)' },
    dark:  { primary: '#3ddc84', deep: '#6ae8a5', tint: 'rgba(61, 220, 132, 0.18)' },
  },
};

export const getPalette = (isDark) => (isDark ? DARK : LIGHT);

export const getTheme = (key, isDark) => {
  const theme = THEMES[key] || THEMES.rose;
  const variant = isDark ? theme.dark : theme.light;
  return { key: theme.key, name: theme.name, ...variant };
};

// Ombres iOS : douces et diffuses en clair, plus denses et discrètes en
// sombre (une ombre claire n'existe pas sur fond foncé, elle sert surtout à
// détacher légèrement les blocs).
export const getShadows = (isDark) => ({
  glass: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: isDark ? 0.4 : 0.14,
    shadowRadius: 20,
    elevation: 6,
  },
  block: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.35 : 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
});

export const RADIUS = {
  sm:   10,
  md:   14,
  lg:   20,
  xl:   24,
  full: 999,
};
