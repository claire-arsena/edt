import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getCourseColor, getCourseKey, getDisplayTitle, getTextOnCourse } from '../config/courseColors';
import { isExamEvent, getExamColor } from '../config/exams';
import { useAppTheme } from '../ctx/AppContext';
import { formatHMFr } from '../utils/planningTime';
import { RADIUS } from '../theme';

/**
 * Bloc de cours en aplat de couleur pleine : titre, horaire, salle,
 * enseignant. La couleur vient de l'UE (identique en vue jour et en vue
 * semaine) ; la pastille d'angle rappelle la personne concernée.
 *
 * Un examen échappe à la couleur de son UE : il est rouge et scintille, pour
 * ne pas se fondre dans la semaine.
 */
/**
 * `density` règle ce qui tient dans le bloc, à partir de sa largeur réelle :
 *   full    — titre, horaire, salle, enseignant, personne
 *   compact — idem en plus petit
 *   micro   — titre et horaire seulement
 *   bare    — aucun texte : sous ~34 px, un mot se casserait lettre par
 *             lettre ; l'aplat de couleur et le clic suffisent
 */
export default function CourseBlock({ event, height, width, left, density = 'full', onPress }) {
  const compact = density === 'compact';
  const bare = density === 'bare';
  const { isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(), []);
  const isExam = isExamEvent(event);
  const micro = density === 'micro';
  const color = isExam ? getExamColor(isDark) : getCourseColor(event.title, isDark, event.personId);
  const ink = isExam ? { strong: '#ffffff', soft: 'rgba(255,255,255,0.9)', dot: 'rgba(255,255,255,0.9)' }
                     : getTextOnCourse(color);
  // En colonne étroite, le code d'UE ("R1.05", "S5.A&B.01") tient là où le
  // libellé serait tronqué à une lettre — et il identifie le cours aussi bien.
  const title = micro ? getCourseKey(event.title) : getDisplayTitle(event.title);
  const teachers = (event.teachers?.length ? event.teachers : event.details?.slice(0, 1) || []).join(', ');

  // Scintillement : un voile clair dont l'opacité fait des allers-retours.
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!isExam) return undefined;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 850, useNativeDriver: false }),
        Animated.timing(shimmer, { toValue: 0, duration: 850, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isExam, shimmer]);

  const glowOpacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0, 0.42] });

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress?.(event)}
      style={[
        styles.block,
        { top: event.top, height, backgroundColor: color },
        compact && styles.blockCompact,
        (micro || bare) && styles.blockMicro,
        bare && styles.blockBare,
        isExam && styles.blockExam,
        width != null && { left, width },
      ]}
    >
      {isExam && (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.glow, { opacity: glowOpacity }]}
        />
      )}

      {bare ? (
        isExam && <Text style={[styles.bareExam, { color: ink.strong }]}>⚠</Text>
      ) : (
      <View style={styles.headerRow}>
        <Text
          style={[
            styles.title,
            { color: ink.strong },
            compact && styles.titleCompact,
            micro && styles.titleMicro,
          ]}
          numberOfLines={height > 60 ? 3 : 1}
        >
          {isExam ? `⚠ ${title}` : title}
        </Text>
        {!!event.personAccent && !micro && (
          <View style={[styles.personDot, { backgroundColor: event.personAccent, borderColor: ink.dot }]} />
        )}
      </View>
      )}

      {!bare && height > (micro ? 34 : 44) && (
        <Text style={[styles.time, { color: ink.strong }, micro && styles.timeMicro]} numberOfLines={1}>
          {formatHMFr(event.start)} – {formatHMFr(event.end)}
        </Text>
      )}
      {height > 62 && !!event.location && !micro && (
        <Text style={[styles.meta, { color: ink.soft }]} numberOfLines={1}>
          {event.location}
        </Text>
      )}
      {height > 78 && !!teachers && !micro && (
        <Text style={[styles.teacher, { color: ink.soft }]} numberOfLines={1}>
          {teachers}
        </Text>
      )}
      {height > (teachers ? 96 : 78) && !micro && (
        <Text style={[styles.person, { color: ink.soft }]} numberOfLines={1}>
          {event.personName}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const createStyles = () =>
  StyleSheet.create({
    block: {
      position: 'absolute',
      left: 3,
      right: 3,
      borderRadius: RADIUS.sm,
      paddingHorizontal: 8,
      paddingVertical: 5,
      overflow: 'hidden',
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.22,
      shadowRadius: 4,
      elevation: 2,
    },
    blockCompact: { paddingHorizontal: 6, paddingVertical: 4 },
    blockMicro: { paddingHorizontal: 4, paddingVertical: 3, borderRadius: 7 },
    blockBare: { paddingHorizontal: 2, paddingVertical: 2, borderRadius: 5, alignItems: 'center' },
    blockExam: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.85)' },
    glow: { backgroundColor: '#ffffff' },

    headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
    title: {
      flex: 1,
      fontSize: 12,
      fontWeight: '800',
      // Un mot n'est coupé que s'il ne tient pas seul sur une ligne.
      ...(Platform.OS === 'web' ? { wordBreak: 'normal', overflowWrap: 'break-word' } : null),
    },
    titleCompact: { fontSize: 11 },
    titleMicro: { fontSize: 9, fontWeight: '700' },
    personDot: {
      width: 10,
      height: 10,
      borderRadius: RADIUS.full,
      borderWidth: 1.5,
      marginTop: 2,
    },
    bareExam: { fontSize: 10, fontWeight: '800', marginTop: 1 },
    time: { fontSize: 10, fontWeight: '700', marginTop: 2 },
    timeMicro: { fontSize: 8, marginTop: 1 },
    meta: { fontSize: 10.5, fontWeight: '600', marginTop: 1 },
    teacher: { fontSize: 10.5, fontWeight: '600', marginTop: 1 },
    person: { fontSize: 10, fontStyle: 'italic', marginTop: 1 },
  });
