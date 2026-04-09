import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import BubblePopScreen from '../screens/BubblePopScreen';
import AnimalSoundsScreen from '../screens/AnimalSoundsScreen';
import ShapesScreen from '../screens/ShapesScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        gestureEnabled: false, // toddlers shouldn't accidentally swipe back
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="BubblePop" component={BubblePopScreen} />
      <Stack.Screen name="AnimalSounds" component={AnimalSoundsScreen} />
      <Stack.Screen name="Shapes" component={ShapesScreen} />
    </Stack.Navigator>
  );
}
