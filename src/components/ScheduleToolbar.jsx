import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../ctx/AppContext';
import GlassCard from './GlassCard';
import { RADIUS } from '../theme';

/**
 * Barre de navigation commune aux deux vues : jour ou semaine précédent /
 * suivant, libellé de la période, ouverture du calendrier et choix de la vue.
 * La même barre sert sur mobile et sur PC pour que les deux vues se pilotent
 * de façon identique.
 */
export default function ScheduleToolbar({
  label,
  hint,
  viewMode,
  onChangeView,
  onPrev,
  onNext,
  onToday,
  onOpenCalendar,
  compact = false,
}) {
  const { theme, palette, syncedAt, isSyncing, syncFailed, syncSchedules } = useAppTheme();

  // Fraîcheur des données : heure de la dernière récupération réussie, ou
  // l'invitation à réessayer si aucune n'a abouti.
  const syncLabel = isSyncing
    ? 'Sync…'
    : syncFailed
      ? 'Réessayer'
      : syncedAt
        ? new Date(syncedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        : 'Actualiser';
  const syncColor = isSyncing
    ? palette.textMuted
    : syncFailed
      ? palette.now
      : syncedAt
        ? palette.match
        : palette.textMuted;
  const styles = useMemo(() => createStyles(palette), [palette]);

  return (
    <GlassCard style={[styles.card, compact && styles.cardCompact]}>
      <View style={styles.navRow}>
        <TouchableOpacity
          onPress={onPrev}
          style={[styles.navBtn, { backgroundColor: theme.tint }]}
          accessibilityLabel={viewMode === 'week' ? 'Semaine précédente' : 'Jour précédent'}
        >
          <Ionicons name="chevron-back" size={18} color={theme.primary} />
        </TouchableOpacity>

        {/* Le libellé ramène à aujourd'hui : un bouton de moins à l'écran. */}
        <TouchableOpacity style={styles.labelBlock} onPress={onToday} accessibilityLabel="Revenir à aujourd'hui">
          <Text style={[styles.label, compact && styles.labelCompact]} numberOfLines={1}>
            {label}
          </Text>
          {!!hint && <Text style={[styles.hint, { color: theme.primary }]}>{hint}</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onNext}
          style={[styles.navBtn, { backgroundColor: theme.tint }]}
          accessibilityLabel={viewMode === 'week' ? 'Semaine suivante' : 'Jour suivant'}
        >
          <Ionicons name="chevron-forward" size={18} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.actionRow}>
        <View style={styles.leftActions}>
          <TouchableOpacity
            onPress={onOpenCalendar}
            style={styles.calendarBtn}
            accessibilityLabel="Ouvrir le calendrier"
          >
            <Ionicons name="calendar-outline" size={15} color={palette.text} />
            <Text style={styles.calendarText}>Calendrier</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={syncSchedules}
            disabled={isSyncing}
            style={styles.syncBtn}
            accessibilityLabel="Actualiser les emplois du temps"
          >
            <Ionicons
              name={
                isSyncing ? 'sync' : syncFailed ? 'alert-circle-outline'
                  : syncedAt ? 'checkmark-circle-outline' : 'refresh-outline'
              }
              size={14}
              color={syncColor}
            />
            <Text style={[styles.syncText, { color: syncColor }]}>{syncLabel}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.segment}>
          {[
            { key: 'day', label: 'Jour' },
            { key: 'week', label: 'Semaine' },
          ].map((option) => {
            const active = viewMode === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                onPress={() => onChangeView(option.key)}
                style={[styles.segmentBtn, active && { backgroundColor: theme.primary }]}
                accessibilityLabel={`Vue ${option.label}`}
              >
                <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </GlassCard>
  );
}

const createStyles = (p) =>
  StyleSheet.create({
    card: { paddingVertical: 8, paddingHorizontal: 10, gap: 6 },
    cardCompact: { paddingVertical: 6, paddingHorizontal: 8, gap: 5 },

    navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    navBtn: { padding: 6, borderRadius: RADIUS.full },
    labelBlock: { alignItems: 'center', flex: 1 },
    label: { fontSize: 14, fontWeight: '800', color: p.text },
    labelCompact: { fontSize: 13 },
    hint: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', marginTop: 1 },

    actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    calendarBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: RADIUS.full,
      borderWidth: 1,
      borderColor: p.cardBorder,
    },
    calendarText: { fontSize: 11, fontWeight: '700', color: p.text },
    leftActions: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    syncBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 4 },
    syncText: { fontSize: 10, fontWeight: '700', color: p.textMuted },

    segment: {
      flexDirection: 'row',
      borderRadius: RADIUS.full,
      borderWidth: 1,
      borderColor: p.cardBorder,
      overflow: 'hidden',
    },
    segmentBtn: { paddingHorizontal: 12, paddingVertical: 4 },
    segmentText: { fontSize: 11, fontWeight: '700', color: p.textMuted },
    segmentTextActive: { color: '#fff' },
  });
