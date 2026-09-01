import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from './GlassCard';
import { COLORS, RADIUS } from '../theme';

/**
 * Indicateur de compatibilité : deux personnes commencent et finissent leur
 * journée à moins d'une heure d'écart — journée alignée, trajet commun
 * envisageable.
 */
export default function MatchBanner({ matches, style }) {
  if (!matches || matches.length === 0) return null;

  return (
    <GlassCard style={[styles.card, style]}>
      <View style={styles.row}>
        <Ionicons name="sparkles-outline" size={18} color={COLORS.match} />
        <View style={{ flex: 1 }}>
          {matches.map((m) => (
            <View key={m.ids.join('-')}>
              <Text style={styles.text}>
                {m.names[0]} et {m.names[1]} ont une journée alignée
              </Text>
              <Text style={styles.detail}>
                {m.startDiffMin} min d'écart à l'arrivée · {m.endDiffMin} min au départ
              </Text>
            </View>
          ))}
        </View>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 12,
    backgroundColor: 'rgba(46, 204, 113, 0.08)',
    borderColor: 'rgba(46, 204, 113, 0.25)',
    borderRadius: RADIUS.md,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  text: { fontSize: 13, fontWeight: '800', color: COLORS.match },
  detail: { fontSize: 11, fontWeight: '600', color: COLORS.match, opacity: 0.75, marginTop: 1 },
});
