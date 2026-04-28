import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppNavigator } from './src/navigation/AppNavigator';
import { SplashScreen } from './src/screens/SplashScreen';

export default function App() {
  const [splashDone, setSplashDone] = useState(false);
  const [initialRouteName, setInitialRouteName] = useState<'Welcome' | 'Main'>('Welcome');
  const [bootDone, setBootDone] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const storedPlan = await AsyncStorage.getItem('@gymapp_plan');
        if (storedPlan) {
          // Validate that the plan has the required fields before directing
          // to the Main tab — a missing userProfile would crash HomeScreen.
          try {
            const parsed = JSON.parse(storedPlan);
            if (parsed?.userProfile && Array.isArray(parsed?.monthlyBlocks)) {
              setInitialRouteName('Main');
            }
          } catch {
            // Malformed JSON — treat as no plan, user will see Welcome
          }
        }
      } finally {
        setBootDone(true);
      }
    })();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {bootDone ? <AppNavigator initialRouteName={initialRouteName} /> : null}
      {(!splashDone || !bootDone) && <SplashScreen onFinish={() => setSplashDone(true)} />}
    </SafeAreaProvider>
  );
}
