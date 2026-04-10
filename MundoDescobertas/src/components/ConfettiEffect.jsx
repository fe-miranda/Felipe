import React, { useRef, useEffect, memo } from 'react';
import { View, Animated, Dimensions, StyleSheet } from 'react-native';
import { CONFETTI_COLORS } from '../constants/colors';

const { width: SW, height: SH } = Dimensions.get('window');
const NUM_PIECES = 36;

/** A single falling confetti piece (memoised to avoid re-renders). */
const Piece = memo(({ x, color, delay, isCircle, rotDir }) => {
  const translateY = useRef(new Animated.Value(-20)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const rotate     = useRef(new Animated.Value(0)).current;
  const opacity    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const drift    = (Math.random() - 0.5) * 120;
    const duration = 1800 + Math.random() * 1200;

    Animated.parallel([
      Animated.sequence([
        Animated.timing(opacity,     { toValue: 1, duration: 80,       delay,          useNativeDriver: true }),
        Animated.timing(translateY,  { toValue: SH + 60, duration,     delay,          useNativeDriver: true }),
      ]),
      Animated.timing(translateX,    { toValue: drift,   duration,     delay,          useNativeDriver: true }),
      Animated.timing(rotate,        { toValue: rotDir,  duration,     delay,          useNativeDriver: true }),
      Animated.timing(opacity,       { toValue: 0,       duration: 400, delay: delay + duration - 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const rotateDeg = rotate.interpolate({ inputRange: [-2, 2], outputRange: ['-720deg', '720deg'] });

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          left:            x,
          backgroundColor: color,
          borderRadius:    isCircle ? 8 : 2,
          transform:       [{ translateY }, { translateX }, { rotate: rotateDeg }],
          opacity,
        },
      ]}
    />
  );
});

export default function ConfettiEffect() {
  const pieces = Array.from({ length: NUM_PIECES }, (_, i) => ({
    key:      i,
    x:        Math.random() * SW,
    color:    CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delay:    Math.random() * 600,
    isCircle: i % 2 === 0,
    rotDir:   Math.random() > 0.5 ? 2 : -2,
  }));

  return (
    <View style={[styles.container, { pointerEvents: 'none' }]}>
      {pieces.map((p) => (
        <Piece key={p.key} {...p} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  piece: {
    position: 'absolute',
    top:      0,
    width:    10,
    height:   16,
  },
});
