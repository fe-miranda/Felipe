import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppNavigator } from './src/navigation/AppNavigator';
import { SplashScreen } from './src/screens/SplashScreen';
import { ErrorBoundary } from './src/components/ErrorBoundary';

export default function App() {
  const [splashDone, setSplashDone] = useState(false);
  const [initialRouteName, setInitialRouteName] = useState<'Welcome' | 'Main'>('Welcome');
  const [bootDone, setBootDone] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const storedPlan = await AsyncStorage.getItem('@gymapp_plan');
        if (storedPlan) setInitialRouteName('Main');
      } catch {
        // storage error — boot as Welcome
      } finally {
        setBootDone(true);
      }
    })();
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <StatusBar style="light" />
        {bootDone ? <AppNavigator initialRouteName={initialRouteName} /> : null}
        {(!splashDone || !bootDone) && <SplashScreen onFinish={() => setSplashDone(true)} />}
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
