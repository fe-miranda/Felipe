import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { MonthDetailScreen } from '../screens/MonthDetailScreen';
import { WeekDetailScreen } from '../screens/WeekDetailScreen';
import { WorkoutDetailScreen } from '../screens/WorkoutDetailScreen';
import { ActiveWorkoutScreen } from '../screens/ActiveWorkoutScreen';
import { WorkoutHistoryScreen } from '../screens/WorkoutHistoryScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { MuscleFatigueScreen } from '../screens/MuscleFatigueScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Welcome"
        screenOptions={{
          headerStyle: { backgroundColor: '#1a1a24' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: '#0f0f14' },
        }}
      >
        <Stack.Screen
          name="Welcome"
          component={WelcomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Meu Plano', headerShown: false }}
        />
        <Stack.Screen
          name="MonthDetail"
          component={MonthDetailScreen}
          options={({ route }) => ({
            title: `Mês ${(route.params as any).monthIndex + 1}`,
          })}
        />
        <Stack.Screen
          name="WeekDetail"
          component={WeekDetailScreen}
          options={{ title: 'Detalhes da Semana' }}
        />
        <Stack.Screen
          name="WorkoutDetail"
          component={WorkoutDetailScreen}
          options={{ title: 'Treino do Dia' }}
        />
        <Stack.Screen
          name="ActiveWorkout"
          component={ActiveWorkoutScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="WorkoutHistory"
          component={WorkoutHistoryScreen}
          options={{ title: 'Histórico de Treinos' }}
        />
        <Stack.Screen
          name="MuscleFatigue"
          component={MuscleFatigueScreen}
          options={{ title: 'Fadiga Muscular' }}
        />
        <Stack.Screen
          name="Chat"
          component={ChatScreen}
          options={{ title: 'Chat com IA' }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Configurações' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
