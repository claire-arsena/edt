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
export default function CourseBlock({
  event,
  height,
  width,
  left,
  density = 'full',
  centered = false,
  onPress,
}) {
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
  // L'intitulé est affiché avec son code d'UE ; en colonne étroite, le code
  // seul tient là où le libellé serait tronqué.
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

  // Ce que la hauteur permet d'afficher, dans l'ordre de la référence :
  // intitulé, salle, enseignant, horaire.
  const showTime = !micro ? height > 44 : height > 34;
  const showRoom = !micro && height > 62;
  const showTeacher = !micro && height > 82;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress?.(event)}
      style={[
        styles.block,
        { top: event.top, height, backgroundColor: color },
        centered && styles.blockCentered,
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

      {/* Disposition centrée (mobile) : la pastille de personne passe en
          angle, hors du flux, pour ne pas décaler le texte. */}
      {!!event.personAccent && !bare && centered && (
        <View style={[styles.personDotCorner, { backgroundColor: event.personAccent, borderColor: ink.dot }]} />
      )}

      {bare ? (
        isExam && <Text style={[styles.bareExam, { color: ink.strong }]}>⚠</Text>
      ) : centered ? (
        <>
          <Text
            style={[
              styles.title,
              styles.titleCentered,
              { color: ink.strong },
              compact && styles.titleCompact,
              micro && styles.titleMicro,
            ]}
            numberOfLines={height > 60 ? 3 : 2}
          >
            {isExam ? `⚠ ${title}` : title}
          </Text>

          {showRoom && !!event.location && (
            <Text style={[styles.meta, styles.metaCentered, { color: ink.strong }]} numberOfLines={1}>
              {event.location}
            </Text>
          )}
          {showTeacher && !!teachers && (
            <Text style={[styles.teacher, styles.metaCentered, { color: ink.soft }]} numberOfLines={1}>
              {teachers}
            </Text>
          )}
          {showTime && (
            <Text
              style={[styles.time, styles.metaCentered, { color: ink.soft }, micro && styles.timeMicro]}
              numberOfLines={1}
            >
              {formatHMFr(event.start)} - {formatHMFr(event.end)}
            </Text>
          )}
        </>
      ) : (
        <>
          <View style={styles.headerRow}>
            <Text
              style={[
                styles.title,
                styles.titleLeft,
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

          {showTime && (
            <Text style={[styles.timeLeft, { color: ink.strong }, micro && styles.timeMicro]} numberOfLines={1}>
              {formatHMFr(event.start)} – {formatHMFr(event.end)}
            </Text>
          )}
          {showRoom && !!event.location && (
            <Text style={[styles.meta, { color: ink.soft }]} numberOfLines={1}>
              {event.location}
            </Text>
          )}
          {showTeacher && !!teachers && (
            <Text style={[styles.teacher, { color: ink.soft }]} numberOfLines={1}>
              {teachers}
            </Text>
          )}
          {height > (teachers ? 100 : 82) && !micro && (
            <Text style={[styles.person, { color: ink.soft }]} numberOfLines={1}>
              {event.personName}
            </Text>
          )}
        </>
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
    blockCentered: { alignItems: 'center', paddingVertical: 6, borderRadius: RADIUS.md },
    blockCompact: { paddingHorizontal: 6, paddingVertical: 4 },
    blockMicro: { paddingHorizontal: 4, paddingVertical: 3, borderRadius: 7 },
    blockBare: { paddingHorizontal: 2, paddingVertical: 2, borderRadius: 5, alignItems: 'center' },
    blockExam: { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.85)' },
    glow: { backgroundColor: '#ffffff' },

    headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
    title: {
      fontSize: 12,
      fontWeight: '800',
      // Un mot n'est coupé que s'il ne tient pas seul sur une ligne.
      ...(Platform.OS === 'web' ? { wordBreak: 'normal', overflowWrap: 'break-word' } : null),
    },
    titleLeft: { flex: 1 },
    titleCentered: { textAlign: 'center' },
    titleCompact: { fontSize: 11 },
    titleMicro: { fontSize: 9, fontWeight: '700' },
    personDot: { width: 10, height: 10, borderRadius: RADIUS.full, borderWidth: 1.5, marginTop: 2 },
    personDotCorner: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 8,
      height: 8,
      borderRadius: RADIUS.full,
      borderWidth: 1.5,
      zIndex: 2,
    },
    bareExam: { fontSize: 10, fontWeight: '800', marginTop: 1 },
    time: { fontSize: 10, fontWeight: '600', fontStyle: 'italic', marginTop: 3 },
    timeLeft: { fontSize: 10, fontWeight: '700', marginTop: 2 },
    timeMicro: { fontSize: 8, marginTop: 1 },
    meta: { fontSize: 10.5, fontWeight: '600', marginTop: 2 },
    metaCentered: { textAlign: 'center', marginTop: 3 },
    teacher: { fontSize: 10, fontWeight: '600', fontStyle: 'italic', marginTop: 2 },
    person: { fontSize: 10, fontStyle: 'italic', marginTop: 1 },
  });
