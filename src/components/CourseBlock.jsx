import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { getCourseColor, getDisplayTitle } from '../config/courseColors';
import { useAppTheme } from '../ctx/AppContext';
import { formatHM } from '../utils/planningTime';
import { RADIUS } from '../theme';

/**
 * Bloc de cours en aplat de couleur pleine, texte blanc : titre, salle et
 * horaire. La couleur vient du code de cours (identique en vue jour et en vue
 * semaine) ; la pastille d'angle rappelle, elle, la personne concernée.
 */
export default function CourseBlock({ event, height, width, left, compact = false }) {
  const { palette, shadows, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(palette, shadows), [palette, shadows]);
  const color = getCourseColor(event.title, isDark);
  const title = getDisplayTitle(event.title);
  // Les enseignants viennent de la DESCRIPTION du flux ; à défaut de nom
  // reconnu, on retombe sur la première ligne utile de la description.
  const teachers = (event.teachers?.length ? event.teachers : event.details?.slice(0, 1) || []).join(', ');

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
      {height > 78 && !!teachers && (
        <Text style={styles.teacher} numberOfLines={1}>
          {teachers}
        </Text>
      )}
      {height > (teachers ? 96 : 78) && (
        <Text style={styles.person} numberOfLines={1}>
          {event.personName}
        </Text>
      )}
    </View>
  );
}

const createStyles = (p, shadows) =>
  StyleSheet.create({
    block: {
      position: 'absolute',
      left: 3,
      right: 3,
      borderRadius: RADIUS.sm,
      paddingHorizontal: 8,
      paddingVertical: 5,
      overflow: 'hidden',
      ...shadows.block,
    },
    blockCompact: { paddingHorizontal: 6, paddingVertical: 4 },
    headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
    title: {
      flex: 1,
      fontSize: 12,
      fontWeight: '800',
      color: p.onColor,
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
    time: { fontSize: 10, fontWeight: '700', color: p.onColor, marginTop: 2 },
    meta: { fontSize: 10.5, fontWeight: '600', color: p.onColorSoft, marginTop: 1 },
    teacher: { fontSize: 10.5, fontWeight: '600', color: p.onColorSoft, marginTop: 1 },
    person: { fontSize: 10, fontStyle: 'italic', color: p.onColorSoft, marginTop: 1 },
  });
