import React, { useContext } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../ctx/AppContext';
import { COLORS, RADIUS, THEMES } from '../theme';

/**
 * En-tête : titre, choix indicatif du profil (Claire / Alban / Clara) et
 * sélecteur de couleur d'accent. Aucun mot de passe : l'app ne fait
 * qu'afficher trois emplois du temps déjà publics côté université, le profil
 * sert seulement à repérer ses propres cours d'un coup d'œil.
 */
export default function Header({ isDesktop }) {
  const { people, profileId, chooseProfile, theme, themeKey, changeTheme } = useContext(AppContext);

  return (
    <View style={[styles.wrap, isDesktop && styles.wrapDesktop]}>
      <View style={styles.titleRow}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Emplois du temps</Text>
          <Text style={styles.subtitle}>
            {profileId ? `Connectée en tant que ${people.find((p) => p.id === profileId)?.name}` : 'Claire · Alban · Clara'}
          </Text>
        </View>

        <View style={styles.themeRow}>
          {Object.values(THEMES).map((t) => (
            <TouchableOpacity
              key={t.key}
              onPress={() => changeTheme(t.key)}
              style={[
                styles.themeDot,
                { backgroundColor: t.primary },
                themeKey === t.key && styles.themeDotActive,
              ]}
              accessibilityLabel={`Thème ${t.name}`}
            />
          ))}
        </View>
      </View>

      <View style={styles.profileRow}>
        <Ionicons name="person-circle-outline" size={16} color={COLORS.textMuted} />
        <Text style={styles.profileLabel}>Je suis</Text>
        {people.map((p) => {
          const active = profileId === p.id;
          return (
            <TouchableOpacity
              key={p.id}
              onPress={() => chooseProfile(p.id)}
              style={[
                styles.profileChip,
                active && { backgroundColor: theme.tint, borderColor: theme.primary },
              ]}
            >
              <Text style={[styles.profileChipText, active && { color: theme.primary }]}>{p.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 4 },
  wrapDesktop: { paddingHorizontal: 24, paddingTop: 18 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleBlock: { flexShrink: 1 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.text, letterSpacing: -0.4 },
  subtitle: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted, marginTop: 2 },

  themeRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  themeDot: {
    width: 18,
    height: 18,
    borderRadius: RADIUS.full,
    borderWidth: 2,
    borderColor: 'transparent',
    opacity: 0.45,
  },
  themeDotActive: { opacity: 1, borderColor: 'rgba(0,0,0,0.18)' },

  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  profileLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, marginRight: 2 },
  profileChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.card,
  },
  profileChipText: { fontSize: 12, fontWeight: '700', color: COLORS.textLight },
});
