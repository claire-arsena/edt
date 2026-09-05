import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../ctx/AppContext';
import { getDayIndex } from '../config/schedules';
import { MONTHS_FR } from '../config/constants';
import { formatLocalDate } from '../utils/planningTime';
import { getExamColor } from '../config/exams';
import { RADIUS } from '../theme';

const WEEKDAY_INITIALS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

/**
 * Calendrier du mois : on touche une date pour s'y rendre directement, sans
 * avancer jour après jour. Chaque case porte les pastilles des personnes qui
 * ont cours ce jour-là, et vire au rouge quand la journée comporte un examen.
 */
export default function MonthPickerModal({ visible, date, onSelect, onClose }) {
  const { palette, theme, visiblePeople } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const [cursor, setCursor] = useState(() => new Date(date || Date.now()));

  const dayIndex = useMemo(() => getDayIndex(visiblePeople), [visiblePeople]);

  const { cells, monthLabel } = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    // Grille commençant le lundi.
    const lead = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const list = [
      ...Array.from({ length: lead }, () => null),
      ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
    ];
    return { cells: list, monthLabel: `${MONTHS_FR[month]} ${year}` };
  }, [cursor]);

  const todayStr = formatLocalDate(new Date());
  const selectedStr = date ? formatLocalDate(date) : null;

  const shiftMonth = (delta) => {
    const d = new Date(cursor);
    d.setDate(1);
    d.setMonth(d.getMonth() + delta);
    setCursor(d);
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => {}}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => shiftMonth(-1)} style={styles.navBtn} accessibilityLabel="Mois précédent">
              <Ionicons name="chevron-back" size={18} color={palette.text} />
            </TouchableOpacity>
            <Text style={styles.monthLabel}>{monthLabel}</Text>
            <TouchableOpacity onPress={() => shiftMonth(1)} style={styles.navBtn} accessibilityLabel="Mois suivant">
              <Ionicons name="chevron-forward" size={18} color={palette.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAY_INITIALS.map((d, i) => (
              <Text key={i} style={styles.weekday}>{d}</Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((day, i) => {
              if (!day) return <View key={`blank-${i}`} style={styles.cell} />;
              const key = formatLocalDate(day);
              const entry = dayIndex.get(key);
              const isSelected = key === selectedStr;
              const isToday = key === todayStr;

              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.cell,
                    isToday && { borderColor: theme.primary, borderWidth: 1 },
                    isSelected && { backgroundColor: theme.primary },
                  ]}
                  onPress={() => onSelect(day)}
                >
                  <Text
                    style={[
                      styles.dayNumber,
                      isSelected && styles.dayNumberSelected,
                      entry?.exam && !isSelected && { color: getExamColor(false), fontWeight: '800' },
                    ]}
                  >
                    {day.getDate()}
                  </Text>
                  <View style={styles.dots}>
                    {entry?.exam ? (
                      <View style={[styles.dot, { backgroundColor: getExamColor(false) }]} />
                    ) : (
                      (entry?.accents || []).map((accent) => (
                        <View key={accent} style={[styles.dot, { backgroundColor: accent }]} />
                      ))
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.footer}>
            <TouchableOpacity onPress={() => onSelect(new Date())} style={[styles.todayBtn, { backgroundColor: theme.tint }]}>
              <Text style={[styles.todayText, { color: theme.primary }]}>Aujourd'hui</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>Fermer</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = (p) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
    },
    card: {
      width: '100%',
      maxWidth: 380,
      backgroundColor: p.card,
      borderRadius: RADIUS.xl,
      borderWidth: 1,
      borderColor: p.cardBorder,
      padding: 14,
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    navBtn: {
      width: 32,
      height: 32,
      borderRadius: RADIUS.sm,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: p.cardBorder,
    },
    monthLabel: { fontSize: 15, fontWeight: '800', color: p.text, textTransform: 'capitalize' },

    weekRow: { flexDirection: 'row', marginBottom: 4 },
    weekday: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '800', color: p.textMuted },

    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: {
      width: `${100 / 7}%`,
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: RADIUS.sm,
      borderWidth: 1,
      borderColor: 'transparent',
    },
    dayNumber: { fontSize: 13, fontWeight: '600', color: p.text },
    dayNumberSelected: { color: '#fff', fontWeight: '800' },
    dots: { flexDirection: 'row', gap: 2, height: 6, marginTop: 2 },
    dot: { width: 4, height: 4, borderRadius: RADIUS.full },

    footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
    todayBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: RADIUS.md },
    todayText: { fontSize: 12, fontWeight: '800' },
    closeBtn: { paddingHorizontal: 12, paddingVertical: 6 },
    closeText: { fontSize: 12, fontWeight: '700', color: p.textMuted },
  });
