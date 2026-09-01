import React, { createContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PEOPLE, getPerson } from '../config/people';
import { THEMES } from '../theme';

const VISIBLE_KEY = '@edt_visible_people_v1';
const THEME_KEY = '@edt_theme_v1';
const PROFILE_KEY = '@edt_profile_v1';

const ALL_VISIBLE = PEOPLE.reduce((acc, p) => ({ ...acc, [p.id]: true }), {});

export const AppContext = createContext(null);

export function AppContextProvider({ children }) {
  // Par défaut les trois emplois du temps sont superposés : l'app s'ouvre
  // directement sur la vue planning, sans écran d'accueil intermédiaire.
  const [visiblePeople, setVisiblePeople] = useState(ALL_VISIBLE);
  const [themeKey, setThemeKey] = useState('rose');
  const [profileId, setProfileId] = useState(null); // "qui consulte" — purement indicatif
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [savedVisible, savedTheme, savedProfile] = await Promise.all([
          AsyncStorage.getItem(VISIBLE_KEY),
          AsyncStorage.getItem(THEME_KEY),
          AsyncStorage.getItem(PROFILE_KEY),
        ]);
        if (savedVisible) setVisiblePeople({ ...ALL_VISIBLE, ...JSON.parse(savedVisible) });
        if (savedTheme && THEMES[savedTheme]) setThemeKey(savedTheme);
        if (savedProfile && getPerson(savedProfile)) setProfileId(savedProfile);
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

  // "N'afficher que…" : un appui long / raccourci pour isoler un emploi du
  // temps sans décocher les deux autres un par un.
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
      theme: THEMES[themeKey] || THEMES.rose,
      changeTheme,
      profileId,
      profile: getPerson(profileId),
      chooseProfile,
      isLoaded,
    }),
    [visiblePeople, themeKey, profileId, isLoaded]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
