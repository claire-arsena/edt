import React, { useMemo } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getCourseColor, getTextOnCourse } from '../config/courseColors';
import { useAppTheme } from '../ctx/AppContext';
import { DAYS_FR, MONTHS_FR } from '../config/constants';
import { formatHMFr } from '../utils/planningTime';
import { RADIUS, getShadows } from '../theme';

/**
 * Détail d'un cours, ouvert au clic sur un créneau : intitulé complet, date et
 * horaire en toutes lettres, enseignants, salle, et le reste de la description
 * du flux (groupe, précisions) pour ne rien perdre de ce qu'annonce l'ADE.
 */
export default function CourseDetailModal({ event, onClose }) {
  const { isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(), []);

  if (!event) return null;

  const color = getCourseColor(event.title, isDark, event.personId);
  const ink = getTextOnCourse(color);
  const start = new Date(event.start);
  const dateLabel =
    `${DAYS_FR[start.getDay()]} ${String(start.getDate()).padStart(2, '0')} ${MONTHS_FR[start.getMonth()]}`;

  const teachers = event.teachers || [];
  // Lignes de description qui ne sont ni un enseignant déjà affiché, ni la
  // salle : groupe, promotion, remarques…
  const extra = (event.details || []).filter(
    (line) => !teachers.some((t) => line.includes(t)) && line !== event.location
  );

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {/* Le clic à l'intérieur de la carte ne referme pas la fenêtre. */}
        <Pressable style={[styles.card, { backgroundColor: color }]} onPress={() => {}}>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityLabel="Fermer">
            <Ionicons name="close" size={18} color={ink.strong} />
          </TouchableOpacity>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={[styles.title, { color: ink.strong }]}>{event.title}</Text>

            <Text style={[styles.when, { color: ink.strong }]}>
              {dateLabel} · {formatHMFr(event.start)} – {formatHMFr(event.end)}
            </Text>

            {teachers.length > 0 && <Text style={[styles.teacher, { color: ink.strong }]}>{teachers.join(', ')}</Text>}

            {!!event.location && <Text style={[styles.room, { color: ink.strong }]}>{event.location}</Text>}

            {extra.map((line, i) => (
              <Text key={i} style={[styles.extra, { color: ink.soft }]}>
                {line}
              </Text>
            ))}

            <View style={styles.personRow}>
              <View style={[styles.personDot, { backgroundColor: event.personAccent, borderColor: ink.dot }]} />
              <Text style={[styles.person, { color: ink.soft }]}>Emploi du temps de {event.personName}</Text>
            </View>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const createStyles = () =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    card: {
      width: '100%',
      maxWidth: 460,
      maxHeight: '80%',
      borderRadius: RADIUS.xl,
      paddingVertical: 24,
      paddingHorizontal: 20,
      ...getShadows(true).glass,
    },
    closeBtn: {
      position: 'absolute',
      top: 10,
      right: 10,
      width: 28,
      height: 28,
      borderRadius: RADIUS.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(127,127,127,0.25)',
      zIndex: 2,
    },
    content: { alignItems: 'center', gap: 10, paddingHorizontal: 8 },
    title: { fontSize: 17, fontWeight: '800', color: '#fff', textAlign: 'center' },
    when: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.95)', textAlign: 'center' },
    teacher: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.95)', textAlign: 'center' },
    room: {
      fontSize: 14,
      fontWeight: '700',
      color: '#fff',
      textAlign: 'center',
      textDecorationLine: 'underline',
    },
    extra: { fontSize: 13, fontStyle: 'italic', color: 'rgba(255,255,255,0.85)', textAlign: 'center' },
    personRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
    personDot: { width: 9, height: 9, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.9)' },
    person: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  });
