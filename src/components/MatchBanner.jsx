import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from './GlassCard';
import { useAppTheme } from '../ctx/AppContext';
import { RADIUS } from '../theme';

/**
 * Indicateur de compatibilité : deux personnes commencent et finissent leur
 * journée à moins d'une heure d'écart. Pour Claire et Alban, qui font le
 * trajet ensemble, le bandeau annonce directement le covoiturage et la date.
 */
export default function MatchBanner({ matches, dateLabel, style, compact = false }) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  if (!matches || matches.length === 0) return null;

  const hasCarpool = matches.some((m) => m.carpool);

  return (
    <GlassCard style={[styles.card, compact && styles.cardCompact, style]}>
      <View style={styles.row}>
        <Ionicons
          name={hasCarpool ? 'car-sport-outline' : 'sparkles-outline'}
          size={compact ? 16 : 20}
          color={palette.match}
        />
        <View style={{ flex: 1 }}>
          {matches.map((m) => (
            <View key={m.ids.join('-')} style={styles.item}>
              <Text style={[styles.text, compact && styles.textCompact]} numberOfLines={compact ? 1 : 2}>
                {m.carpool
                  ? `Covoiturage possible le ${dateLabel}`
                  : `${m.names[0]} et ${m.names[1]} ont une journée alignée`}
              </Text>
              {/* Le détail des écarts n'est affiché que là où la place ne
                  manque pas ; sur mobile, la fiche du cours suffit. */}
              {!compact && (
                <Text style={styles.detail}>
                  {m.carpool ? `${m.names[0]} et ${m.names[1]} · ` : ''}
                  {m.startDiffMin} min d'écart à l'arrivée · {m.endDiffMin} min au départ
                </Text>
              )}
            </View>
          ))}
        </View>
      </View>
    </GlassCard>
  );
}

const createStyles = (p) =>
  StyleSheet.create({
    card: {
      padding: 12,
      backgroundColor: p.matchBg,
      borderColor: p.matchBorder,
      borderRadius: RADIUS.md,
    },
    cardCompact: { paddingVertical: 7, paddingHorizontal: 10 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    item: { marginBottom: 2 },
    text: { fontSize: 13, fontWeight: '800', color: p.match },
    textCompact: { fontSize: 12 },
    detail: { fontSize: 11, fontWeight: '600', color: p.match, opacity: 0.75, marginTop: 1 },
  });
