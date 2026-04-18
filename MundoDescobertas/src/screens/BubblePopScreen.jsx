/**
 * BubblePopScreen — Estoura Bolhas.
 * 8 coloured bubbles float upward. Tap to pop → burst animation + colour label.
 * Every 10 pops triggers confetti. No native modules beyond expo-linear-gradient.
 */
import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import AnimatedBubble from '../components/AnimatedBubble';
import ConfettiEffect from '../components/ConfettiEffect';
import StarBurst      from '../components/StarBurst';
import { BUBBLE_COLORS } from '../constants/colors';
import { randomBetween, randomFrom } from '../utils/gameHelpers';

const { width: SW, height: SH } = Dimensions.get('window');
const NUM_BUBBLES  = 8;
const MILESTONE_AT = 10;

let _uid = 0;
const newId = () => `b-${++_uid}-${Date.now()}`;

function makeBubble(index = 0) {
  return {
    id:         newId(),
    x:          randomBetween(35, SW - 95),
    size:       randomBetween(54, 88),
    color:      randomFrom(BUBBLE_COLORS),
    speed:      randomBetween(4200, 8000),
    startDelay: index * 450,
  };
}

// Floating colour label that appears when a bubble pops
function ScorePopup({ label, color, x, y }) {
  const opacity    = useRef(new Animated.Value(1)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,    { toValue: 0,   duration: 900, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -60, duration: 900, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.popup,
        { left: x - 55, top: y - 60, opacity, transform: [{ translateY }] },
      ]}
    >
      <View style={[styles.popupBadge, { backgroundColor: color }]}>
        <Text style={styles.popupName}>{label}</Text>
      </View>
    </Animated.View>
  );
}

export default function BubblePopScreen({ onGoHome }) {
  const [bubbles,      setBubbles]      = useState(() =>
    Array.from({ length: NUM_BUBBLES }, (_, i) => makeBubble(i))
  );
  const [score,        setScore]        = useState(0);
  const [popups,       setPopups]       = useState([]);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showBurst,    setShowBurst]    = useState(false);
  const scoreRef = useRef(0);

  const handlePop = useCallback((id, color, pageX, pageY) => {
    scoreRef.current += 1;
    const newScore = scoreRef.current;
    setScore(newScore);

    // Floating colour label
    const key = `${id}-popup`;
    setPopups((prev) => [...prev, { key, label: color.name, color: color.hex, x: pageX, y: pageY }]);
    setTimeout(() => setPopups((prev) => prev.filter((p) => p.key !== key)), 1000);

    // Milestone
    if (newScore % MILESTONE_AT === 0) {
      setShowBurst(true);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3200);
    }

    // Respawn the popped bubble
    setBubbles((prev) => prev.map((b) => (b.id === id ? makeBubble(0) : b)));
  }, []);

  const handleEscape = useCallback((id) => {
    setBubbles((prev) => prev.map((b) => (b.id === id ? makeBubble(0) : b)));
  }, []);

  return (
    <LinearGradient colors={['#0f0c29', '#302b63', '#24243e']} style={styles.container}>
      <SafeAreaView edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onGoHome}
            style={styles.homeBtn}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          >
            <Text style={styles.homeBtnTxt}>🏠</Text>
          </TouchableOpacity>
          <View style={styles.scoreBox}>
            <Text style={styles.scoreLabel}>⭐ Bolhas: </Text>
            <Text style={styles.scoreValue}>{score}</Text>
          </View>
        </View>
      </SafeAreaView>

      <View style={styles.playground}>
        {bubbles.map((b) => (
          <AnimatedBubble
            key={b.id}
            bubble={b}
            screenHeight={SH}
            onPop={handlePop}
            onEscape={handleEscape}
          />
        ))}
      </View>

      {popups.map((p) => (
        <ScorePopup key={p.key} label={p.label} color={p.color} x={p.x} y={p.y} />
      ))}

      {showConfetti && <ConfettiEffect />}
      {showBurst && (
        <StarBurst
          message={`🎉 ${score} Bolhas! 🎉`}
          onDone={() => setShowBurst(false)}
        />
      )}

      {score === 0 && (
        <View style={styles.hintWrap}>
          <Text style={styles.hintTxt}>👆 Toque nas bolhas!</Text>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1 },
  playground: { flex: 1 },

  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical:   10,
  },
  homeBtn:    { padding: 8 },
  homeBtnTxt: { fontSize: 34 },

  scoreBox: {
    flexDirection:     'row',
    alignItems:        'center',
    backgroundColor:   'rgba(255,255,255,0.12)',
    borderRadius:      20,
    paddingHorizontal: 18,
    paddingVertical:    8,
  },
  scoreLabel: { fontSize: 17, color: '#FFE66D', fontWeight: '700' },
  scoreValue: { fontSize: 22, color: '#FFF',    fontWeight: '900' },

  popup: {
    position: 'absolute',
    zIndex:   500,
    style: { pointerEvents: 'none' },
  },
  popupBadge: {
    borderRadius:      16,
    paddingHorizontal: 16,
    paddingVertical:    6,
    shadowColor:       '#000',
    shadowOpacity:     0.35,
    shadowRadius:       8,
    shadowOffset:      { width: 0, height: 3 },
    elevation:          6,
  },
  popupName: { fontSize: 18, fontWeight: '900', color: '#FFF' },

  hintWrap: {
    position:  'absolute',
    bottom:     50,
    left:       0,
    right:      0,
    alignItems: 'center',
  },
  hintTxt: { fontSize: 22, color: 'rgba(255,255,255,0.55)', fontWeight: '700' },
});
