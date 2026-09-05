import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../ctx/AppContext';
import { getDayMatches } from '../config/schedules';
import { WEEKDAYS_FR } from '../config/constants';
import GlassCard from '../components/GlassCard';
import DayTimeline, { HourScale } from '../components/DayTimeline';
import { RADIUS } from '../theme';
import { TOTAL_HOURS, addDays, formatLocalDate, getMonday } from '../utils/planningTime';

const NAV_SIZE = 34;
const GUTTER = 44;
// Hauteur réservée au titre du jour ; la colonne d'heures se décale d'autant
// pour rester alignée sur les grilles qui défilent à côté.
const TITLE_HEIGHT = 42;

/**
 * Vue semaine sur mobile : les cinq jours côte à côte, chacun sur la largeur
 * de l'écran, parcourus en faisant glisser.
 *
 * Le défilement est libre : il ne s'accroche pas à un jour, on peut donc
 * s'arrêter à cheval sur deux journées pour comparer une fin d'après-midi et
 * le matin suivant. Le titre de chaque jour défile avec sa colonne ; les deux
 * boutons ronds, eux, restent fixes et amènent au jour précédent ou suivant.
 */
export default function WeekPager({ date, onSelectEvent }) {
  const { palette, theme, visiblePeople } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const scrollRef = useRef(null);
  const [page, setPage] = useState({ width: 0, height: 0 });
  const [scaleHeight, setScaleHeight] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const weekStart = useMemo(() => getMonday(date), [date]);
  const weekDays = useMemo(
    () => Array.from({ length: 5 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  // À l'ouverture et à chaque changement de semaine, on se place sur le jour
  // consulté (ou sur le lundi si l'on tombe un week-end).
  const targetIndex = useMemo(() => {
    const index = weekDays.findIndex((d) => formatLocalDate(d) === formatLocalDate(date));
    return index === -1 ? 0 : index;
  }, [weekDays, date]);

  useEffect(() => {
    setActiveIndex(targetIndex);
    if (page.width > 0 && scrollRef.current) {
      scrollRef.current.scrollTo({ x: targetIndex * page.width, animated: false });
    }
  }, [targetIndex, page.width]);

  const goToIndex = (index) => {
    const next = Math.max(0, Math.min(weekDays.length - 1, index));
    setActiveIndex(next);
    scrollRef.current?.scrollTo({ x: next * page.width, animated: true });
  };

  const todayStr = formatLocalDate(new Date());
  // Hauteur d'une heure partagée par la colonne fixe et toutes les journées.
  const hourHeight = scaleHeight > 0 ? scaleHeight / TOTAL_HOURS : 0;

  return (
    <GlassCard style={styles.card}>
      {/* Colonne des heures, fixe : seuls les traits et les journées défilent. */}
      <View style={styles.scaleColumn}>
        <View style={{ height: TITLE_HEIGHT }} />
        <View
          style={styles.scaleBody}
          onLayout={(e) => setScaleHeight(e.nativeEvent.layout.height)}
        >
          <HourScale hourHeight={hourHeight} />
        </View>
      </View>

      <View
        style={styles.pagerWrap}
        onLayout={(e) =>
          setPage({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })
        }
      >
        {page.width > 0 && page.height > 0 && (
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / page.width);
              if (index !== activeIndex) setActiveIndex(index);
            }}
          >
            {weekDays.map((day) => {
              const dateStr = formatLocalDate(day);
              const matches = getDayMatches(dateStr, visiblePeople);
              const isToday = dateStr === todayStr;

              return (
                // Chaque page est dimensionnée explicitement : dans un
                // carrousel horizontal, un enfant en flex:1 n'hériterait
                // d'aucune hauteur.
                <View key={dateStr} style={{ width: page.width, height: page.height }}>
                  <View style={[styles.dayTitleBlock, { height: TITLE_HEIGHT }]}>
                    <Text style={[styles.dayTitle, isToday && { color: theme.primary }]} numberOfLines={1}>
                      {WEEKDAYS_FR[day.getDay() - 1]} {String(day.getDate()).padStart(2, '0')}/
                      {String(day.getMonth() + 1).padStart(2, '0')}
                    </Text>
                    <View style={styles.dayMarks}>
                      {isToday && (
                        <Text style={[styles.todayMark, { color: theme.primary }]}>AUJOURD'HUI</Text>
                      )}
                      {matches.length > 0 && (
                        <Ionicons
                          name={matches.some((m) => m.carpool) ? 'car-sport' : 'sparkles'}
                          size={11}
                          color={palette.match}
                        />
                      )}
                    </View>
                  </View>

                  <View style={styles.timelineWrap}>
                    <DayTimeline
                      date={day}
                      onSelectEvent={onSelectEvent}
                      hourHeight={hourHeight}
                      showGutter={false}
                    />
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* Boutons fixes, superposés au titre qui défile dessous. */}
        <TouchableOpacity
          style={[styles.navCircle, styles.navLeft]}
          onPress={() => goToIndex(activeIndex - 1)}
          disabled={activeIndex <= 0}
          accessibilityLabel="Jour précédent"
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color={activeIndex <= 0 ? palette.textMuted : palette.text}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.navCircle, styles.navRight]}
          onPress={() => goToIndex(activeIndex + 1)}
          disabled={activeIndex >= weekDays.length - 1}
          accessibilityLabel="Jour suivant"
        >
          <Ionicons
            name="chevron-forward"
            size={20}
            color={activeIndex >= weekDays.length - 1 ? palette.textMuted : palette.text}
          />
        </TouchableOpacity>
      </View>
    </GlassCard>
  );
}

const createStyles = (p) =>
  StyleSheet.create({
    // La carte tient la colonne fixe et le carrousel côte à côte.
    card: { flex: 1, flexDirection: 'row', paddingHorizontal: 8, paddingTop: 6, paddingBottom: 6 },
    scaleColumn: { width: GUTTER },
    scaleBody: { flex: 1 },
    pagerWrap: { flex: 1, overflow: 'hidden', position: 'relative' },

    // Le titre laisse libres les deux extrémités, où se posent les boutons.
    dayTitleBlock: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: NAV_SIZE + 6 },
    dayTitle: { fontSize: 17, fontWeight: '800', color: p.text, userSelect: 'none' },
    dayMarks: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 12 },
    todayMark: { fontSize: 9, fontWeight: '800' },

    timelineWrap: { flex: 1 },

    navCircle: {
      position: 'absolute',
      top: 0,
      width: NAV_SIZE,
      height: NAV_SIZE,
      borderRadius: RADIUS.full,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: p.cardBorder,
      backgroundColor: p.card,
      zIndex: 3,
    },
    navLeft: { left: 0 },
    navRight: { right: 0 },
  });
