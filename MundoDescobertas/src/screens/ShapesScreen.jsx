/**
 * ShapesScreen — Arrastar Formas (Encaixar Formas).
 *
 * Tap-to-select + tap-to-place approach (toddler-friendly, crash-safe):
 *   1. Tap a shape at the bottom → it is selected (highlighted, bounces).
 *   2. Tap the matching shadow target at the top → snaps in, celebrates.
 *   3. Tap the wrong target → gentle shake error.
 *   4. All three placed → confetti + StarBurst.
 *
 * Uses only React Native core APIs — no PanResponder, no gesture handler,
 * no external native modules. Zero crash risk from native layer.
 */
import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import ConfettiEffect from '../components/ConfettiEffect';
import StarBurst      from '../components/StarBurst';
import { SHAPES }     from '../constants/gameData';

const { width: SW } = Dimensions.get('window');

// ── Shape renderers (pure View, no SVG) ──────────────────────────────────────
function Circle({ size, color }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
  );
}
function Square({ size, color }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.14, backgroundColor: color }} />
  );
}
function Triangle({ size, color }) {
  return (
    <View
      style={{
        width: 0, height: 0,
        borderLeftWidth:   size / 2,
        borderRightWidth:  size / 2,
        borderBottomWidth: Math.round(size * 0.87),
        borderLeftColor:   'transparent',
        borderRightColor:  'transparent',
        borderBottomColor: color,
      }}
    />
  );
}
function ShapeView({ type, size, color }) {
  switch (type) {
    case 'circle':   return <Circle   size={size} color={color} />;
    case 'square':   return <Square   size={size} color={color} />;
    case 'triangle': return <Triangle size={size} color={color} />;
    default:         return null;
  }
}

// ── Animated shape button at the bottom ──────────────────────────────────────
const SHAPE_SIZE  = 78;
const TARGET_SIZE = 100;

