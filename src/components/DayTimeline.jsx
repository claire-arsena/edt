import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../ctx/AppContext';
import { getMergedSchedule } from '../config/schedules';
import CourseBlock from './CourseBlock';
import { RADIUS } from '../theme';
import {
  START_HOUR,
  END_HOUR,
  TOTAL_HOURS,
  formatLocalDate,
  getEventPosition,
  layoutByPerson,
} from '../utils/planningTime';

const GUTTER = 44;
const MIN_HOUR_HEIGHT = 22;

// Quantité de texte qu'un bloc peut porter, selon sa largeur en pixels :
// sous ~40 px, un mot se casserait lettre par lettre.
export const densityForWidth = (w) =>
  w < 40 ? 'bare' : w < 95 ? 'micro' : w < 140 ? 'compact' : 'full';

/**
 * Timeline d'une journée : graduation horaire de 8h à 18h et créneaux
 * positionnés à l'heure exacte, une colonne par personne affichée. La hauteur
 * d'une heure se déduit de la place réellement disponible, mesurée à
 * l'affichage : la journée tient donc toujours à l'écran sans défilement.
 *
 * Utilisée telle quelle par la vue jour, et par la vue semaine mobile qui en
 * empile une par jour dans un carrousel horizontal.
 */
export default function DayTimeline({ date, onSelectEvent, showLaneHeader = true }) {
  const { visiblePeople, palette, people } = useAppTheme();
  const [grid, setGrid] = useState({ height: 0, width: 0 });
  const styles = useMemo(() => createStyles(palette), [palette]);

  const visibleIds = useMemo(
    () => people.filter((p) => visiblePeople[p.id]).map((p) => p.id),
    [people, visiblePeople]
  );

  const dateStr = formatLocalDate(date);
  const isToday = dateStr === formatLocalDate(new Date());

  const events = useMemo(() => getMergedSchedule(visiblePeople), [visiblePeople]);
  const dayEvents = useMemo(
    () => events.filter((e) => !e.allDay && formatLocalDate(new Date(e.start)) === dateStr),
    [events, dateStr]
  );
  const timedEvents = useMemo(() => layoutByPerson(dayEvents, visibleIds), [dayEvents, visibleIds]);

  const hourHeight = grid.height > 0 ? Math.max(MIN_HOUR_HEIGHT, grid.height / TOTAL_HOURS) : 0;
  const layerWidth = Math.max(0, grid.width - GUTTER);

  const now = new Date();
  const showNowLine = isToday && now.getHours() >= START_HOUR && now.getHours() < END_HOUR;
  const nowTop = (now.getHours() - START_HOUR + now.getMinutes() / 60) * hourHeight;

  return (
    <View style={styles.container}>
      {showLaneHeader && visibleIds.length > 1 && (
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
        onLayout={(e) =>
          setGrid({ height: e.nativeEvent.layout.height, width: e.nativeEvent.layout.width })
        }
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
                const blockWidth = (layerWidth * unit * evt.laneSpan) / 100;
                return (
                  <CourseBlock
                    key={`${evt.personId}-${evt.id}`}
                    event={{ ...evt, top: pos.top }}
                    height={pos.height}
                    left={`${evt.lane * unit}%`}
                    width={`${unit * evt.laneSpan}%`}
                    density={densityForWidth(blockWidth)}
                    onPress={onSelectEvent}
                  />
                );
              })}
            </View>

            {dayEvents.length === 0 && (
              <View style={styles.emptyWrap} pointerEvents="none">
                <Ionicons name="calendar-clear-outline" size={28} color={palette.textMuted} />
                <Text style={styles.emptyText}>Aucun cours ce jour-là</Text>
              </View>
            )}
          </>
        )}
      </View>
    </View>
  );
}

const createStyles = (p) =>
  StyleSheet.create({
    container: { flex: 1 },
    laneHeader: { flexDirection: 'row', marginLeft: GUTTER, marginBottom: 2, gap: 3 },
    laneHeaderCell: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
    laneDot: { width: 6, height: 6, borderRadius: RADIUS.full },
    laneName: { fontSize: 10, fontWeight: '800' },

    // La marge basse laisse la place au dernier libellé horaire ("18h"), qui
    // déborde sous la dernière ligne de la grille.
    timeline: { flex: 1, position: 'relative', marginBottom: 10 },
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
