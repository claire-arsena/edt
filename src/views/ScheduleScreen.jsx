import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../ctx/AppContext';
import { DESKTOP_BREAKPOINT } from '../config/constants';
import Header from '../components/Header';
import DayView from './DayView';
import WeekView from './WeekView';

/**
 * Écran unique de l'app : la largeur de la fenêtre décide de la vue affichée.
 * Depuis un PC (≥ 900 px), on arrive directement sur la semaine — aucun écran
 * d'accueil ni sélection préalable ne s'intercale.
 */
export default function ScheduleScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { isLoaded } = useAppTheme();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  // Le temps de relire les préférences (personnes affichées, thème), on ne
  // rend rien : évite un clignotement des filtres au premier affichage.
  if (!isLoaded) return <View style={styles.container} />;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header isDesktop={isDesktop} />
      {isDesktop ? <WeekView /> : <DayView />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
