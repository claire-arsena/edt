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

  return (
    <GlassCard style={styles.card}>
      <View style={styles.pageHeader}>
        {weekDays.map((day, i) => {
          const dateStr = formatLocalDate(day);
          const active = i === activeIndex;
          const matches = getDayMatches(dateStr, visiblePeople);
          return (
            <TouchableOpacity
              key={dateStr}
              style={[styles.pageTab, active && { backgroundColor: theme.tint }]}
              onPress={() => {
                setActiveIndex(i);
                scrollRef.current?.scrollTo({ x: i * page.width, animated: true });
              }}
              accessibilityLabel={`Aller au ${WEEKDAYS_FR[day.getDay() - 1]} ${dateStr}`}
            >
              <Text style={[styles.tabName, active && { color: theme.primary }]} numberOfLines={1}>
                {WEEKDAYS_FR[day.getDay() - 1].slice(0, 3)}
              </Text>
              <Text
                style={[
                  styles.tabDate,
                  active && { color: theme.primary, fontWeight: '800' },
                  dateStr === todayStr && styles.tabToday,
                ]}
              >
                {String(day.getDate()).padStart(2, '0')}/{String(day.getMonth() + 1).padStart(2, '0')}
              </Text>
              {matches.length > 0 && (
                <Ionicons
                  name={matches.some((m) => m.carpool) ? 'car-sport' : 'sparkles'}
                  size={9}
                  color={palette.match}
                />
              )}
            </TouchableOpacity>
          );
        })}
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

      <Text style={styles.hint}>Faites glisser ou touchez un jour</Text>
    </GlassCard>
  );
}

const createStyles = (p) =>
  StyleSheet.create({
    card: { flex: 1, paddingHorizontal: 8, paddingTop: 6, paddingBottom: 6 },
    pageHeader: { flexDirection: 'row', gap: 3, marginBottom: 4 },
    pageTab: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 3,
      borderRadius: RADIUS.sm,
    },
    tabName: { fontSize: 10, fontWeight: '800', color: p.text, textTransform: 'uppercase', userSelect: 'none' },
    tabDate: { fontSize: 9, color: p.textMuted },
    tabToday: { textDecorationLine: 'underline' },

    pagerWrap: { flex: 1, overflow: 'hidden' },
    hint: { fontSize: 9, color: p.textMuted, textAlign: 'center', marginTop: 2 },
  });
