import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

// Static particle positions (decorative purple dots)
const PARTICLES = [
  { x: 0.12, y: 0.15, r: 3, o: 0.5 },
  { x: 0.88, y: 0.12, r: 2, o: 0.35 },
  { x: 0.08, y: 0.55, r: 4, o: 0.3 },
  { x: 0.92, y: 0.48, r: 2.5, o: 0.45 },
  { x: 0.22, y: 0.82, r: 3.5, o: 0.4 },
  { x: 0.78, y: 0.80, r: 2, o: 0.5 },
  { x: 0.50, y: 0.08, r: 5, o: 0.25 },
  { x: 0.65, y: 0.88, r: 3, o: 0.4 },
  { x: 0.35, y: 0.92, r: 2, o: 0.3 },
  { x: 0.92, y: 0.75, r: 4, o: 0.35 },
];

interface Props {
  onFinish: () => void;
}

export function SplashScreen({ onFinish }: Props) {
  const logoScale   = useRef(new Animated.Value(0.2)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const glowScale   = useRef(new Animated.Value(0.5)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;
  const titleY      = useRef(new Animated.Value(32)).current;
  const titleOpacity= useRef(new Animated.Value(0)).current;
  const subOpacity  = useRef(new Animated.Value(0)).current;
  const barOpacity  = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Phase 1 (0ms): Logo + glow burst in
    Animated.parallel([
      Animated.spring(logoScale,    { toValue: 1, tension: 55, friction: 7, useNativeDriver: true }),
      Animated.timing(logoOpacity,  { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.spring(glowScale,    { toValue: 1.3, tension: 40, friction: 8, useNativeDriver: true }),
      Animated.timing(glowOpacity,  { toValue: 0.7, duration: 600, useNativeDriver: true }),
    ]).start();

    // Phase 2 (350ms): Title slides up
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(titleY,      { toValue: 0, tension: 70, friction: 8, useNativeDriver: true }),
        Animated.timing(titleOpacity,{ toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start();
    }, 350);

    // Phase 3 (650ms): Subtitle + bar fade in
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(subOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(barOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]).start();
    }, 650);

    // Phase 4 (2300ms): Fade out → call onFinish
    setTimeout(() => {
      Animated.timing(screenOpacity, { toValue: 0, duration: 380, useNativeDriver: true })
        .start(() => onFinish());
    }, 2300);
  }, []);

  return (
    <Animated.View style={[s.container, { opacity: screenOpacity }]}>
      {/* Decorative particles */}
      {PARTICLES.map((p, i) => (
        <Animated.View
          key={i}
          style={[s.particle, {
            left: p.x * width - p.r,
            top:  p.y * height - p.r,
            width: p.r * 2, height: p.r * 2,
            borderRadius: p.r,
            opacity: glowOpacity.interpolate({ inputRange: [0, 0.7], outputRange: [0, p.o] }),
          }]}
        />
      ))}

      {/* Central glow */}
      <Animated.View style={[s.glow, { transform: [{ scale: glowScale }], opacity: glowOpacity }]} />

      {/* Logo badge */}
      <Animated.View style={[s.logoBadge, { transform: [{ scale: logoScale }], opacity: logoOpacity }]}>
        <Animated.Text style={s.logoEmoji}>💪</Animated.Text>
      </Animated.View>

      {/* App name */}
      <Animated.Text style={[s.title, { transform: [{ translateY: titleY }], opacity: titleOpacity }]}>
        GymAI
      </Animated.Text>

      {/* Tagline */}
      <Animated.Text style={[s.tagline, { opacity: subOpacity }]}>
        Treino Inteligente, Resultado Real
      </Animated.Text>

      {/* Powered by */}
      <Animated.Text style={[s.powered, { opacity: subOpacity }]}>
        Powered by Groq · Llama 3.3
      </Animated.Text>

      {/* Phase bar */}
      <Animated.View style={[s.phaseBar, { opacity: barOpacity }]}>
        {[['#10B981', 3], ['#3B82F6', 3], ['#F59E0B', 3], ['#EF4444', 3]].map(([color, flex], i) => (
          <View key={i} style={[s.phaseSeg, { backgroundColor: color as string, flex: flex as number }]} />
        ))}
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#07070F',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  particle: { position: 'absolute', backgroundColor: '#7C3AED' },
  glow: {
    position: 'absolute',
    width: 240, height: 240, borderRadius: 120,
    backgroundColor: 'rgba(124,58,237,0.18)',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 80,
    elevation: 0,
  },
  logoBadge: {
    width: 110, height: 110, borderRadius: 32,
    backgroundColor: 'rgba(124,58,237,0.2)',
    borderWidth: 1.5, borderColor: 'rgba(124,58,237,0.5)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 28,
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8, shadowRadius: 30, elevation: 12,
  },
  logoEmoji: { fontSize: 60 },
  title: {
    color: '#F1F5F9', fontSize: 54, fontWeight: '900',
    letterSpacing: 3, marginBottom: 10,
  },
  tagline: { color: '#A78BFA', fontSize: 15, fontWeight: '600', marginBottom: 8 },
  powered: { color: '#475569', fontSize: 12 },
  phaseBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 5, flexDirection: 'row',
  },
  phaseSeg: { height: 5 },
});
