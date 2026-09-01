import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppContextProvider } from './src/ctx/AppContext';
import Background from './src/components/Background';
import ScheduleScreen from './src/views/ScheduleScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContextProvider>
        <Background>
          <ScheduleScreen />
        </Background>
        <StatusBar style="dark" />
      </AppContextProvider>
    </SafeAreaProvider>
  );
}
