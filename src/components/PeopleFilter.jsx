import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../ctx/AppContext';
import GlassCard from './GlassCard';
import { RADIUS } from '../theme';

/**
 * Interrupteurs afficher / masquer par personne : on superpose les trois
 * emplois du temps ou on en isole un seul sur la même vue. La pastille de
 * couleur rappelle à qui appartient un créneau (les blocs de cours, eux, sont
 * colorés par matière).
 */
export default function PeopleFilter({ style, compact = false }) {
  const { people, visiblePeople, togglePerson, showOnly, showAll, palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const visibleCount = people.filter((p) => visiblePeople[p.id]).length;

  return (
    <GlassCard style={[styles.card, compact && styles.cardCompact, style]}>
      <View style={styles.row}>
        {people.map((p) => {
          const on = !!visiblePeople[p.id];
          return (
            <TouchableOpacity
              key={p.id}
              onPress={() => togglePerson(p.id)}
              onLongPress={() => showOnly(p.id)}
              delayLongPress={300}
              style={[
                styles.chip,
                compact && styles.chipCompact,
                on && { backgroundColor: `${p.accent}26`, borderColor: p.accent },
              ]}
            >
              <View style={[styles.dot, { backgroundColor: on ? p.accent : palette.textMuted }]} />
              <Text
                style={[styles.chipText, compact && styles.chipTextCompact, on && { color: p.accent }]}
                numberOfLines={1}
              >
                {p.name}
              </Text>
              <Ionicons
                name={on ? 'eye-outline' : 'eye-off-outline'}
                size={14}
                color={on ? p.accent : palette.textMuted}
              />
            </TouchableOpacity>
          );
        })}
      </View>

      {visibleCount < people.length && !compact && (
        <TouchableOpacity onPress={showAll} style={styles.resetBtn}>
          <Text style={styles.resetText}>Tout afficher</Text>
        </TouchableOpacity>
      )}
    </GlassCard>
  );
}

const createStyles = (p) =>
  StyleSheet.create({
    card: { padding: 10 },
    cardCompact: { paddingVertical: 6, paddingHorizontal: 8 },
    row: { flexDirection: 'row', gap: 8, justifyContent: 'center', flexWrap: 'wrap' },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: RADIUS.full,
      borderWidth: 1,
      borderColor: p.cardBorder,
      backgroundColor: p.cardSoft,
    },
    chipCompact: { paddingHorizontal: 9, paddingVertical: 4, gap: 4 },
    dot: { width: 8, height: 8, borderRadius: RADIUS.full },
    chipText: { fontSize: 13, fontWeight: '700', color: p.textMuted },
    chipTextCompact: { fontSize: 12 },
    resetBtn: { alignSelf: 'center', marginTop: 8 },
    resetText: { fontSize: 11, fontWeight: '700', color: p.textMuted },
  });
