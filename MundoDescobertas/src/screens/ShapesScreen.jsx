/**
 * ShapesScreen — Arrastar Formas minigame.
 *
 * Three shapes (Circle, Square, Triangle) sit at the bottom of the screen.
 * Three matching shadow outlines sit at the top.
 * The child drags each shape onto its shadow:
 *   • Correct target → snaps in, shows label, haptic success.
 *   • Wrong target   → bounces back, gentle haptic error.
 *   • All three placed → confetti + StarBurst celebration.
 *
 * Drag is implemented with React Native's PanResponder (no extra deps).
 * Shape and target positions are calculated from screen dimensions so the
 * layout is responsive across phone sizes.
 */
import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  PanResponder,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import ConfettiEffect from '../components/ConfettiEffect';
import StarBurst      from '../components/StarBurst';
import { SHAPES }     from '../constants/gameData';

const { width: SW, height: SH } = Dimensions.get('window');

// ─── Layout constants ───────────────────────────────────────────────────────
const SHAPE_SIZE  = 82;
const TARGET_SIZE = 108;
const SNAP_DIST   = 70; // px from target centre to snap

// Evenly spaced horizontal positions for 3 items
const col = (i) => (SW / 4) * (i + 1); // centres at 25 %, 50 %, 75 % of screen

// Target outlines in the upper section
const TARGET_POSITIONS = SHAPES.map((_, i) => ({
  cx: col(i),
  cy: SH * 0.28,
}));

// Draggable shapes start in the lower section
const SHAPE_START = SHAPES.map((_, i) => ({
  cx: col(i),
  cy: SH * 0.72,
}));

// ─── SVG-free shape renderers ────────────────────────────────────────────────
function Circle({ size, color, style }) {
  return (
    <View
      style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]}
    />
  );
}

function Square({ size, color, style }) {
  return (
    <View
      style={[{ width: size, height: size, borderRadius: size * 0.12, backgroundColor: color }, style]}
    />
  );
}

function Triangle({ size, color }) {
  // Classic border-trick triangle
  return (
    <View
      style={{
        width: 0,
        height: 0,
        borderLeftWidth:   size / 2,
        borderRightWidth:  size / 2,
        borderBottomWidth: size * 0.87,
        borderLeftColor:   'transparent',
        borderRightColor:  'transparent',
        borderBottomColor: color,
      }}
    />
  );
}

function ShapeRenderer({ type, size, color, style }) {
  switch (type) {
    case 'circle':   return <Circle   size={size} color={color} style={style} />;
    case 'square':   return <Square   size={size} color={color} style={style} />;
    case 'triangle': return <Triangle size={size} color={color} />;
    default:         return null;
  }
}

// ─── DraggableShape ─────────────────────────────────────────────────────────
function DraggableShape({ shape, index, targetPositions, onSuccess, placed }) {
  const pan   = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const scale = useRef(new Animated.Value(1)).current;

  // Store the absolute screen position of this shape's resting spot
  const restX = SHAPE_START[index].cx - SHAPE_SIZE / 2;
  const restY = SHAPE_START[index].cy - SHAPE_SIZE / 2;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !placed,
      onMoveShouldSetPanResponder:  () => !placed,

      onPanResponderGrant: () => {
        pan.setOffset({ x: pan.x._value, y: pan.y._value });
        pan.setValue({ x: 0, y: 0 });
        Animated.spring(scale, { toValue: 1.18, tension: 100, friction: 6, useNativeDriver: true }).start();
      },

      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),

      onPanResponderRelease: (_, gesture) => {
        pan.flattenOffset();
        Animated.spring(scale, { toValue: 1, tension: 80, friction: 7, useNativeDriver: true }).start();

        // Absolute centre of the shape when released
        const dropCX = restX + SHAPE_SIZE / 2 + pan.x._value;
        const dropCY = restY + SHAPE_SIZE / 2 + pan.y._value;

        // Find the matching target
        const myTarget = targetPositions[index];
        const dist = Math.hypot(dropCX - myTarget.cx, dropCY - myTarget.cy);

        if (dist < SNAP_DIST) {
          // ✅ Correct target — snap to it
          const snapX = myTarget.cx - SHAPE_SIZE / 2 - restX;
          const snapY = myTarget.cy - SHAPE_SIZE / 2 - restY;
          Animated.spring(pan, {
            toValue:    { x: snapX, y: snapY },
            tension:    120,
            friction:   8,
            useNativeDriver: false,
          }).start();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          onSuccess(shape.id);
        } else {
          // ❌ Missed or wrong — bounce back to start
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Animated.spring(pan, {
            toValue:    { x: 0, y: 0 },
            tension:    70,
            friction:   8,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.draggable,
        {
          left:    restX,
          top:     restY,
          opacity: placed ? 0.35 : 1,
          zIndex:  placed ? 0 : 10,
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { scale },
          ],
        },
      ]}
    >
      <ShapeRenderer type={shape.id} size={SHAPE_SIZE} color={shape.color} />
    </Animated.View>
  );
}

