import React, { useRef, useEffect, useCallback } from 'react';
import { Animated, TouchableOpacity, View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { lightenHex } from '../utils/gameHelpers';

/**
 * A single floating bubble.
 * Props:
 *   bubble     - { id, x, size, color: { hex, name }, speed, startDelay }
 *   screenHeight
 *   onPop(id, color, pageX, pageY)
 *   onEscape(id)
 */
export default function AnimatedBubble({ bubble, screenHeight, onPop, onEscape }) {
  const translateY = useRef(new Animated.Value(screenHeight + 120)).current;
  const sway       = useRef(new Animated.Value(0)).current;
  const scale      = useRef(new Animated.Value(1)).current;
  const opacity    = useRef(new Animated.Value(0)).current;

  const isPopped   = useRef(false);
  const floatRef   = useRef(null);
  const swayRef    = useRef(null);

  const startFloat = useCallback(() => {
    isPopped.current = false;
    translateY.setValue(screenHeight + 120);
    scale.setValue(1);
    opacity.setValue(0);

    // Fade in quickly then sustain
    Animated.timing(opacity, { toValue: 1, duration: 300, delay: bubble.startDelay, useNativeDriver: true }).start();

    // Gentle left-right sway
    swayRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(sway, { toValue: 18,  duration: 1300, useNativeDriver: true }),
        Animated.timing(sway, { toValue: -18, duration: 1300, useNativeDriver: true }),
      ])
    );
    swayRef.current.start();

    // Rise to top
    floatRef.current = Animated.timing(translateY, {
      toValue: -(bubble.size + 120),
      duration: bubble.speed,
      delay: bubble.startDelay,
      useNativeDriver: true,
    });
    floatRef.current.start(({ finished }) => {
      if (finished && !isPopped.current) {
        swayRef.current?.stop();
        onEscape(bubble.id);
      }
    });
  }, [bubble.id, bubble.size, bubble.speed, bubble.startDelay, screenHeight]);

  // Restart animation whenever bubble.id changes (respawn)
  useEffect(() => {
    startFloat();
    return () => {
      floatRef.current?.stop();
      swayRef.current?.stop();
    };
  }, [bubble.id]);

  const handlePress = useCallback(
    (event) => {
      if (isPopped.current) return;
      isPopped.current = true;

      floatRef.current?.stop();
      swayRef.current?.stop();

      const { pageX, pageY } = event.nativeEvent;

      Animated.parallel([
        // Expand then collapse
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.5, duration: 90,  useNativeDriver: true }),
          Animated.timing(scale, { toValue: 0,   duration: 140, useNativeDriver: true }),
        ]),
        Animated.timing(opacity, { toValue: 0, duration: 230, useNativeDriver: true }),
      ]).start(() => onPop(bubble.id, bubble.color, pageX, pageY));
    },
    [bubble]
  );

  const light = lightenHex(bubble.color.hex, 70);

  return (
    <Animated.View
      style={[
        styles.bubble,
        {
          left:         bubble.x,
          width:        bubble.size,
          height:       bubble.size,
          borderRadius: bubble.size / 2,
          transform:    [{ translateY }, { translateX: sway }, { scale }],
          opacity,
        },
      ]}
    >
      <TouchableOpacity
        style={styles.touch}
        onPress={handlePress}
        activeOpacity={1}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      >
        <LinearGradient
          colors={[light, bubble.color.hex]}
          style={[styles.gradient, { borderRadius: bubble.size / 2 }]}
          start={{ x: 0.2, y: 0.1 }}
          end={{ x: 0.8, y: 0.9 }}
        />
        {/* Gloss highlight */}
        <View
          style={[
            styles.shine,
            { width: bubble.size * 0.28, height: bubble.size * 0.14 },
          ]}
        />
        {/* Bottom reflection */}
        <View
          style={[
            styles.bottomShine,
            { width: bubble.size * 0.18, height: bubble.size * 0.08 },
          ]}
        />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    position: 'absolute',
    bottom: 0,
  },
  touch: {
    flex: 1,
    borderRadius: 999,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
  },
  shine: {
    position: 'absolute',
    top: '14%',
    left: '18%',
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderRadius: 20,
    transform: [{ rotate: '-30deg' }],
  },
  bottomShine: {
    position: 'absolute',
    bottom: '16%',
    right: '18%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    transform: [{ rotate: '-30deg' }],
  },
});
