import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { NewPlanScreen } from '../screens/NewPlanScreen';
import { MonthDetailScreen } from '../screens/MonthDetailScreen';
import { WeekDetailScreen } from '../screens/WeekDetailScreen';
import { WorkoutDetailScreen } from '../screens/WorkoutDetailScreen';
import { ActiveWorkoutScreen } from '../screens/ActiveWorkoutScreen';
import { MuscleFatigueScreen } from '../screens/MuscleFatigueScreen';
import { PerformanceAnalysisScreen } from '../screens/PerformanceAnalysisScreen';
import { MainTabNavigator } from './MainTabNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

type Props = {
  initialRouteName?: keyof RootStackParamList;
};

export function AppNavigator({ initialRouteName = 'Welcome' }: Props) {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={initialRouteName}
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
          name="NewPlan"
          component={NewPlanScreen}
          options={{ headerShown: false }}
        />
        {/* Main app shell – renders the bottom tab navigator */}
        <Stack.Screen
          name="Main"
          component={MainTabNavigator}
          options={{ headerShown: false }}
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
          name="MuscleFatigue"
          component={MuscleFatigueScreen}
          options={{ title: 'Fadiga Muscular' }}
        />
        <Stack.Screen
          name="PerformanceAnalysis"
          component={PerformanceAnalysisScreen}
          options={{ title: 'Análise de Desempenho' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
