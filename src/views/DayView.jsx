import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../ctx/AppContext';
import { getMergedSchedule, getDayMatches } from '../config/schedules';
import { getCourseColor } from '../config/courseColors';
import { DAYS_FR, MONTHS_FR } from '../config/constants';
import GlassCard from '../components/GlassCard';
import DayTimeline from '../components/DayTimeline';
import MatchBanner from '../components/MatchBanner';
import { RADIUS } from '../theme';
import { formatLocalDate } from '../utils/planningTime';

/** Vue jour : une seule journée, sur toute la largeur. */
export default function DayView({ date, isDesktop, onSelectEvent }) {
  const { visiblePeople, palette, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);

  const dateStr = formatLocalDate(date);
  const dayLabel = `${DAYS_FR[date.getDay()]} ${date.getDate()} ${MONTHS_FR[date.getMonth()]}`;

  const events = useMemo(() => getMergedSchedule(visiblePeople), [visiblePeople]);
  const allDayEvents = useMemo(
    () => events.filter((e) => e.allDay && formatLocalDate(new Date(e.start)) === dateStr),
    [events, dateStr]
  );
  const matches = useMemo(() => getDayMatches(dateStr, visiblePeople), [dateStr, visiblePeople]);

  return (
    <View style={styles.container}>
      <MatchBanner compact={!isDesktop} matches={matches} dateLabel={dayLabel} style={styles.banner} />

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
        <DayTimeline date={date} onSelectEvent={onSelectEvent} />
      </GlassCard>
    </View>
  );
}

const createStyles = (p) =>
  StyleSheet.create({
    container: { flex: 1, gap: 8 },
    banner: { flexGrow: 0 },
    allDayRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
    allDayChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.sm },
    allDayText: { fontSize: 11, fontWeight: '700', color: '#fff' },
    timelineCard: { flex: 1, paddingHorizontal: 10, paddingTop: 6, paddingBottom: 10 },
  });
