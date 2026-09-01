import React from 'react';
import { StyleSheet, View } from 'react-native';
import { COLORS, RADIUS, SHADOWS } from '../theme';

/** Carte iOS blanc cassé : coins très arrondis, ombre douce, bordure fine. */
export default function GlassCard({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    overflow: 'hidden',
    ...SHADOWS.glass,
  },
});
