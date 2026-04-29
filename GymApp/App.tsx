import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppNavigator } from './src/navigation/AppNavigator';
import { SplashScreen } from './src/screens/SplashScreen';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { setRuntimeApiKey, setProvider, setGeminiApiKey } from './src/services/aiService';

const CUSTOM_KEY_STORAGE = '@gymapp_custom_apikey';
const PROVIDER_STORAGE = '@gymapp_provider';
const GEMINI_KEY_STORAGE = '@gymapp_gemini_apikey';

export default function App() {
  const [splashDone, setSplashDone] = useState(false);
  const [initialRouteName, setInitialRouteName] = useState<'Welcome' | 'Main'>('Welcome');
  const [bootDone, setBootDone] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [storedPlan, storedKey, storedProvider, storedGeminiKey] = await Promise.all([
          AsyncStorage.getItem('@gymapp_plan'),
          AsyncStorage.getItem(CUSTOM_KEY_STORAGE),
          AsyncStorage.getItem(PROVIDER_STORAGE),
          AsyncStorage.getItem(GEMINI_KEY_STORAGE),
        ]);
        if (storedPlan) setInitialRouteName('Main');
        if (storedKey) setRuntimeApiKey(storedKey);
        if (storedGeminiKey) setGeminiApiKey(storedGeminiKey);
        if (storedProvider === 'groq' || storedProvider === 'gemini') {
          setProvider(storedProvider);
        }
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
