import React from 'react';
import { Text, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from '../types';
import { HomeScreen } from '../screens/HomeScreen';
import { WorkoutHistoryScreen } from '../screens/WorkoutHistoryScreen';
import { ChatScreen } from '../screens/ChatScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

const C = {
  bg: '#0F0F1A',
  border: '#1E1E30',
  primary: '#7C3AED',
  inactive: '#475569',
  active: '#A78BFA',
};

type TabIconProps = { focused: boolean };

const icons: Record<keyof MainTabParamList, { active: string; inactive: string }> = {
  Inicio:         { active: '🏠', inactive: '🏠' },
  WorkoutHistory: { active: '📋', inactive: '📋' },
  Chat:           { active: '🤖', inactive: '🤖' },
  Settings:       { active: '⚙️',  inactive: '⚙️' },
};

const labels: Record<keyof MainTabParamList, string> = {
  Inicio:         'Início',
  WorkoutHistory: 'Histórico',
  Chat:           'Coach IA',
  Settings:       'Config',
};

function tabIcon(name: keyof MainTabParamList) {
  return ({ focused }: TabIconProps) => (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.55 }}>
      {icons[name][focused ? 'active' : 'inactive']}
    </Text>
  );
}

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.bg,
          borderTopColor: C.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 60,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarActiveTintColor: C.active,
        tabBarInactiveTintColor: C.inactive,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Inicio"
        component={HomeScreen}
        options={{
          tabBarLabel: labels.Inicio,
          tabBarIcon: tabIcon('Inicio'),
        }}
      />
      <Tab.Screen
        name="WorkoutHistory"
        component={WorkoutHistoryScreen}
        options={{
          tabBarLabel: labels.WorkoutHistory,
          tabBarIcon: tabIcon('WorkoutHistory'),
        }}
      />
      <Tab.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          tabBarLabel: labels.Chat,
          tabBarIcon: tabIcon('Chat'),
          tabBarBadge: undefined,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: labels.Settings,
          tabBarIcon: tabIcon('Settings'),
        }}
      />
    </Tab.Navigator>
  );
}
