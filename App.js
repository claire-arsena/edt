import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppContextProvider, useAppTheme } from './src/ctx/AppContext';
import Background from './src/components/Background';
import ScheduleScreen from './src/views/ScheduleScreen';

function ThemedApp() {
  const { isDark, palette } = useAppTheme();

  // Sur le web, la couleur de fond de la page et la barre du navigateur
  // suivent le thème choisi dans l'app (et pas seulement le réglage système).
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.body.style.backgroundColor = palette.appBg;
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', palette.screenBg);
  }, [isDark, palette]);

  return (
    <>
      <Background>
        <ScheduleScreen />
      </Background>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContextProvider>
        <ThemedApp />
      </AppContextProvider>
    </SafeAreaProvider>
  );
}