function ShapeButton({ shape, selected, placed, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;
  const shake = useRef(new Animated.Value(0)).current;

  const press = useCallback(() => {
    Animated.spring(scale, { toValue: 1.2, tension: 120, friction: 5, useNativeDriver: true }).start(() =>
      Animated.spring(scale, { toValue: 1, tension: 80, friction: 6, useNativeDriver: true }).start()
    );
    onPress(shape.id);
  }, [shape.id, onPress]);

  // Expose shake trigger via ref pattern on parent
  React.useEffect(() => {
    if (shape._shake) {
      Animated.sequence([
        Animated.timing(shake, { toValue:  12, duration: 60, useNativeDriver: true }),
        Animated.timing(shake, { toValue: -12, duration: 60, useNativeDriver: true }),
        Animated.timing(shake, { toValue:   8, duration: 60, useNativeDriver: true }),
        Animated.timing(shake, { toValue:   0, duration: 60, useNativeDriver: true }),
      ]).start();
    }
  }, [shape._shake]);

  return (
    <TouchableOpacity
      onPress={press}
      disabled={placed}
      activeOpacity={0.75}
      style={styles.shapeBtn}
    >
      <Animated.View
        style={[
          styles.shapeBtnInner,
          selected && styles.shapeBtnSelected,
          placed   && styles.shapeBtnPlaced,
          { transform: [{ scale }, { translateX: shake }] },
        ]}
      >
        <ShapeView type={shape.id} size={SHAPE_SIZE} color={placed ? 'rgba(255,255,255,0.25)' : shape.color} />
        {!placed && <Text style={styles.shapeLabel}>{shape.label}</Text>}
        {placed  && <Text style={styles.shapeLabel}>✅</Text>}
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── Target shadow at the top ──────────────────────────────────────────────────
function TargetSlot({ shape, filled, selected, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;

  const press = useCallback(() => {
    Animated.spring(scale, { toValue: 1.1, tension: 100, friction: 6, useNativeDriver: true }).start(() =>
      Animated.spring(scale, { toValue: 1, tension: 80, friction: 7, useNativeDriver: true }).start()
    );
    onPress(shape.id);
  }, [shape.id, onPress]);

  return (
    <TouchableOpacity onPress={press} activeOpacity={0.8} style={styles.targetBtn}>
      <Animated.View
        style={[
          styles.targetInner,
          selected && styles.targetHighlighted,
          { transform: [{ scale }] },
        ]}
      >
        <ShapeView
          type={shape.id}
          size={TARGET_SIZE}
          color={filled ? shape.color : 'rgba(255,255,255,0.13)'}
        />
        <Text style={[styles.targetLabel, filled && styles.targetLabelFilled]}>
          {shape.label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function ShapesScreen({ onGoHome }) {
  const [selected,     setSelected]     = useState(null); // shapeId being held
  const [placed,       setPlaced]       = useState({});   // { shapeId: true }
  const [shakeTick,    setShakeTick]    = useState({});   // trigger shake
  const [showConfetti, setShowConfetti] = useState(false);
  const [showBurst,    setShowBurst]    = useState(false);

  const handleShapePress = useCallback((id) => {
    if (placed[id]) return;
    setSelected((prev) => (prev === id ? null : id));
  }, [placed]);

  const handleTargetPress = useCallback((targetId) => {
    if (!selected) return;

    if (selected === targetId) {
      // ✅ Correct!
      const next = { ...placed, [selected]: true };
      setPlaced(next);
      setSelected(null);

      if (Object.keys(next).length === SHAPES.length) {
        setTimeout(() => {
          setShowConfetti(true);
          setShowBurst(true);
        }, 300);
      }
    } else {
      // ❌ Wrong target — shake the selected shape
      setShakeTick((prev) => ({ ...prev, [selected]: (prev[selected] ?? 0) + 1 }));
      setSelected(null);
    }
  }, [selected, placed]);

  const reset = useCallback(() => {
    setPlaced({});
    setSelected(null);
    setShowConfetti(false);
    setShowBurst(false);
  }, []);

  // Build shape data annotated with shake trigger
  const shapesWithShake = SHAPES.map((s) => ({
    ...s,
    _shake: shakeTick[s.id] ?? 0,
  }));

  const allPlaced = Object.keys(placed).length === SHAPES.length;

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onGoHome}
            style={styles.navBtn}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          >
            <Text style={styles.navBtnTxt}>🏠</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Encaixar Formas</Text>
            <Text style={styles.subtitle}>
              {selected
                ? `"${SHAPES.find((s) => s.id === selected)?.label}" selecionado — toque na sombra!`
                : allPlaced
                ? '🎉 Todas encaixadas!'
                : 'Toque na forma e depois na sombra!'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={reset}
            style={styles.navBtn}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          >
            <Text style={styles.navBtnTxt}>🔄</Text>
          </TouchableOpacity>
        </View>

        {/* Target shadows (top) */}
        <View style={styles.targetsRow}>
          {SHAPES.map((shape) => (
            <TargetSlot
              key={shape.id}
              shape={shape}
              filled={!!placed[shape.id]}
              selected={selected !== null && !placed[shape.id]}
              onPress={handleTargetPress}
            />
          ))}
        </View>

        {/* Instruction arrow */}
        {selected && (
          <Text style={styles.arrow}>⬆️  Toque na sombra certa!</Text>
        )}

        {/* Spacer */}
        <View style={styles.spacer} />

        {/* Draggable shapes (bottom) */}
        <View style={styles.shapesRow}>
          {shapesWithShake.map((shape) => (
            <ShapeButton
              key={shape.id}
              shape={shape}
              selected={selected === shape.id}
              placed={!!placed[shape.id]}
              onPress={handleShapePress}
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
  container: { flex: 1 },
  safeArea:  { flex: 1 },

  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop:  10,
    paddingBottom:  4,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  navBtn:    { width: 48, alignItems: 'center' },
  navBtnTxt: { fontSize: 30 },
  title:    { fontSize: 20, fontWeight: '900', color: '#FFF', textAlign: 'center' },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.70)', textAlign: 'center', marginTop: 2 },

  targetsRow: {
    flexDirection:  'row',
    justifyContent: 'space-evenly',
    paddingHorizontal: 16,
    marginTop: 20,
  },
  targetBtn:   { alignItems: 'center' },
  targetInner: { alignItems: 'center', padding: 10 },
  targetHighlighted: {
    backgroundColor: 'rgba(255,230,109,0.15)',
    borderRadius:     20,
  },
  targetLabel: {
    marginTop:  8,
    fontSize:   13,
    fontWeight: '700',
    color:      'rgba(255,255,255,0.55)',
  },
  targetLabelFilled: { color: '#FFE66D' },

  arrow: {
    textAlign: 'center',
    fontSize:   16,
    color:      '#FFE66D',
    marginTop:  16,
    fontWeight: '700',
  },

  spacer: { flex: 1 },

  shapesRow: {
    flexDirection:  'row',
    justifyContent: 'space-evenly',
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  shapeBtn: { alignItems: 'center' },
  shapeBtnInner: {
    alignItems:     'center',
    padding:        14,
    borderRadius:   20,
    borderWidth:     2,
    borderColor:    'transparent',
  },
  shapeBtnSelected: {
    borderColor:       '#FFE66D',
    backgroundColor:   'rgba(255,230,109,0.18)',
    shadowColor:       '#FFE66D',
    shadowOpacity:     0.8,
    shadowRadius:      12,
    shadowOffset:      { width: 0, height: 0 },
    elevation:          8,
  },
  shapeBtnPlaced: { opacity: 0.35 },
  shapeLabel: {
    marginTop:  8,
    fontSize:   13,
    fontWeight: '800',
    color:      '#FFF',
  },
});
