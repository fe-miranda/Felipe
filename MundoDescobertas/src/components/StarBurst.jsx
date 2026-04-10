import React, { useRef, useEffect } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';

/** Full-screen "Parabéns!" overlay that fades in then auto-dismisses. */
export default function StarBurst({ message = '🌟 Parabéns! 🌟', onDone }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale   = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale,  { toValue: 1,   tension: 60, friction: 6, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1,  duration: 250,            useNativeDriver: true }),
      ]),
      Animated.delay(1600),
      Animated.timing(opacity,  { toValue: 0,   duration: 400,            useNativeDriver: true }),
    ]).start(() => onDone?.());
  }, []);

  return (
    <Animated.View style={[styles.overlay, { opacity, pointerEvents: 'none' }]}>
      <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
        <Text style={styles.text}>{message}</Text>
        <Text style={styles.sub}>Muito bem!</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 998,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  card: {
    backgroundColor: '#1a1a2e',
    borderRadius: 30,
    paddingVertical: 36,
    paddingHorizontal: 48,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFE66D',
    shadowColor: '#FFE66D',
    shadowOpacity: 0.6,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 20,
  },
  text: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFE66D',
    textAlign: 'center',
  },
  sub: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
  },
});
