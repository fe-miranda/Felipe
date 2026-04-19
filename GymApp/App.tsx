import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppNavigator } from './src/navigation/AppNavigator';
import { SplashScreen } from './src/screens/SplashScreen';

export default function App() {
  const [splashDone, setSplashDone] = useState(false);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AppNavigator />
      {!splashDone && <SplashScreen onFinish={() => setSplashDone(true)} />}
    </SafeAreaProvider>
  );
}
