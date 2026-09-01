import React, { useContext } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../ctx/AppContext';
import { hasSchedule } from '../config/schedules';
import GlassCard from './GlassCard';
import { COLORS, RADIUS } from '../theme';

/**
 * Interrupteurs afficher / masquer par personne : on superpose les trois
 * emplois du temps ou on en isole un seul sur la même vue. La pastille de
 * couleur rappelle à qui appartient un créneau (les blocs de cours, eux, sont
 * colorés par matière).
 */
export default function PeopleFilter({ style }) {
  const { people, visiblePeople, togglePerson, showOnly, showAll } = useContext(AppContext);
  const visibleCount = people.filter((p) => visiblePeople[p.id]).length;

  return (
    <GlassCard style={[styles.card, style]}>
      <View style={styles.row}>
        {people.map((p) => {
          const on = !!visiblePeople[p.id];
          const empty = !hasSchedule(p.id);
          return (
            <TouchableOpacity
              key={p.id}
              onPress={() => togglePerson(p.id)}
              onLongPress={() => showOnly(p.id)}
              delayLongPress={300}
              style={[
                styles.chip,
                on && { backgroundColor: `${p.accent}18`, borderColor: p.accent },
              ]}
            >
              <View style={[styles.dot, { backgroundColor: on ? p.accent : COLORS.textMuted }]} />
              <Text style={[styles.chipText, on && { color: p.accent }]} numberOfLines={1}>
                {p.name}
              </Text>
              <Ionicons
                name={on ? 'eye-outline' : 'eye-off-outline'}
                size={14}
                color={on ? p.accent : COLORS.textMuted}
              />
              {empty && <Text style={styles.emptyHint}>·</Text>}
            </TouchableOpacity>
          );
        })}
      </View>

      {visibleCount < people.length && (
        <TouchableOpacity onPress={showAll} style={styles.resetBtn}>
          <Text style={styles.resetText}>Tout afficher</Text>
        </TouchableOpacity>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: { padding: 10 },
  row: { flexDirection: 'row', gap: 8, justifyContent: 'center', flexWrap: 'wrap' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dot: { width: 8, height: 8, borderRadius: RADIUS.full },
  chipText: { fontSize: 13, fontWeight: '700', color: COLORS.textMuted },
  emptyHint: { fontSize: 13, color: COLORS.textMuted },
  resetBtn: { alignSelf: 'center', marginTop: 8 },
  resetText: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
});
