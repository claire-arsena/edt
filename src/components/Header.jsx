import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../ctx/AppContext';
import { RADIUS, THEMES } from '../theme';

// Icône et libellé du bouton de thème selon le mode courant.
const MODE_UI = {
  auto:  { icon: 'contrast-outline', label: 'Thème : automatique (réglage du système)' },
  light: { icon: 'sunny-outline',    label: 'Thème : clair' },
  dark:  { icon: 'moon-outline',     label: 'Thème : sombre' },
};

/**
 * En-tête : titre, choix indicatif du profil (Claire / Alban / Clara),
 * bascule clair / sombre et sélecteur de couleur d'accent. Aucun mot de
 * passe : l'app ne fait qu'afficher trois emplois du temps déjà publiés par
 * l'université, le profil sert seulement à repérer ses propres cours.
 */
export default function Header({ isDesktop }) {
  const { people, profileId, chooseProfile, theme, themeKey, changeTheme, mode, cycleMode, isDark, palette } =
    useAppTheme();
  const styles = useMemo(() => createStyles(palette), [palette]);
  const modeUi = MODE_UI[mode] || MODE_UI.auto;

  return (
    <View style={[styles.wrap, isDesktop && styles.wrapDesktop]}>
      <View style={styles.titleRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Emplois du temps</Text>
          <Text style={styles.subtitle}>
            {profileId
              ? `Profil : ${people.find((p) => p.id === profileId)?.name}`
              : 'Claire · Alban · Clara'}
          </Text>
        </View>

        <View style={styles.controls}>
          <TouchableOpacity
            onPress={cycleMode}
            style={styles.modeBtn}
            accessibilityLabel={modeUi.label}
          >
            <Ionicons name={modeUi.icon} size={17} color={theme.primary} />
            {/* Sur mobile, l'icône seule : le titre tient alors sur une ligne. */}
            {isDesktop && (
              <Text style={[styles.modeText, { color: theme.primary }]}>
                {mode === 'auto' ? 'Auto' : mode === 'dark' ? 'Sombre' : 'Clair'}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.themeRow}>
            {Object.values(THEMES).map((t) => {
              const swatch = isDark ? t.dark.primary : t.light.primary;
              return (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => changeTheme(t.key)}
                  style={[
                    styles.themeDot,
                    { backgroundColor: swatch },
                    themeKey === t.key && styles.themeDotActive,
                  ]}
                  accessibilityLabel={`Accent ${t.name}`}
                />
              );
            })}
          </View>
        </View>
      </View>

      <View style={styles.profileRow}>
        <Ionicons name="person-circle-outline" size={16} color={palette.textMuted} />
        <Text style={styles.profileLabel}>Je suis</Text>
        {people.map((p) => {
          const active = profileId === p.id;
          return (
            <TouchableOpacity
              key={p.id}
              onPress={() => chooseProfile(p.id)}
              style={[styles.profileChip, active && { backgroundColor: theme.tint, borderColor: theme.primary }]}
            >
              <Text style={[styles.profileChipText, active && { color: theme.primary }]}>{p.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const createStyles = (p) =>
  StyleSheet.create({
    wrap: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
    wrapDesktop: { paddingHorizontal: 24, paddingTop: 18 },
    titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    titleBlock: { flexShrink: 1 },
    title: { fontSize: 22, fontWeight: '800', color: p.text, letterSpacing: -0.4 },
    subtitle: { fontSize: 12, fontWeight: '600', color: p.textMuted, marginTop: 2 },

    controls: { flexDirection: 'row', alignItems: 'center', gap: 12, flexShrink: 0 },
    modeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: RADIUS.full,
      borderWidth: 1,
      borderColor: p.cardBorder,
      backgroundColor: p.card,
    },
    modeText: { fontSize: 12, fontWeight: '700' },

    themeRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
    themeDot: {
      width: 18,
      height: 18,
      borderRadius: RADIUS.full,
      borderWidth: 2,
      borderColor: 'transparent',
      opacity: 0.45,
    },
    themeDotActive: { opacity: 1, borderColor: p.cardBorder },

    profileRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' },
    profileLabel: { fontSize: 12, fontWeight: '700', color: p.textMuted, marginRight: 2 },
    profileChip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: RADIUS.full,
      borderWidth: 1,
      borderColor: p.cardBorder,
      backgroundColor: p.card,
    },
    profileChipText: { fontSize: 12, fontWeight: '700', color: p.textLight },
  });
