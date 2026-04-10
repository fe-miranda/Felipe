/**
 * AnimalSoundsScreen — Som dos Bichos.
 *
 * Tap an animal card → bounce animation + speech-bubble with the animal's
 * sound word. No expo-av dependency: visual feedback only for now.
 * Add audio later by installing expo-av and updating gameData.js sound fields.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import AnimalCard     from '../components/AnimalCard';
import ConfettiEffect from '../components/ConfettiEffect';
import { ANIMALS }   from '../constants/gameData';

export default function AnimalSoundsScreen({ navigation }) {
  const [activeId,     setActiveId]     = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [tapCount,     setTapCount]     = useState(0);

  const handleAnimalPress = useCallback((animal) => {
    setActiveId(animal.id);
    const next = tapCount + 1;
    setTapCount(next);

    // Deactivate card after animation
    setTimeout(() => setActiveId(null), 1800);

    // Surprise confetti every 5 taps
    if (next % 5 === 0) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2800);
    }
  }, [tapCount]);

  const renderItem = useCallback(
    ({ item }) => (
      <AnimalCard
        animal={item}
        onPress={handleAnimalPress}
        isActive={activeId === item.id}
      />
    ),
    [activeId, handleAnimalPress]
  );

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Home')}
            style={styles.homeBtn}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          >
            <Text style={styles.homeBtnTxt}>🏠</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Som dos Bichos</Text>
            <Text style={styles.subtitle}>Toque nos amiguinhos! 🎵</Text>
          </View>
          <View style={styles.homeBtn} />
        </View>

        <FlatList
          data={ANIMALS}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.grid}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>

      {showConfetti && <ConfettiEffect />}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea:  { flex: 1 },
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop:  12,
    paddingBottom:  6,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  homeBtn:    { width: 48, alignItems: 'center' },
  homeBtnTxt: { fontSize: 32 },
  title:    { fontSize: 26, fontWeight: '900', color: '#FFF', textAlign: 'center' },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.70)', textAlign: 'center', marginTop: 2 },
  grid:     { paddingHorizontal: 12, paddingBottom: 32, paddingTop: 8 },
});
