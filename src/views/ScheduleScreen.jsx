import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../ctx/AppContext';
import { DESKTOP_BREAKPOINT, DAYS_FR, MONTHS_FR, MONTHS_SHORT_FR } from '../config/constants';
import Header from '../components/Header';
import PeopleFilter from '../components/PeopleFilter';
import ScheduleToolbar from '../components/ScheduleToolbar';
import MonthPickerModal from '../components/MonthPickerModal';
import CourseDetailModal from '../components/CourseDetailModal';
import DayView from './DayView';
import WeekView from './WeekView';
import WeekPager from './WeekPager';
import { addDays, formatLocalDate, getMonday } from '../utils/planningTime';

const capitalizeFirst = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/**
 * Jour sur lequel ouvrir l'app : celui du jour s'il est ouvré, sinon le lundi
 * qui suit. Un samedi, la semaine écoulée n'a plus d'intérêt et la journée
 * elle-même est vide ; c'est la rentrée du lundi qu'on vient consulter.
 */
function openingDay(now = new Date()) {
  const d = new Date(now);
  const weekday = d.getDay(); // 0 = dimanche, 6 = samedi
  if (weekday === 6) d.setDate(d.getDate() + 2);
  else if (weekday === 0) d.setDate(d.getDate() + 1);
  return d;
}

/**
 * Écran unique de l'app. Il détient la date consultée et la vue active
 * (jour ou semaine), pour que la barre de navigation, le calendrier et les
 * deux vues restent d'accord : changer de vue conserve la date, choisir une
 * date dans le calendrier fonctionne dans les deux vues.
 *
 * La vue par défaut découle de la largeur de la fenêtre — semaine sur PC,
 * jour sur mobile — jusqu'à ce qu'un choix explicite soit mémorisé.
 */
export default function ScheduleScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { isLoaded, viewMode, chooseView, dataVersion, syncSchedules } = useAppTheme();
  const isDesktop = width >= DESKTOP_BREAKPOINT;

  const [date, setDate] = useState(openingDay);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Une app web rouverte le lendemain reprend l'état laissé la veille : au
  // retour au premier plan, si la date a changé, on se replace sur le jour du
  // jour plutôt que de rester sur celui de la dernière consultation.
  const lastActiveRef = useRef(new Date());
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      const now = new Date();
      if (formatLocalDate(lastActiveRef.current) !== formatLocalDate(now)) {
        setDate(openingDay(now));
      }
      lastActiveRef.current = now;
      // Revenir à l'app vaut relancement : on rappelle les flux.
      syncSchedules();
    });
    return () => subscription.remove();
  }, [syncSchedules]);

  const activeView = viewMode || (isDesktop ? 'week' : 'day');
  const isWeek = activeView === 'week';

  const { label, hint } = useMemo(() => {
    if (isWeek) {
      const start = getMonday(date);
      const end = addDays(start, 4);
      const sameWeek = formatLocalDate(getMonday(new Date())) === formatLocalDate(start);
      return {
        label:
          `lun. ${start.getDate()} ${MONTHS_SHORT_FR[start.getMonth()]} → ` +
          `ven. ${end.getDate()} ${MONTHS_SHORT_FR[end.getMonth()]} ${end.getFullYear()}`,
        hint: sameWeek ? 'CETTE SEMAINE' : '↩ REVENIR À CETTE SEMAINE',
      };
    }
    const isToday = formatLocalDate(date) === formatLocalDate(new Date());
    return {
      label: capitalizeFirst(
        `${DAYS_FR[date.getDay()]} ${date.getDate()} ${MONTHS_FR[date.getMonth()]} ${date.getFullYear()}`
      ),
      hint: isToday ? "AUJOURD'HUI" : "↩ REVENIR À AUJOURD'HUI",
    };
  }, [date, isWeek]);

  // Le temps de relire les préférences (personnes affichées, thème, vue), on
  // ne rend rien : évite un clignotement au premier affichage.
  if (!isLoaded) return <View style={styles.container} />;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Header isDesktop={isDesktop} />

      <View style={[styles.body, isDesktop && styles.bodyDesktop]}>
        <View style={[styles.controls, isDesktop && styles.controlsDesktop]}>
          <ScheduleToolbar
            label={label}
            hint={hint}
            viewMode={activeView}
            onChangeView={chooseView}
            onPrev={() => setDate(addDays(date, isWeek ? -7 : -1))}
            onNext={() => setDate(addDays(date, isWeek ? 7 : 1))}
            onToday={() => setDate(new Date())}
            onOpenCalendar={() => setPickerOpen(true)}
            compact={!isDesktop}
          />
          <PeopleFilter compact={!isDesktop} style={styles.filter} />
        </View>

        {/* `key` : quand les flux sont actualisés, les vues se remontent pour
            recalculer leurs créneaux à partir des nouvelles données. */}
        {isWeek ? (
          // Sur PC, la semaine tient en cinq colonnes ; sur mobile, elle se
          // parcourt jour par jour, chacun sur toute la largeur.
          isDesktop ? (
            <WeekView key={dataVersion} date={date} isDesktop onSelectEvent={setSelectedEvent} />
          ) : (
            <WeekPager key={dataVersion} date={date} onSelectEvent={setSelectedEvent} />
          )
        ) : (
          <DayView
            key={dataVersion}
            date={date}
            isDesktop={isDesktop}
            onSelectEvent={setSelectedEvent}
          />
        )}
      </View>

      <MonthPickerModal
        visible={pickerOpen}
        date={date}
        onSelect={(d) => {
          setDate(d);
          setPickerOpen(false);
        }}
        onClose={() => setPickerOpen(false)}
      />

      <CourseDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 12, paddingBottom: 10, gap: 8 },
  bodyDesktop: { paddingHorizontal: 24, paddingBottom: 16, gap: 12 },
  controls: { gap: 8 },
  controlsDesktop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  filter: { flexGrow: 0 },
});
