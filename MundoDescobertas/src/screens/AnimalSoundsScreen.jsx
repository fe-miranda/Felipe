/**
 * AnimalSoundsScreen — Som dos Bichos minigame.
 *
 * Six animal cards in a grid. Tapping an animal:
 *   1. Triggers a bounce animation.
 *   2. Attempts to play the animal's sound (expo-av).
 *   3. Displays the animal's "sound word" inside the card.
 *   4. Occasionally shows confetti to reward exploration.
 *
 * Audio files: place .mp3 files in /assets/sounds/ and update
 * the `sound` field in src/constants/gameData.js, e.g.:
 *   sound: require('../../assets/sounds/cat.mp3')
 */
import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

import AnimalCard    from '../components/AnimalCard';
import ConfettiEffect from '../components/ConfettiEffect';
import { ANIMALS }  from '../constants/gameData';

export default function AnimalSoundsScreen({ navigation }) {
  const [activeId,     setActiveId]     = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [tapCount,     setTapCount]     = useState(0);

  const soundRef = useRef(null);

  const playSound = useCallback(async (animal) => {
    // Stop any currently-playing sound
    try {
      if (soundRef.current) {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    } catch (_) {}

    if (!animal.sound) return; // audio file not yet added

    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
      const { sound } = await Audio.Sound.createAsync(animal.sound);
      soundRef.current = sound;
      await sound.playAsync();
    } catch (err) {
      console.warn('Sound playback error:', err.message);
    }
  }, []);

  const handleAnimalPress = useCallback(
    async (animal) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setActiveId(animal.id);
      setTapCount((c) => c + 1);

      await playSound(animal);

      // Deactivate card after 1.8 s
      setTimeout(() => setActiveId(null), 1800);

      // Surprise confetti every 5 taps
      if ((tapCount + 1) % 5 === 0) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2800);
      }
    },
    [tapCount, playSound]
  );

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
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Home')}
            style={styles.homeBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.homeBtnText}>🏠</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Som dos Bichos</Text>
            <Text style={styles.subtitle}>Toque nos amiguinhos! 🎵</Text>
          </View>
          {/* Spacer to keep title centred */}
          <View style={styles.homeBtn} />
        </View>

        {/* Animal grid */}
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
    paddingBottom: 6,
  },
  homeBtn:     { width: 48, alignItems: 'center' },
  homeBtnText: { fontSize: 32 },

  title: {
    fontSize:   26,
    fontWeight: '900',
    color:      '#FFFFFF',
    textAlign:  'center',
  },
  subtitle: {
    fontSize:  14,
    color:     'rgba(255,255,255,0.72)',
    textAlign: 'center',
    marginTop:  2,
  },

  grid: {
    paddingHorizontal: 12,
    paddingBottom:     32,
    paddingTop:        8,
  },
});
