import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../ctx/AppContext';
import { getMergedSchedule, getDayMatches } from '../config/schedules';
import { WEEKDAYS_FR } from '../config/constants';
import GlassCard from '../components/GlassCard';
import CourseBlock from '../components/CourseBlock';
import { RADIUS } from '../theme';
import { densityForWidth } from '../components/DayTimeline';
import {
  START_HOUR,
  TOTAL_HOURS,
  addDays,
  formatLocalDate,
  getEventPosition,
  getMonday,
  layoutByPerson,
  layoutOverlaps,
} from '../utils/planningTime';

const MIN_HOUR_HEIGHT = 22;

/**
 * Vue semaine : du lundi au vendredi en 5 colonnes, même plage horaire que la
 * vue jour. La hauteur d'une heure se déduit là aussi de la place disponible,
 * donc la semaine tient à l'écran sans défilement.
 *
 * Sur PC, chaque personne garde sa sous-colonne dans la journée. Sur mobile,
 * une colonne de jour fait une soixantaine de pixels : la découper en trois la
 * rendrait illisible, les créneaux ne se partagent donc la largeur que
 * lorsqu'ils se chevauchent réellement — la pastille de couleur indique alors
 * à qui appartient le cours.
 */
export default function WeekView({ date, isDesktop, onSelectEvent }) {
  const { visiblePeople, theme, palette, people } = useAppTheme();
  const [grid, setGrid] = useState({ height: 0, width: 0 });
  const styles = useMemo(() => createStyles(palette, isDesktop), [palette, isDesktop]);

  const weekStart = useMemo(() => getMonday(date), [date]);
  const weekDays = useMemo(
    () => Array.from({ length: 5 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const visibleIds = useMemo(
    () => people.filter((p) => visiblePeople[p.id]).map((p) => p.id),
    [people, visiblePeople]
  );

  const events = useMemo(() => getMergedSchedule(visiblePeople), [visiblePeople]);

  const eventsByDay = useMemo(() => {
    const map = new Map(weekDays.map((d) => [formatLocalDate(d), []]));
    events.forEach((evt) => {
      if (evt.allDay) return;
      const key = formatLocalDate(new Date(evt.start));
      if (map.has(key)) map.get(key).push(evt);
    });
    map.forEach((list, key) =>
      map.set(key, isDesktop ? layoutByPerson(list, visibleIds) : layoutOverlaps(list).map((e) => ({ ...e, laneSpan: 1 })))
    );
    return map;
  }, [events, weekDays, visibleIds, isDesktop]);

  const hourHeight = grid.height > 0 ? Math.max(MIN_HOUR_HEIGHT, grid.height / TOTAL_HOURS) : 0;
  const todayStr = formatLocalDate(new Date());

  return (
    <GlassCard style={styles.card}>
      <View style={styles.grid}>
        <View style={styles.gutter}>
          <View style={{ height: HEADER_HEIGHT + 4 }} />
          <View style={styles.gutterBody}>
            {hourHeight > 0 &&
              Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
                <Text key={i} style={[styles.hourLabel, { top: i * hourHeight - 6 }]}>
                  {String(START_HOUR + i).padStart(2, '0')}h
                </Text>
              ))}
          </View>
        </View>

        {weekDays.map((day, dayIndex) => {
          const dateStr = formatLocalDate(day);
          const isToday = dateStr === todayStr;
          const dayEvents = eventsByDay.get(dateStr) || [];
          const matches = getDayMatches(dateStr, visiblePeople);

          return (
            <View key={dateStr} style={styles.dayColumn}>
              <View style={[styles.dayHeader, isToday && { backgroundColor: theme.tint }]}>
                <Text style={[styles.dayName, isToday && { color: theme.primary }]} numberOfLines={1}>
                  {isDesktop ? WEEKDAYS_FR[day.getDay() - 1] : WEEKDAYS_FR[day.getDay() - 1].slice(0, 3)}
                </Text>
                <Text style={[styles.dayDate, isToday && { color: theme.primary, fontWeight: '800' }]}>
                  {String(day.getDate()).padStart(2, '0')}/{String(day.getMonth() + 1).padStart(2, '0')}
                </Text>
                <View style={styles.matchRow}>
                  {matches.length > 0 && (
                    <>
                      <Ionicons
                        name={matches.some((m) => m.carpool) ? 'car-sport' : 'sparkles'}
                        size={9}
                        color={palette.match}
                      />
                      {matches.map((m) => (
                        <View key={m.ids.join('-')} style={styles.matchPair}>
                          {m.accents.map((accent, i) => (
                            <View key={m.ids[i]} style={[styles.matchDot, { backgroundColor: accent }]} />
                          ))}
                        </View>
                      ))}
                    </>
                  )}
                </View>
              </View>

              <View
                style={styles.dayBody}
                onLayout={
                  dayIndex === 0
                    ? (e) =>
                        setGrid({
                          height: e.nativeEvent.layout.height,
                          width: e.nativeEvent.layout.width,
                        })
                    : undefined
                }
              >
                {hourHeight > 0 && (
                  <>
                    {Array.from({ length: TOTAL_HOURS + 1 }, (_, i) => (
                      <View key={i} style={[styles.hourLine, { top: i * hourHeight }]} />
                    ))}

                    {dayEvents.map((evt) => {
                      const pos = getEventPosition(evt, hourHeight);
                      const unit = 100 / evt.laneCount;
                      const blockWidth = (grid.width * unit * (evt.laneSpan ?? 1)) / 100;
                      return (
                        <CourseBlock
                          key={`${evt.personId}-${evt.id}`}
                          event={{ ...evt, top: pos.top }}
                          height={pos.height}
                          left={`${evt.lane * unit}%`}
                          width={`${unit * (evt.laneSpan ?? 1)}%`}
                          density={densityForWidth(blockWidth)}
                          onPress={onSelectEvent}
                        />
                      );
                    })}
                  </>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </GlassCard>
  );
}

const HEADER_HEIGHT = 48;

const createStyles = (p, isDesktop) =>
  StyleSheet.create({
    card: { flex: 1, paddingHorizontal: isDesktop ? 14 : 6, paddingVertical: isDesktop ? 12 : 8 },
    grid: { flex: 1, flexDirection: 'row' },

    gutter: { width: isDesktop ? 52 : 30 },
    gutterBody: { flex: 1, position: 'relative' },
    hourLabel: {
      position: 'absolute',
      fontSize: isDesktop ? 11 : 9,
      color: p.textMuted,
      fontWeight: '600',
    },

    dayColumn: { flex: 1, marginLeft: isDesktop ? 8 : 3 },
    dayHeader: {
      height: HEADER_HEIGHT,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: RADIUS.sm,
      marginBottom: 4,
    },
    dayName: {
      fontSize: isDesktop ? 12 : 10,
      fontWeight: '800',
      color: p.text,
      textTransform: 'uppercase',
    },
    dayDate: { fontSize: isDesktop ? 10 : 9, color: p.textMuted, marginTop: 1 },
    matchRow: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 10, marginTop: 2 },
    matchPair: { flexDirection: 'row', gap: 1 },
    matchDot: { width: 5, height: 5, borderRadius: RADIUS.full },

    dayBody: {
      flex: 1,
      position: 'relative',
      borderLeftWidth: 1,
      borderLeftColor: p.hairline,
    },
    hourLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: p.hairline },
  });
