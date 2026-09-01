import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { getCourseColor, getDisplayTitle } from '../config/courseColors';
import { formatHM } from '../utils/planningTime';
import { COLORS, RADIUS, SHADOWS } from '../theme';

/**
 * Bloc de cours en aplat de couleur pleine, texte blanc : titre, salle et
 * horaire. La couleur vient du code de cours (identique en vue jour et en vue
 * semaine) ; la pastille d'angle rappelle, elle, la personne concernée.
 */
export default function CourseBlock({ event, height, width, left, compact = false }) {
  const color = getCourseColor(event.title);
  const title = getDisplayTitle(event.title);

  return (
    <View
      style={[
        styles.block,
        { top: event.top, height, backgroundColor: color },
        compact && styles.blockCompact,
        width != null && { left, width },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.title, compact && styles.titleCompact]} numberOfLines={height > 60 ? 3 : 1}>
          {title}
        </Text>
        {!!event.personAccent && (
          <View style={[styles.personDot, { backgroundColor: event.personAccent }]} />
        )}
      </View>

      {height > 44 && (
        <Text style={styles.time}>
          {formatHM(event.start)} – {formatHM(event.end)}
        </Text>
      )}
      {height > 62 && !!event.location && (
        <Text style={styles.meta} numberOfLines={1}>
          {event.location}
        </Text>
      )}
      {height > 78 && (
        <Text style={styles.person} numberOfLines={1}>
          {event.personName}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    position: 'absolute',
    left: 3,
    right: 3,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 8,
    paddingVertical: 5,
    overflow: 'hidden',
    ...SHADOWS.block,
  },
  blockCompact: { paddingHorizontal: 6, paddingVertical: 4 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  title: {
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.white,
    // Un mot n'est coupé que s'il ne tient pas seul sur une ligne.
    ...(Platform.OS === 'web' ? { wordBreak: 'normal', overflowWrap: 'break-word' } : null),
  },
  titleCompact: { fontSize: 11 },
  personDot: {
    width: 10,
    height: 10,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  time: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.95)', marginTop: 2 },
  meta: { fontSize: 10.5, fontWeight: '600', color: 'rgba(255,255,255,0.92)', marginTop: 1 },
  person: { fontSize: 10, fontStyle: 'italic', color: 'rgba(255,255,255,0.85)', marginTop: 1 },
});