// ─── ShapesScreen ────────────────────────────────────────────────────────────
export default function ShapesScreen({ navigation }) {
  const [placed,       setPlaced]       = useState({});          // { shapeId: true }
  const [showConfetti, setShowConfetti] = useState(false);
  const [showBurst,    setShowBurst]    = useState(false);

  const handleSuccess = useCallback(
    (shapeId) => {
      setPlaced((prev) => {
        const next = { ...prev, [shapeId]: true };
        if (Object.keys(next).length === SHAPES.length) {
          // All placed — celebrate!
          setTimeout(() => {
            setShowConfetti(true);
            setShowBurst(true);
          }, 400);
        }
        return next;
      });
    },
    []
  );

  const resetGame = useCallback(() => {
    setPlaced({});
    setShowConfetti(false);
    setShowBurst(false);
  }, []);

  const allPlaced = Object.keys(placed).length === SHAPES.length;

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
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Arrastar Formas</Text>
            <Text style={styles.subtitle}>
              {allPlaced ? '🎉 Todas encaixadas!' : 'Arraste cada forma até a sombra!'}
            </Text>
          </View>
          {/* Reset button */}
          <TouchableOpacity
            onPress={resetGame}
            style={styles.homeBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.homeBtnText}>🔄</Text>
          </TouchableOpacity>
        </View>

        {/* ── Target shadows (upper area) ── */}
        <View style={styles.playground}>
          {SHAPES.map((shape, i) => {
            const tx = TARGET_POSITIONS[i].cx - TARGET_SIZE / 2;
            const ty = TARGET_POSITIONS[i].cy - TARGET_SIZE / 2;
            return (
              <View key={`target-${shape.id}`} style={[styles.target, { left: tx, top: ty }]}>
                <ShapeRenderer
                  type={shape.id}
                  size={TARGET_SIZE}
                  color={placed[shape.id] ? shape.color : 'rgba(255,255,255,0.12)'}
                  style={placed[shape.id] ? {} : styles.targetInner}
                />
                {/* Label below target */}
                <Text style={styles.targetLabel}>{shape.label}</Text>
              </View>
            );
          })}

          {/* ── Draggable shapes (lower area) ── */}
          {SHAPES.map((shape, i) => (
            <DraggableShape
              key={`shape-${shape.id}`}
              shape={shape}
              index={i}
              targetPositions={TARGET_POSITIONS}
              onSuccess={handleSuccess}
              placed={!!placed[shape.id]}
            />
          ))}
        </View>
      </SafeAreaView>

      {showConfetti && <ConfettiEffect />}
      {showBurst && (
        <StarBurst
          message="🎊 Perfeito! 🎊"
          onDone={() => { setShowBurst(false); setShowConfetti(false); }}
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1 },
  safeArea:   { flex: 1 },
  playground: { flex: 1, position: 'relative' },

  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop:  10,
    paddingBottom: 6,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  homeBtn:     { width: 48, alignItems: 'center' },
  homeBtnText: { fontSize: 30 },

  title:    { fontSize: 22, fontWeight: '900', color: '#FFFFFF', textAlign: 'center' },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.70)', textAlign: 'center', marginTop: 2 },

  target: {
    position:  'absolute',
    alignItems: 'center',
  },
  targetInner: {
    borderWidth:  3,
    borderStyle:  'dashed',
    borderColor:  'rgba(255,255,255,0.35)',
    backgroundColor: 'transparent',
  },
  targetLabel: {
    marginTop:  6,
    fontSize:   14,
    fontWeight: '700',
    color:      'rgba(255,255,255,0.60)',
  },

  draggable: {
    position: 'absolute',
    width:    SHAPE_SIZE,
    height:   SHAPE_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
