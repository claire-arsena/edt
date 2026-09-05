import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../ctx/AppContext';
import { getDayMatches } from '../config/schedules';
import { WEEKDAYS_FR } from '../config/constants';
import GlassCard from '../components/GlassCard';
import DayTimeline from '../components/DayTimeline';
import { RADIUS } from '../theme';
import { addDays, formatLocalDate, getMonday } from '../utils/planningTime';

/**
 * Vue semaine sur mobile : les cinq jours en carrousel horizontal, un jour par
 * page. Chaque journée garde ainsi toute la largeur de l'écran — des colonnes
 * de soixante pixels rendraient les créneaux illisibles — et l'on passe d'un
 * jour à l'autre en faisant glisser.
 */
export default function WeekPager({ date, onSelectEvent }) {
  const { palette, theme, visiblePeople } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const scrollRef = useRef(null);
  const [page, setPage] = useState({ width: 0, height: 0 });
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

  const todayStr = formatLocalDate(new Date());
  const activeDay = weekDays[Math.min(activeIndex, weekDays.length - 1)] || weekDays[0];
  const activeMatches = useMemo(
    () => getDayMatches(formatLocalDate(activeDay), visiblePeople),
    [activeDay, visiblePeople]
  );

  const goToIndex = (index) => {
    const next = Math.max(0, Math.min(weekDays.length - 1, index));
    setActiveIndex(next);
    scrollRef.current?.scrollTo({ x: next * page.width, animated: true });
  };

  return (
    <GlassCard style={styles.card}>
      {/* En-tête du jour affiché : deux boutons ronds encadrant la date,
          comme sur la référence. Le glissement reste possible. */}
      <View style={styles.dayNav}>
        <TouchableOpacity
          style={styles.navCircle}
          onPress={() => goToIndex(activeIndex - 1)}
          disabled={activeIndex === 0}
          accessibilityLabel="Jour précédent"
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color={activeIndex === 0 ? palette.textMuted : palette.text}
          />
        </TouchableOpacity>

        <View style={styles.dayTitleBlock}>
          <Text style={styles.dayTitle} numberOfLines={1}>
            {WEEKDAYS_FR[activeDay.getDay() - 1]} {String(activeDay.getDate()).padStart(2, '0')}/
            {String(activeDay.getMonth() + 1).padStart(2, '0')}
          </Text>
          <View style={styles.dayMarks}>
            {formatLocalDate(activeDay) === todayStr && (
              <Text style={[styles.todayMark, { color: theme.primary }]}>AUJOURD'HUI</Text>
            )}
            {activeMatches.length > 0 && (
              <Ionicons
                name={activeMatches.some((m) => m.carpool) ? 'car-sport' : 'sparkles'}
                size={11}
                color={palette.match}
              />
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.navCircle}
          onPress={() => goToIndex(activeIndex + 1)}
          disabled={activeIndex === weekDays.length - 1}
          accessibilityLabel="Jour suivant"
        >
          <Ionicons
            name="chevron-forward"
            size={20}
            color={activeIndex === weekDays.length - 1 ? palette.textMuted : palette.text}
          />
        </TouchableOpacity>
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
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / page.width);
              if (index !== activeIndex) setActiveIndex(index);
            }}
          >
            {/* Chaque page est dimensionnée explicitement : dans un carrousel
                horizontal, un enfant en flex:1 n'hériterait d'aucune hauteur. */}
            {weekDays.map((day) => (
              <View key={formatLocalDate(day)} style={{ width: page.width, height: page.height }}>
                <DayTimeline date={day} onSelectEvent={onSelectEvent} />
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <Text style={styles.hint}>Faites glisser pour changer de jour</Text>
    </GlassCard>
  );
}

const createStyles = (p) =>
  StyleSheet.create({
    card: { flex: 1, paddingHorizontal: 8, paddingTop: 6, paddingBottom: 6 },
    dayNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
    navCircle: {
      width: 34,
      height: 34,
      borderRadius: RADIUS.full,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1.5,
      borderColor: p.cardBorder,
    },
    dayTitleBlock: { flex: 1, alignItems: 'center' },
    dayTitle: { fontSize: 17, fontWeight: '800', color: p.text, userSelect: 'none' },
    dayMarks: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 12 },
    todayMark: { fontSize: 9, fontWeight: '800' },

    pagerWrap: { flex: 1, overflow: 'hidden' },
    hint: { fontSize: 9, color: p.textMuted, textAlign: 'center', marginTop: 2 },
  });
