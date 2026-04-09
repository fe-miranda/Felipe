import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: W, height: H } = Dimensions.get('window');

const GAME_CARDS = [
  {
    route: 'BubblePop',
    emoji: '🫧',
    title: 'Estoura\nBolhas',
    desc: 'Pop! Pop!',
    gradient: ['#FF6B6B', '#ee5a24'],
  },
  {
    route: 'AnimalSounds',
    emoji: '🐾',
    title: 'Som dos\nBichos',
    desc: '🎵 Ouvir',
    gradient: ['#4ECDC4', '#0abde3'],
  },
  {
    route: 'Shapes',
    emoji: '🔷',
    title: 'Arrastar\nFormas',
    desc: '✨ Encaixar',
    gradient: ['#A29BFE', '#6C5CE7'],
  },
];

/** Floating decoration circle that bobs up and down */
function FloatingOrb({ x, y, size, color, delay }) {
  const floatY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, { toValue: -14, duration: 2200 + delay * 0.3, useNativeDriver: true }),
        Animated.timing(floatY, { toValue: 0,   duration: 2200 + delay * 0.3, useNativeDriver: true }),
      ])
    );
    const t = setTimeout(() => loop.start(), delay);
    return () => { clearTimeout(t); loop.stop(); };
  }, []);

  return (
    <Animated.View
      style={[
        styles.orb,
        { left: x, top: y, width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        { transform: [{ translateY: floatY }] },
      ]}
      pointerEvents="none"
    />
  );
}

export default function HomeScreen({ navigation }) {
  const titleAnim  = useRef(new Animated.Value(0)).current;
  const cardsAnim  = useRef(new Animated.Value(0)).current;
  const starAnim   = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entry animations
    Animated.stagger(150, [
      Animated.spring(titleAnim, { toValue: 1, tension: 45, friction: 9, useNativeDriver: true }),
      Animated.spring(cardsAnim, { toValue: 1, tension: 45, friction: 9, useNativeDriver: true }),
    ]).start();

    // Pulsing star
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(starAnim, { toValue: 1.15, duration: 900, useNativeDriver: true }),
        Animated.timing(starAnim, { toValue: 1,    duration: 900, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
      {/* Background decorations */}
      <FloatingOrb x={-30} y={60}     size={130} color="rgba(255,107,107,0.12)" delay={0}    />
      <FloatingOrb x={W - 80} y={140} size={110} color="rgba(78,205,196,0.12)"  delay={400}  />
      <FloatingOrb x={40}    y={H - 220} size={90} color="rgba(162,155,254,0.12)" delay={800} />

      <SafeAreaView style={styles.safeArea}>
        {/* ---- Title ---- */}
        <Animated.View
          style={[
            styles.titleBlock,
            {
              opacity: titleAnim,
              transform: [{ translateY: titleAnim.interpolate({ inputRange: [0, 1], outputRange: [-28, 0] }) }],
            },
          ]}
        >
          <Animated.Text style={[styles.globeEmoji, { transform: [{ scale: starAnim }] }]}>
            🌍
          </Animated.Text>
          <Text style={styles.titleLine1}>Mundo das</Text>
          <Text style={styles.titleLine2}>Descobertas</Text>
          <Text style={styles.subtitle}>O que vamos aprender hoje? 🎉</Text>
        </Animated.View>

        {/* ---- Game Cards ---- */}
        <Animated.View
          style={[
            styles.cardsWrapper,
            {
              opacity: cardsAnim,
              transform: [{ translateY: cardsAnim.interpolate({ inputRange: [0, 1], outputRange: [48, 0] }) }],
            },
          ]}
        >
          {/* Top row: 2 cards */}
          <View style={styles.topRow}>
            {GAME_CARDS.slice(0, 2).map((card) => (
              <TouchableOpacity
                key={card.route}
                onPress={() => navigation.navigate(card.route)}
                activeOpacity={0.82}
                style={styles.halfCardShadow}
              >
                <LinearGradient colors={card.gradient} style={styles.halfCard}>
                  <Text style={styles.cardEmoji}>{card.emoji}</Text>
                  <Text style={styles.cardTitle}>{card.title}</Text>
                  <Text style={styles.cardDesc}>{card.desc}</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </View>

          {/* Bottom: full-width card */}
          <TouchableOpacity
            onPress={() => navigation.navigate(GAME_CARDS[2].route)}
            activeOpacity={0.82}
            style={styles.fullCardShadow}
          >
            <LinearGradient colors={GAME_CARDS[2].gradient} style={styles.fullCard}>
              <Text style={styles.cardEmojiLg}>{GAME_CARDS[2].emoji}</Text>
              <View>
                <Text style={styles.cardTitleLg}>{GAME_CARDS[2].title}</Text>
                <Text style={styles.cardDesc}>{GAME_CARDS[2].desc}</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.32,
  shadowRadius: 14,
  elevation: 10,
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },

  orb: { position: 'absolute' },

  titleBlock: { alignItems: 'center', marginBottom: 44 },
  globeEmoji: { fontSize: 70, marginBottom: 6 },
  titleLine1: { fontSize: 34, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5 },
  titleLine2: { fontSize: 34, fontWeight: '900', color: '#FFE66D', letterSpacing: 0.5 },
  subtitle:   { fontSize: 16, color: 'rgba(255,255,255,0.72)', marginTop: 10, fontWeight: '600' },

  cardsWrapper: { width: '100%', gap: 16 },
  topRow: { flexDirection: 'row', gap: 16 },

  halfCardShadow: { flex: 1, borderRadius: 24, ...SHADOW },
  halfCard: {
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    minHeight: 168,
    justifyContent: 'center',
  },

  fullCardShadow: { borderRadius: 24, ...SHADOW },
  fullCard: {
    borderRadius: 24,
    paddingVertical: 20,
    paddingHorizontal: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    height: 120,
  },

  cardEmoji:   { fontSize: 50, marginBottom: 10 },
  cardEmojiLg: { fontSize: 58 },
  cardTitle:   { fontSize: 17, fontWeight: '800', color: '#FFF', textAlign: 'center', lineHeight: 22 },
  cardTitleLg: { fontSize: 20, fontWeight: '800', color: '#FFF', lineHeight: 26 },
  cardDesc:    { fontSize: 15, color: 'rgba(255,255,255,0.85)', marginTop: 4 },
});
