import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { MonthDetailScreen } from '../screens/MonthDetailScreen';
import { WeekDetailScreen } from '../screens/WeekDetailScreen';
import { WorkoutDetailScreen } from '../screens/WorkoutDetailScreen';
import { ChatScreen } from '../screens/ChatScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Onboarding"
        screenOptions={{
          headerStyle: { backgroundColor: '#1a1a24' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: '#0f0f14' },
        }}
      >
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
          name="Chat"
          component={ChatScreen}
          options={{ title: 'Chat com IA' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
