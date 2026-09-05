import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PEOPLE, getPerson } from '../config/people';
import { THEMES, getPalette, getShadows, getTheme } from '../theme';

const VISIBLE_KEY = '@edt_visible_people_v1';
const THEME_KEY = '@edt_theme_v1';
const MODE_KEY = '@edt_mode_v1';
const PROFILE_KEY = '@edt_profile_v1';
const VIEW_KEY = '@edt_view_v1';

const ALL_VISIBLE = PEOPLE.reduce((acc, p) => ({ ...acc, [p.id]: true }), {});

// 'auto' suit le réglage clair/sombre du système ; 'light' et 'dark' le forcent.
export const MODES = ['auto', 'light', 'dark'];
const DEFAULT_MODE = 'dark';

export const AppContext = createContext(null);

export const useAppTheme = () => useContext(AppContext);

export function AppContextProvider({ children }) {
  // Par défaut les trois emplois du temps sont superposés : l'app s'ouvre
  // directement sur la vue planning, sans écran d'accueil intermédiaire.
  const [visiblePeople, setVisiblePeople] = useState(ALL_VISIBLE);
  const [themeKey, setThemeKey] = useState('rose');
  const [mode, setMode] = useState(DEFAULT_MODE);
  const [profileId, setProfileId] = useState(null); // "qui consulte" — purement indicatif
  // 'day' | 'week' | null : tant que rien n'a été choisi, la vue par défaut
  // découle de la largeur de l'écran (semaine sur PC, jour sur mobile).
  const [viewMode, setViewMode] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const systemScheme = useColorScheme();
  const isDark = mode === 'auto' ? systemScheme === 'dark' : mode === 'dark';

  useEffect(() => {
    (async () => {
      try {
        const [savedVisible, savedTheme, savedMode, savedProfile, savedView] = await Promise.all([
          AsyncStorage.getItem(VISIBLE_KEY),
          AsyncStorage.getItem(THEME_KEY),
          AsyncStorage.getItem(MODE_KEY),
          AsyncStorage.getItem(PROFILE_KEY),
          AsyncStorage.getItem(VIEW_KEY),
        ]);
        if (savedVisible) setVisiblePeople({ ...ALL_VISIBLE, ...JSON.parse(savedVisible) });
        if (savedTheme && THEMES[savedTheme]) setThemeKey(savedTheme);
        if (savedMode && MODES.includes(savedMode)) setMode(savedMode);
        if (savedProfile && getPerson(savedProfile)) setProfileId(savedProfile);
        if (savedView === 'day' || savedView === 'week') setViewMode(savedView);
      } catch (e) {
        console.warn('Préférences illisibles, valeurs par défaut utilisées.', e);
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  const togglePerson = (personId) => {
    setVisiblePeople((prev) => {
      const next = { ...prev, [personId]: !prev[personId] };
      AsyncStorage.setItem(VISIBLE_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  };

  // "N'afficher que…" : un appui long pour isoler un emploi du temps sans
  // décocher les deux autres un par un.
  const showOnly = (personId) => {
    const next = PEOPLE.reduce((acc, p) => ({ ...acc, [p.id]: p.id === personId }), {});
    setVisiblePeople(next);
    AsyncStorage.setItem(VISIBLE_KEY, JSON.stringify(next)).catch(() => {});
  };

  const showAll = () => {
    setVisiblePeople(ALL_VISIBLE);
    AsyncStorage.setItem(VISIBLE_KEY, JSON.stringify(ALL_VISIBLE)).catch(() => {});
  };

  const changeTheme = (key) => {
    if (!THEMES[key]) return;
    setThemeKey(key);
    AsyncStorage.setItem(THEME_KEY, key).catch(() => {});
  };

  // Bascule Sombre → Clair → Auto en un seul bouton.
  const cycleMode = () => {
    const next = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
    setMode(next);
    AsyncStorage.setItem(MODE_KEY, next).catch(() => {});
  };

  const chooseView = (next) => {
    if (next !== 'day' && next !== 'week') return;
    setViewMode(next);
    AsyncStorage.setItem(VIEW_KEY, next).catch(() => {});
  };

  const chooseProfile = (personId) => {
    const next = profileId === personId ? null : personId;
    setProfileId(next);
    if (next) AsyncStorage.setItem(PROFILE_KEY, next).catch(() => {});
    else AsyncStorage.removeItem(PROFILE_KEY).catch(() => {});
  };

  const value = useMemo(
    () => ({
      people: PEOPLE,
      visiblePeople,
      togglePerson,
      showOnly,
      showAll,
      themeKey,
      theme: getTheme(themeKey, isDark),
      changeTheme,
      mode,
      cycleMode,
      isDark,
      palette: getPalette(isDark),
      shadows: getShadows(isDark),
      profileId,
      profile: getPerson(profileId),
      chooseProfile,
      viewMode,
      chooseView,
      isLoaded,
    }),
    [visiblePeople, themeKey, mode, isDark, profileId, viewMode, isLoaded]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
