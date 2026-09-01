import React, { useContext, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../ctx/AppContext';
import { getMergedSchedule, getDayMatches } from '../config/schedules';
import { MONTHS_SHORT_FR, WEEKDAYS_FR } from '../config/constants';
import CourseBlock from '../components/CourseBlock';
import PeopleFilter from '../components/PeopleFilter';
import { COLORS, RADIUS } from '../theme';
import {
  GRID_HEIGHT,
  HOUR_HEIGHT,
  START_HOUR,
  TOTAL_HOURS,
  addDays,
  formatLocalDate,
  getEventPosition,
  getMonday,
  layoutOverlaps,
} from '../utils/planningTime';

/**
 * Vue PC : la semaine du lundi au vendredi en 5 colonnes, même plage horaire
 * (8h → 23h) et mêmes couleurs de cours que la timeline mobile, avec
 * navigation semaine par semaine.
 */
export default function WeekView() {
  const { visiblePeople, theme } = useContext(AppContext);
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));

  const weekDays = useMemo(
    () => Array.from({ length: 5 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const rangeLabel = useMemo(() => {
    const end = addDays(weekStart, 4);
    return (
      `lun. ${weekStart.getDate()} ${MONTHS_SHORT_FR[weekStart.getMonth()]} → ` +
      `ven. ${end.getDate()} ${MONTHS_SHORT_FR[end.getMonth()]} ${end.getFullYear()}`
    );
  }, [weekStart]);

  const events = useMemo(() => getMergedSchedule(visiblePeople), [visiblePeople]);

  // Créneaux par jour, déjà répartis en colonnes pour les chevauchements.
  const eventsByDay = useMemo(() => {
    const map = new Map(weekDays.map((d) => [formatLocalDate(d), []]));
    events.forEach((evt) => {
      if (evt.allDay) return;
      const key = formatLocalDate(new Date(evt.start));
      if (map.has(key)) map.get(key).push(evt);
    });
    map.forEach((list, key) => map.set(key, layoutOverlaps(list)));
    return map;
  }, [events, weekDays]);

  const todayStr = formatLocalDate(new Date());
  const isCurrentWeek = formatLocalDate(getMonday(new Date())) === formatLocalDate(weekStart);

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <View style={styles.navGroup}>
          <TouchableOpacity
            onPress={() => setWeekStart(addDays(weekStart, -7))}
            style={styles.navBtn}
            accessibilityLabel="Semaine précédente"
          >
            <Ionicons name="chevron-back" size={18} color={COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setWeekStart(getMonday(new Date()))}
            style={[styles.navBtn, isCurrentWeek && { backgroundColor: theme.tint, borderColor: theme.primary }]}
            accessibilityLabel="Semaine courante"
          >
            <Ionicons name="calendar-outline" size={18} color={isCurrentWeek ? theme.primary : COLORS.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setWeekStart(addDays(weekStart, 7))}
            style={styles.navBtn}
            accessibilityLabel="Semaine suivante"
          >
            <Ionicons name="chevron-forward" size={18} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.rangeLabel}>{rangeLabel}</Text>
        </View>

        <PeopleFilter style={styles.filter} />
      </View>

      <ScrollView style={styles.gridScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {/* Gouttière des heures */}
          <View style={styles.hourGutter}>
            <View style={{ height: HEADER_HEIGHT + 4 }} />
            {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
              <View key={i} style={styles.hourCell}>
                <Text style={styles.hourLabel}>{String(START_HOUR + i).padStart(2, '0')}:00</Text>
              </View>
            ))}
          </View>

          {weekDays.map((day) => {
            const dateStr = formatLocalDate(day);
            const isToday = dateStr === todayStr;
            const dayEvents = eventsByDay.get(dateStr) || [];
            const matches = getDayMatches(dateStr, visiblePeople);

            return (
              <View key={dateStr} style={styles.dayColumn}>
                <View style={[styles.dayHeader, isToday && { backgroundColor: theme.tint }]}>
                  <Text style={[styles.dayName, isToday && { color: theme.primary }]}>
                    {WEEKDAYS_FR[day.getDay() - 1]}
                  </Text>
                  <Text style={[styles.dayDate, isToday && { color: theme.primary, fontWeight: '800' }]}>
                    {String(day.getDate()).padStart(2, '0')}/{String(day.getMonth() + 1).padStart(2, '0')}
                  </Text>
                  {/* Hauteur réservée en permanence pour que les cinq
                      en-têtes restent alignés, avec ou sans indicateur. */}
                  <View style={styles.matchRow}>
                    {matches.length > 0 && (
                      <>
                        <Ionicons name="sparkles" size={9} color={COLORS.match} />
                        {matches.map((m) => (
                          <View key={m.ids.join('-')} style={styles.matchPair}>
                            {m.accents.map((accent, i) => (
                              <View
                                key={m.ids[i]}
                                style={[styles.matchDot, { backgroundColor: accent }]}
                              />
                            ))}
                          </View>
                        ))}
                      </>
                    )}
                  </View>
                </View>

                <View style={styles.dayBody}>
                  {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
                    <View key={i} style={[styles.hourLine, { top: i * HOUR_HEIGHT }]} />
                  ))}

                  {dayEvents.map((evt) => {
                    const pos = getEventPosition(evt);
                    const widthPct = 100 / evt.laneCount;
                    return (
                      <CourseBlock
                        key={`${evt.personId}-${evt.id}`}
                        event={{ ...evt, top: pos.top }}
                        height={pos.height}
                        left={`${evt.lane * widthPct}%`}
                        width={`${widthPct}%`}
                        compact={evt.laneCount > 1}
                      />
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const HEADER_HEIGHT = 54;

const styles = StyleSheet.create({
  container: { flex: 1 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    flexWrap: 'wrap',
  },
  navGroup: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navBtn: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.card,
  },
  rangeLabel: { marginLeft: 8, fontSize: 14, fontWeight: '800', color: COLORS.text },
  filter: { flexGrow: 0 },

  gridScroll: { flex: 1, paddingHorizontal: 24 },
  grid: { flexDirection: 'row', paddingBottom: 40 },

  hourGutter: { width: 54 },
  hourCell: { height: HOUR_HEIGHT },
  hourLabel: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', marginTop: -6 },

  dayColumn: { flex: 1, marginLeft: 8 },
  dayHeader: {
    height: HEADER_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.sm,
    marginBottom: 4,
  },
  dayName: { fontSize: 12, fontWeight: '800', color: COLORS.text, textTransform: 'uppercase' },
  dayDate: { fontSize: 10, color: COLORS.textMuted, marginTop: 1 },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 12, marginTop: 2 },
  matchPair: { flexDirection: 'row', gap: 1 },
  matchDot: { width: 6, height: 6, borderRadius: RADIUS.full },

  dayBody: {
    height: GRID_HEIGHT,
    position: 'relative',
    borderLeftWidth: 1,
    borderLeftColor: COLORS.hairline,
  },
  hourLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: COLORS.hairline },
});
