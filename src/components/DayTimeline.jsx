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
  w < 38 ? 'bare' : w < 72 ? 'micro' : w < 115 ? 'compact' : 'full';

/**
 * Timeline d'une journée : graduation horaire de 8h à 18h et créneaux
 * positionnés à l'heure exacte, une colonne par personne affichée. La hauteur
 * d'une heure se déduit de la place réellement disponible, mesurée à
 * l'affichage : la journée tient donc toujours à l'écran sans défilement.
 *
 * Utilisée telle quelle par la vue jour, et par la vue semaine mobile qui en
 * empile une par jour dans un carrousel horizontal.
 */
/**
 * Colonne des heures, utilisable seule : la vue semaine mobile la fixe à
 * gauche du carrousel, pour ne pas la réécrire à chaque jour.
 */
export function HourScale({ hourHeight, isDesktop = false, style }) {
  const { palette } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const showHalfHours = !isDesktop && hourHeight >= 34;

  return (
    <View style={[styles.scale, style]}>
      {hourHeight > 0 &&
        Array.from({ length: TOTAL_HOURS * 2 + 1 }, (_, i) => {
          const isHalf = i % 2 === 1;
          if (isHalf && !showHalfHours) return null;
          return (
            <Text
              key={i}
              style={[styles.scaleLabel, isHalf && styles.halfLabel, { top: (i * hourHeight) / 2 - 5 }]}
            >
              {String(START_HOUR + Math.floor(i / 2)).padStart(2, '0')}
              {isDesktop ? 'h' : isHalf ? 'h30' : 'h00'}
            </Text>
          );
        })}
    </View>
  );
}

export default function DayTimeline({
  date,
  onSelectEvent,
  showLaneHeader = true,
  isDesktop = false,
  hourHeight: fixedHourHeight = 0,
  showGutter = true,
}) {
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

  // La hauteur d'heure vient soit de la mesure locale, soit de la colonne
  // d'heures fixe qui la partage entre toutes les journées du carrousel.
  const measured = grid.height > 0 ? Math.max(MIN_HOUR_HEIGHT, grid.height / TOTAL_HOURS) : 0;
  const hourHeight = fixedHourHeight || measured;
  const gutter = showGutter ? GUTTER : 0;
  const layerWidth = Math.max(0, grid.width - gutter);

  // Demi-heures et blocs centrés : mise en page mobile. Sur PC, la grille
  // garde sa présentation d'origine.
  const showHalfHours = !isDesktop && hourHeight >= 34;

  const now = new Date();
  const showNowLine = isToday && now.getHours() >= START_HOUR && now.getHours() < END_HOUR;
  const nowTop = (now.getHours() - START_HOUR + now.getMinutes() / 60) * hourHeight;

  return (
    <View style={styles.container}>
      {showLaneHeader && visibleIds.length > 1 && (
        <View style={[styles.laneHeader, { marginLeft: gutter }]}>
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
            {/* Graduation : les heures pleines, et les demi-heures dès que la
                hauteur disponible les rend lisibles. */}
            {Array.from({ length: TOTAL_HOURS * 2 + 1 }, (_, i) => {
              const isHalf = i % 2 === 1;
              if (isHalf && !showHalfHours) return null;
              return (
                <View key={i} style={[styles.hourRow, { top: (i * hourHeight) / 2 }]}>
                  {showGutter && (
                    <Text style={[styles.hourLabel, isHalf && styles.halfLabel]}>
                      {String(START_HOUR + Math.floor(i / 2)).padStart(2, '0')}
                      {isDesktop ? 'h' : isHalf ? 'h30' : 'h00'}
                    </Text>
                  )}
                  <View
                    style={[styles.hourLine, isDesktop && styles.hourLineSolid, isHalf && styles.halfLine]}
                  />
                </View>
              );
            })}

            {showNowLine && (
              <View style={[styles.nowLine, { top: nowTop, left: gutter }]}>
                <View style={styles.nowDot} />
              </View>
            )}

            <View style={[styles.eventsLayer, { left: gutter }]}>
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
                    centered={!isDesktop}
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
    laneHeader: { flexDirection: 'row', marginBottom: 2, gap: 3 },
    laneHeaderCell: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 },
    laneDot: { width: 6, height: 6, borderRadius: RADIUS.full },
    laneName: { fontSize: 10, fontWeight: '800' },

    // La marge basse laisse la place au dernier libellé horaire ("18h"), qui
    // déborde sous la dernière ligne de la grille.
    timeline: { flex: 1, position: 'relative', marginBottom: 10 },
    hourRow: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'flex-start' },
    hourLabel: { width: GUTTER - 6, fontSize: 10, color: p.textMuted, fontWeight: '700', marginTop: -5 },
    halfLabel: { fontSize: 9, opacity: 0.55, fontWeight: '600' },
    // Colonne d'heures autonome (vue semaine mobile) : même marge basse que la
    // grille, pour que les deux partagent exactement la même hauteur d'heure.
    scale: { width: GUTTER, position: 'relative', marginBottom: 10 },
    scaleLabel: {
      position: 'absolute',
      left: 0,
      width: GUTTER - 6,
      fontSize: 10,
      color: p.textMuted,
      fontWeight: '700',
    },
    // Lignes d'heure en pointillé, comme sur la grille de référence.
    hourLine: { flex: 1, height: 0, borderTopWidth: 1, borderTopStyle: 'dashed', borderTopColor: p.hairline },
    halfLine: { opacity: 0.45 },
    hourLineSolid: { borderTopStyle: 'solid' },
    nowLine: { position: 'absolute', right: 0, height: 2, backgroundColor: p.now, zIndex: 5 },
    nowDot: {
      position: 'absolute',
      left: -4,
      top: -3,
      width: 8,
      height: 8,
      borderRadius: RADIUS.full,
      backgroundColor: p.now,
    },
    eventsLayer: { position: 'absolute', right: 0, top: 0, bottom: 0 },
    emptyWrap: { position: 'absolute', top: '35%', left: 0, right: 0, alignItems: 'center' },
    emptyText: { marginTop: 4, fontSize: 12, color: p.textMuted, fontWeight: '600' },
  });
