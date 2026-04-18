import React, { useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import HomeScreen        from './src/screens/HomeScreen';
import BubblePopScreen   from './src/screens/BubblePopScreen';
import AnimalSoundsScreen from './src/screens/AnimalSoundsScreen';
import ShapesScreen      from './src/screens/ShapesScreen';

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
  const [screen, setScreen] = useState('Home');

  const navigate = (name) => setScreen(name);
  const goHome   = () => setScreen('Home');

  const renderScreen = () => {
    switch (screen) {
      case 'BubblePop':
        return <BubblePopScreen onGoHome={goHome} />;
      case 'AnimalSounds':
        return <AnimalSoundsScreen onGoHome={goHome} />;
      case 'Shapes':
        return <ShapesScreen onGoHome={goHome} />;
      default:
        return <HomeScreen onNavigate={navigate} />;
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <ErrorBoundary>
        {renderScreen()}
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  errBox: {
    flex: 1,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  errEmoji: { fontSize: 64, marginBottom: 16 },
  errMsg:   { fontSize: 22, color: '#FFF', marginBottom: 28, textAlign: 'center' },
  errBtn: {
    backgroundColor: '#FF6B6B',
    borderRadius: 18,
    paddingHorizontal: 36,
    paddingVertical: 16,
  },
  errBtnTxt: { color: '#FFF', fontSize: 18, fontWeight: '800' },
});
