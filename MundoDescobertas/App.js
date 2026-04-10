import 'react-native-gesture-handler'; // must be first for production APK

import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';

// Catches any unhandled JS error and shows a friendly restart button
// instead of letting Android show the "app has constant failures" dialog
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errBox}>
          <Text style={styles.errEmoji}>😔</Text>
          <Text style={styles.errMsg}>Ops! Algo deu errado.</Text>
          <TouchableOpacity
            style={styles.errBtn}
            onPress={() => this.setState({ hasError: false })}
          >
            <Text style={styles.errBtnTxt}>Tentar de novo</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.flex}>
        <ErrorBoundary>
          <NavigationContainer>
            <StatusBar style="light" />
            <AppNavigator />
          </NavigationContainer>
        </ErrorBoundary>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  errBox: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errEmoji: { fontSize: 64, marginBottom: 16 },
  errMsg: { fontSize: 22, color: '#FFF', marginBottom: 28, textAlign: 'center' },
  errBtn: {
    backgroundColor: '#FF6B6B',
    borderRadius: 18,
    paddingHorizontal: 36,
    paddingVertical: 16,
  },
  errBtnTxt: { color: '#FFF', fontSize: 18, fontWeight: '800' },
});
