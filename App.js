import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LedgerProvider, useLedger } from './src/context/LedgerContext';
import RootNavigator from './src/navigation/RootNavigator';
import LockScreen from './src/screens/LockScreen';
import { LoadingScreen, ToastOverlay } from './src/components/LoadingScreen';
import { getTheme } from './src/theme/colors';

function AppContent() {
  const { ready, locked, settings } = useLedger();
  const theme = getTheme(settings.darkMode);

  if (!ready) return <LoadingScreen />;

  return (
    <>
      <StatusBar style={settings.darkMode ? 'light' : 'dark'} backgroundColor={settings.darkMode ? theme.paper : theme.ink} />
      {locked ? <LockScreen /> : <RootNavigator />}
      <ToastOverlay />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <LedgerProvider>
        <AppContent />
      </LedgerProvider>
    </SafeAreaProvider>
  );
}
