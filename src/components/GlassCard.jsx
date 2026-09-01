import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useAppTheme } from '../ctx/AppContext';
import { RADIUS } from '../theme';

/**
 * Carte iOS : coins très arrondis, ombre douce, bordure fine translucide.
 * Blanc cassé en thème clair, gris très sombre en thème sombre.
 */
export default function GlassCard({ children, style }) {
  const { palette, shadows } = useAppTheme();
  const styles = useMemo(() => createStyles(palette, shadows), [palette, shadows]);
  return <View style={[styles.card, style]}>{children}</View>;
}

const createStyles = (p, shadows) =>
  StyleSheet.create({
    card: {
      backgroundColor: p.card,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: p.cardBorder,
      overflow: 'hidden',
      ...shadows.glass,
    },
  });
