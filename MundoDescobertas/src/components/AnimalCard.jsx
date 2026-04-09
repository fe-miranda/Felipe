import React, { useRef, useCallback } from 'react';
import { Animated, TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * Tappable animal card with bounce + rock animation.
 * Props:
 *   animal   - { id, name, emoji, bgGradient, fact }
 *   onPress(animal)
 *   isActive - whether this animal's "sound" is currently playing
 */
export default function AnimalCard({ animal, onPress, isActive }) {
  const scale  = useRef(new Animated.Value(1)).current;
  const rotate = useRef(new Animated.Value(0)).current;

  const handlePress = useCallback(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale,  { toValue: 1.18, tension: 120, friction: 4, useNativeDriver: true }),
        Animated.timing(rotate, { toValue: 1,    duration: 90,              useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(rotate, { toValue: -0.6, duration: 80, useNativeDriver: true }),
        Animated.spring(scale,  { toValue: 1,    tension: 80, friction: 6,  useNativeDriver: true }),
      ]),
      Animated.timing(rotate,   { toValue: 0,    duration: 70, useNativeDriver: true }),
    ]).start();

    onPress(animal);
  }, [animal, onPress]);

  const rotateDeg = rotate.interpolate({ inputRange: [-1, 1], outputRange: ['-20deg', '20deg'] });

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.88} style={styles.wrapper}>
      <LinearGradient
        colors={animal.bgGradient}
        style={[styles.card, isActive && styles.activeCard]}
      >
        <Animated.Text
          style={[styles.emoji, { transform: [{ scale }, { rotate: rotateDeg }] }]}
        >
          {animal.emoji}
        </Animated.Text>

        <Text style={styles.name}>{animal.name}</Text>

        {isActive ? (
          <View style={styles.factBubble}>
            <Text style={styles.factText}>{animal.fact}</Text>
          </View>
        ) : (
          <Text style={styles.tapHint}>👆 Toque!</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    margin: 8,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 7,
  },
  card: {
    borderRadius: 22,
    paddingVertical: 22,
    paddingHorizontal: 12,
    alignItems: 'center',
    minHeight: 160,
    justifyContent: 'center',
  },
  activeCard: {
    borderWidth: 3,
    borderColor: '#FFE66D',
  },
  emoji: {
    fontSize: 60,
    marginBottom: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  tapHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
  },
  factBubble: {
    marginTop: 6,
    backgroundColor: 'rgba(255,255,255,0.28)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  factText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
