import React, { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useAppTheme } from '../ctx/AppContext';
import { DESKTOP_BREAKPOINT, MOBILE_FRAME_WIDTH } from '../config/constants';

/**
 * Sur mobile, l'app garde une présentation compacte type application (cadre
 * centré, largeur plafonnée). Sur PC, elle remplit tout l'écran : pas de
 * "cadre téléphone" étiré au milieu d'un grand écran.
 */
export default function Background({ children }) {
  const { width } = useWindowDimensions();
  const { palette, isDark } = useAppTheme();
  const isDesktop = width >= DESKTOP_BREAKPOINT;
  const styles = useMemo(() => createStyles(palette, isDark), [palette, isDark]);

  return (
    <View style={styles.outer}>
      <View style={[styles.frame, isDesktop && styles.frameDesktop]}>{children}</View>
    </View>
  );
}

const createStyles = (p, isDark) =>
  StyleSheet.create({
    outer: {
      flex: 1,
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: p.appBg,
    },
    frame: {
      flex: 1,
      width: '100%',
      maxWidth: MOBILE_FRAME_WIDTH,
      backgroundColor: p.screenBg,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: isDark ? 0.5 : 0.08,
      shadowRadius: 24,
      elevation: 8,
    },
    frameDesktop: {
      maxWidth: '100%',
      shadowOpacity: 0,
      elevation: 0,
    },
  });
