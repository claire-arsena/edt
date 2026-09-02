import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../ctx/AppContext';
import { getMergedSchedule, getDayMatches } from '../config/schedules';
import { getCourseColor } from '../config/courseColors';
import { DAYS_FR, MONTHS_FR } from '../config/constants';
import GlassCard from '../components/GlassCard';
import CourseBlock from '../components/CourseBlock';
import CourseDetailModal from '../components/CourseDetailModal';
import MatchBanner from '../components/MatchBanner';
import PeopleFilter from '../components/PeopleFilter';
import { RADIUS } from '../theme';
import {
  START_HOUR,
  END_HOUR,
  TOTAL_HOURS,
  addDays,
  formatLocalDate,
  getEventPosition,
  layoutByPerson,
} from '../utils/planningTime';

const GUTTER = 44;
const MIN_HOUR_HEIGHT = 26;

const capitalizeFirst = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/**
 * Vue mobile : la journée en entier, de 8h à 18h, sans défilement. La hauteur
 * d'une heure se déduit de la place restante sous les cartes du haut, mesurée
 * à l'affichage — la timeline s'adapte donc à la taille de l'écran plutôt que
 * de déborder.
 */
export default function DayView() {
  const { visiblePeople, theme, palette, isDark, people } = useAppTheme();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [gridHeight, setGridHeight] = useState(0);
  const styles = useMemo(() => createStyles(palette), [palette]);

  // Une colonne par personne affichée, à place fixe : celle qui n'a pas cours
  // laisse sa colonne vide au lieu de céder la largeur aux autres.
  const visibleIds = useMemo(
    () => people.filter((p) => visiblePeople[p.id]).map((p) => p.id),
    [people, visiblePeople]
  );

  const dateStr = formatLocalDate(selectedDate);
  const isToday = dateStr === formatLocalDate(new Date());

  const dayLabel =
    `${DAYS_FR[selectedDate.getDay()]} ${selectedDate.getDate()} ${MONTHS_FR[selectedDate.getMonth()]}`;
  const formattedDate = capitalizeFirst(`${dayLabel} ${selectedDate.getFullYear()}`);

  const events = useMemo(() => getMergedSchedule(visiblePeople), [visiblePeople]);
  const dayEvents = useMemo(
    () => events.filter((e) => formatLocalDate(new Date(e.start)) === dateStr),
    [events, dateStr]
  );
  const timedEvents = useMemo(
    () => layoutByPerson(dayEvents.filter((e) => !e.allDay), visibleIds),
    [dayEvents, visibleIds]
  );
  const allDayEvents = useMemo(() => dayEvents.filter((e) => e.allDay), [dayEvents]);
  const matches = useMemo(() => getDayMatches(dateStr, visiblePeople), [dateStr, visiblePeople]);

  // Hauteur d'une heure déduite de la place mesurée ; tant que la mesure n'a
  // pas eu lieu, rien n'est positionné (évite un saut au premier rendu).
  const hourHeight = gridHeight > 0 ? Math.max(MIN_HOUR_HEIGHT, gridHeight / TOTAL_HOURS) : 0;

  const now = new Date();
  const showNowLine = isToday && now.getHours() >= START_HOUR && now.getHours() < END_HOUR;
  const nowTop = (now.getHours() - START_HOUR + now.getMinutes() / 60) * hourHeight;

  return (
    <View style={styles.container}>
      <GlassCard style={styles.navCard}>
        <View style={styles.navRow}>
          <TouchableOpacity
            onPress={() => setSelectedDate(addDays(selectedDate, -1))}
            style={[styles.navBtn, { backgroundColor: theme.tint }]}
            accessibilityLabel="Jour précédent"
          >
            <Ionicons name="chevron-back" size={18} color={theme.primary} />
          </TouchableOpacity>

          {/* La date ramène à aujourd'hui : un bouton de moins à l'écran. */}
          <TouchableOpacity
            style={styles.dateInfo}
            onPress={() => setSelectedDate(new Date())}
            accessibilityLabel="Revenir à aujourd'hui"
          >
            <Text style={styles.dateTitle} numberOfLines={1}>{formattedDate}</Text>
            <Text style={[styles.dateHint, { color: theme.primary }]}>
              {isToday ? "AUJOURD'HUI" : "↩ REVENIR À AUJOURD'HUI"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedDate(addDays(selectedDate, 1))}
            style={[styles.navBtn, { backgroundColor: theme.tint }]}
            accessibilityLabel="Jour suivant"
          >
            <Ionicons name="chevron-forward" size={18} color={theme.primary} />
          </TouchableOpacity>
        </View>
      </GlassCard>

      <PeopleFilter compact style={styles.filter} />

      <MatchBanner compact matches={matches} dateLabel={dayLabel} style={styles.banner} />

      {allDayEvents.length > 0 && (
        <View style={styles.allDayRow}>
          {allDayEvents.map((evt) => (
            <View
              key={`${evt.personId}-${evt.id}`}
              style={[styles.allDayChip, { backgroundColor: getCourseColor(evt.title, isDark, evt.personId) }]}
            >
              <Text style={styles.allDayText} numberOfLines={1}>{evt.title}</Text>
            </View>
          ))}
        </View>
      )}

      <GlassCard style={styles.timelineCard}>
        {visibleIds.length > 1 && (
          <View style={styles.laneHeader}>
            {visibleIds.map((id) => {
              const person = people.find((p) => p.id === id);
              return (
                <View key={id} style={styles.laneHeaderCell}>
                  <View style={[styles.laneDot, { backgroundColor: person.accent }]} />
                  <Text style={[styles.laneName, { color: person.accent }]} numberOfLines={1}>
                    {person.name}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        <View
          style={styles.timeline}
          onLayout={(e) => setGridHeight(e.nativeEvent.layout.height)}
        >
          {hourHeight > 0 && (
            <>
              {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
                <View key={i} style={[styles.hourRow, { top: i * hourHeight }]}>
                  <Text style={styles.hourLabel}>{String(START_HOUR + i).padStart(2, '0')}h</Text>
                  <View style={styles.hourLine} />
                </View>
              ))}

              {showNowLine && (
                <View style={[styles.nowLine, { top: nowTop }]}>
                  <View style={styles.nowDot} />
                </View>
              )}

              <View style={styles.eventsLayer}>
                {timedEvents.map((evt) => {
                  const pos = getEventPosition(evt, hourHeight);
                  const unit = 100 / evt.laneCount;
                  return (
                    <CourseBlock
                      key={`${evt.personId}-${evt.id}`}
                      event={{ ...evt, top: pos.top }}
                      height={pos.height}
                      left={`${evt.lane * unit}%`}
                      width={`${unit * evt.laneSpan}%`}
                      compact={evt.laneCount > 2}
                      onPress={setSelectedEvent}
                    />
                  );
                })}
              </View>

              {dayEvents.length === 0 && (
                <View style={styles.emptyWrap} pointerEvents="none">
                  <Ionicons name="calendar-clear-outline" size={30} color={palette.textMuted} />
                  <Text style={styles.emptyText}>Aucun cours ce jour-là</Text>
                </View>
              )}
            </>
          )}
        </View>
      </GlassCard>

      <CourseDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </View>
  );
}

const createStyles = (p) =>
  StyleSheet.create({
    container: { flex: 1, paddingHorizontal: 12, paddingBottom: 10, gap: 8 },

    navCard: { paddingVertical: 8, paddingHorizontal: 10 },
    navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    navBtn: { padding: 6, borderRadius: RADIUS.full },
    dateInfo: { alignItems: 'center', flex: 1 },
    dateTitle: { fontSize: 14, fontWeight: '800', color: p.text },
    dateHint: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', marginTop: 1 },

    filter: { flexGrow: 0 },
    banner: { flexGrow: 0 },

    allDayRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    allDayChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm },
    allDayText: { fontSize: 11, fontWeight: '700', color: '#fff' },

    // La carte de la timeline occupe toute la hauteur restante : c'est elle
    // qui donne sa mesure à la grille.
    timelineCard: { flex: 1, paddingHorizontal: 10, paddingTop: 6, paddingBottom: 10 },
    laneHeader: { flexDirection: 'row', marginLeft: GUTTER, marginBottom: 2, gap: 3 },
    laneHeaderCell: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
    laneDot: { width: 6, height: 6, borderRadius: RADIUS.full },
    laneName: { fontSize: 10, fontWeight: '800' },

    timeline: { flex: 1, position: 'relative' },
    hourRow: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'flex-start' },
    hourLabel: { width: GUTTER - 6, fontSize: 10, color: p.textMuted, fontWeight: '600', marginTop: -5 },
    hourLine: { flex: 1, height: 1, backgroundColor: p.hairline },
    nowLine: { position: 'absolute', left: GUTTER, right: 0, height: 2, backgroundColor: p.now, zIndex: 5 },
    nowDot: {
      position: 'absolute',
      left: -4,
      top: -3,
      width: 8,
      height: 8,
      borderRadius: RADIUS.full,
      backgroundColor: p.now,
    },
    eventsLayer: { position: 'absolute', left: GUTTER, right: 0, top: 0, bottom: 0 },
    emptyWrap: { position: 'absolute', top: '35%', left: 0, right: 0, alignItems: 'center' },
    emptyText: { marginTop: 4, fontSize: 12, color: p.textMuted, fontWeight: '600' },
  });
