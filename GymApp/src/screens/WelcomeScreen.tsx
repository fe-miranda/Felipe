import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Welcome'> };

const { width } = Dimensions.get('window');

const C = {
  bg: '#07070F',
  surface: '#0F0F1A',
  elevated: '#161625',
  border: '#1E1E30',
  primary: '#7C3AED',
  primaryLight: '#A78BFA',
  primaryGlow: 'rgba(124,58,237,0.22)',
  text1: '#F1F5F9',
  text2: '#94A3B8',
  text3: '#475569',
};

const FEATURES = [
  { icon: '🤖', text: 'Plano anual gerado por IA' },
  { icon: '❤️', text: 'Monitor de frequência cardíaca' },
  { icon: '⚡', text: 'Treinos rápidos personalizáveis' },
  { icon: '📊', text: 'Progresso e compartilhamento' },
];

export function WelcomeScreen({ navigation }: Props) {
  // ── Animation values ──
  const logoScale   = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const taglineY    = useRef(new Animated.Value(24)).current;
  const taglineOp   = useRef(new Animated.Value(0)).current;
  const featuresOp  = useRef(new Animated.Value(0)).current;
  const btnScale    = useRef(new Animated.Value(0.85)).current;
  const btnOp       = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // 1. Logo pops in
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, useNativeDriver: true, bounciness: 14 }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      // 2. Tagline slides up
      Animated.parallel([
        Animated.timing(taglineY,  { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(taglineOp, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      // 3. Features fade in
      Animated.timing(featuresOp, { toValue: 1, duration: 350, useNativeDriver: true }),
      // 4. CTA button bounces in
      Animated.parallel([
        Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, bounciness: 10 }),
        Animated.timing(btnOp,    { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  // Pulsing glow on the logo emoji
  const glowAnim = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1.12, duration: 1400, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 1, duration: 1400, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.container}>

        {/* ── Logo / hero ── */}
        <Animated.View style={[s.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
          <Animated.View style={[s.glowRing, { transform: [{ scale: glowAnim }] }]} />
          <Text style={s.logoEmoji}>🏋️</Text>
        </Animated.View>

        {/* ── App name + tagline ── */}
        <Animated.View style={[s.taglineWrap, { opacity: taglineOp, transform: [{ translateY: taglineY }] }]}>
          <Text style={s.appName}>GymApp</Text>
          <Text style={s.tagline}>Seu plano de treino{'\n'}personalizado com IA</Text>
        </Animated.View>

        {/* ── Feature pills ── */}
        <Animated.View style={[s.features, { opacity: featuresOp }]}>
          {FEATURES.map((f, i) => (
            <View key={i} style={s.featurePill}>
              <Text style={s.featureIcon}>{f.icon}</Text>
              <Text style={s.featureText}>{f.text}</Text>
            </View>
          ))}
        </Animated.View>

        {/* ── CTA ── */}
        <Animated.View style={[s.ctaWrap, { opacity: btnOp, transform: [{ scale: btnScale }] }]}>
          <TouchableOpacity
            style={s.ctaBtn}
            activeOpacity={0.85}
            onPress={() => navigation.replace('Onboarding')}
          >
            <Text style={s.ctaBtnText}>Começar Agora  →</Text>
          </TouchableOpacity>
          <Text style={s.ctaSub}>Gratuito · Sem cartão de crédito</Text>
        </Animated.View>

      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 0,
  },

  // Logo
  logoWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
    width: 120,
    height: 120,
  },
  glowRing: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: C.primaryGlow,
  },
  logoEmoji: { fontSize: 64, zIndex: 1 },

  // Tagline
  taglineWrap: { alignItems: 'center', marginBottom: 32 },
  appName: {
    color: C.primaryLight,
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 1,
    marginBottom: 8,
  },
  tagline: {
    color: C.text1,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 28,
  },

  // Features
  features: {
    width: '100%',
    gap: 10,
    marginBottom: 36,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  featureIcon: { fontSize: 20 },
  featureText: { color: C.text2, fontSize: 14, fontWeight: '500' },

  // CTA
  ctaWrap: { width: '100%', alignItems: 'center', gap: 10 },
  ctaBtn: {
    width: '100%',
    backgroundColor: C.primary,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
  ctaBtnText: { color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 },
  ctaSub: { color: C.text3, fontSize: 12 },
});
