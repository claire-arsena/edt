import React, { useContext, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../ctx/AppContext';
import { getMergedSchedule, getDayMatches } from '../config/schedules';
import { getCourseColor } from '../config/courseColors';
import { DAYS_FR, MONTHS_FR } from '../config/constants';
import GlassCard from '../components/GlassCard';
import CourseBlock from '../components/CourseBlock';
import MatchBanner from '../components/MatchBanner';
import PeopleFilter from '../components/PeopleFilter';
import { COLORS, RADIUS } from '../theme';
import {
  GRID_HEIGHT,
  HOUR_HEIGHT,
  START_HOUR,
  END_HOUR,
  TOTAL_HOURS,
  addDays,
  formatLocalDate,
  getEventPosition,
  layoutOverlaps,
} from '../utils/planningTime';

const GUTTER = 48;

const capitalizeFirst = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/**
 * Vue mobile : timeline jour par jour, colonne des heures à gauche (8h → 23h),
 * créneaux positionnés à l'heure exacte, navigation jour précédent / suivant.
 */
export default function DayView() {
  const { visiblePeople, theme } = useContext(AppContext);
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const dateStr = formatLocalDate(selectedDate);
  const todayStr = formatLocalDate(new Date());
  const isToday = dateStr === todayStr;

  // "mardi 1 septembre 2026" → "Mardi 1 septembre 2026" (seule l'initiale
  // prend la majuscule, contrairement à un textTransform: capitalize qui
  // capitaliserait aussi le mois).
  const formattedDate = capitalizeFirst(
    `${DAYS_FR[selectedDate.getDay()]} ${selectedDate.getDate()} ` +
      `${MONTHS_FR[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`
  );

  const events = useMemo(() => getMergedSchedule(visiblePeople), [visiblePeople]);

  const dayEvents = useMemo(
    () => events.filter((e) => formatLocalDate(new Date(e.start)) === dateStr),
    [events, dateStr]
  );
  const timedEvents = useMemo(
    () => layoutOverlaps(dayEvents.filter((e) => !e.allDay)),
    [dayEvents]
  );
  const allDayEvents = useMemo(() => dayEvents.filter((e) => e.allDay), [dayEvents]);

  const matches = useMemo(() => getDayMatches(dateStr, visiblePeople), [dateStr, visiblePeople]);

  // Ligne de l'heure courante, uniquement sur la journée d'aujourd'hui.
  const now = new Date();
  const showNowLine = isToday && now.getHours() >= START_HOUR && now.getHours() < END_HOUR;
  const nowTop = (now.getHours() - START_HOUR) * HOUR_HEIGHT + (now.getMinutes() / 60) * HOUR_HEIGHT;

  return (
    <View style={styles.container}>
      <View style={styles.stickyTop}>
        <GlassCard style={styles.navCard}>
          <View style={styles.navRow}>
            <TouchableOpacity
              onPress={() => setSelectedDate(addDays(selectedDate, -1))}
              style={[styles.navBtn, { backgroundColor: theme.tint }]}
              accessibilityLabel="Jour précédent"
            >
              <Ionicons name="chevron-back" size={20} color={theme.primary} />
            </TouchableOpacity>

            <View style={styles.dateInfo}>
              <Text style={styles.dateTitle}>{formattedDate}</Text>
              {isToday && (
                <Text style={[styles.todayBadge, { color: theme.primary }]}>Aujourd'hui</Text>
              )}
            </View>

            <TouchableOpacity
              onPress={() => setSelectedDate(addDays(selectedDate, 1))}
              style={[styles.navBtn, { backgroundColor: theme.tint }]}
              accessibilityLabel="Jour suivant"
            >
              <Ionicons name="chevron-forward" size={20} color={theme.primary} />
            </TouchableOpacity>
          </View>

          {!isToday && (
            <TouchableOpacity
              style={[styles.todayBtn, { backgroundColor: theme.tint }]}
              onPress={() => setSelectedDate(new Date())}
            >
              <Text style={[styles.todayBtnText, { color: theme.primary }]}>
                Revenir à aujourd'hui
              </Text>
            </TouchableOpacity>
          )}
        </GlassCard>

        <PeopleFilter style={styles.filter} />
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <MatchBanner matches={matches} style={styles.banner} />

        {allDayEvents.length > 0 && (
          <GlassCard style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Toute la journée ({allDayEvents.length})</Text>
            <View style={styles.allDayList}>
              {allDayEvents.map((evt) => {
                const color = getCourseColor(evt.title);
                return (
                  <View key={`${evt.personId}-${evt.id}`} style={[styles.allDayItem, { borderLeftColor: color }]}>
                    <View style={[styles.personDot, { backgroundColor: evt.personAccent }]} />
                    <Text style={styles.allDayText} numberOfLines={1}>{evt.title}</Text>
                  </View>
                );
              })}
            </View>
          </GlassCard>
        )}

        <GlassCard style={styles.timelineCard}>
          <Text style={styles.sectionTitle}>Cours de la journée</Text>

          <View style={styles.timeline}>
            {/* Graduation horaire 8h → 23h */}
            {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
              <View key={i} style={[styles.hourRow, { top: i * HOUR_HEIGHT }]}>
                <Text style={styles.hourLabel}>{String(START_HOUR + i).padStart(2, '0')}:00</Text>
                <View style={styles.hourLine} />
              </View>
            ))}

            {showNowLine && (
              <View style={[styles.nowLine, { top: nowTop }]}>
                <View style={styles.nowDot} />
              </View>
            )}

            {/* Créneaux : les cours simultanés se partagent la largeur */}
            <View style={styles.eventsLayer}>
              {timedEvents.map((evt) => {
                const pos = getEventPosition(evt);
                const widthPct = 100 / evt.laneCount;
                return (
                  <CourseBlock
                    key={`${evt.personId}-${evt.id}`}
                    event={{ ...evt, top: pos.top }}
                    height={pos.height}
                    left={`${evt.lane * widthPct}%`}
                    width={`${widthPct}%`}
                    compact={evt.laneCount > 2}
                  />
                );
              })}
            </View>

            {dayEvents.length === 0 && (
              <View style={styles.emptyWrap} pointerEvents="none">
                <Ionicons name="calendar-clear-outline" size={36} color={COLORS.textMuted} />
                <Text style={styles.emptyText}>Aucun cours ce jour-là</Text>
              </View>
            )}
          </View>
        </GlassCard>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  stickyTop: { paddingHorizontal: 16, paddingTop: 8, gap: 10, zIndex: 10 },
  navCard: { padding: 14 },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: { padding: 8, borderRadius: RADIUS.full },
  dateInfo: { alignItems: 'center', flex: 1 },
  dateTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, textAlign: 'center' },
  todayBadge: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', marginTop: 2 },
  todayBtn: {
    alignSelf: 'center',
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.md,
  },
  todayBtnText: { fontSize: 11, fontWeight: '700' },
  filter: { marginBottom: 2 },

  scrollArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 40 },
  banner: { marginBottom: 12 },

  sectionCard: { padding: 14, marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  allDayList: { gap: 8, marginTop: 10 },
  allDayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderLeftWidth: 4,
  },
  personDot: { width: 8, height: 8, borderRadius: RADIUS.full },
  allDayText: { flex: 1, fontSize: 13, fontWeight: '600', color: COLORS.text },

  timelineCard: { padding: 14 },
  timeline: { height: GRID_HEIGHT + 12, marginTop: 12, position: 'relative' },
  hourRow: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'flex-start' },
  hourLabel: { width: 44, fontSize: 11, color: COLORS.textMuted, fontWeight: '600', marginTop: -6 },
  hourLine: { flex: 1, height: 1, backgroundColor: COLORS.hairline },
  nowLine: { position: 'absolute', left: GUTTER, right: 0, height: 2, backgroundColor: COLORS.now, zIndex: 5 },
  nowDot: {
    position: 'absolute',
    left: -4,
    top: -3,
    width: 8,
    height: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.now,
  },
  eventsLayer: { position: 'absolute', left: GUTTER, right: 0, top: 0, height: GRID_HEIGHT },
  emptyWrap: { position: 'absolute', top: 90, left: 0, right: 0, alignItems: 'center' },
  emptyText: { marginTop: 6, fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
});
