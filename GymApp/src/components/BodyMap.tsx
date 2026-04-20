import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Ellipse, Path, Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { FatigueScore, fatigueColor } from '../services/muscleService';

type Side = 'front' | 'back';

interface MuscleArea {
  group: string;
  side: Side;
  shape: 'ellipse' | 'circle';
  cx: number;
  cy: number;
  rx?: number;
  ry?: number;
  r?: number;
}

const C = {
  silhouetteHead: '#232339',
  silhouetteBody: '#17172A',
  silhouetteStroke: '#353553',
  activeStroke: '#F8FAFC',
  inactiveStroke: '#2A2A40',
};
// Horizontal correction to center legacy muscle coordinates in the updated silhouette layout.
const POSITION_OFFSET_X = 8;
const SVG_WIDTH = 156;
const SVG_HEIGHT = 276;
const SVG_INSET = 2;

const AREAS: MuscleArea[] = [
  { group: 'Ombro', side: 'front', shape: 'circle', cx: 32, cy: 78, r: 12 },
  { group: 'Ombro', side: 'front', shape: 'circle', cx: 108, cy: 78, r: 12 },
  { group: 'Peito', side: 'front', shape: 'ellipse', cx: 56, cy: 92, rx: 16, ry: 13 },
  { group: 'Peito', side: 'front', shape: 'ellipse', cx: 84, cy: 92, rx: 16, ry: 13 },
  { group: 'Bíceps', side: 'front', shape: 'ellipse', cx: 26, cy: 112, rx: 8, ry: 15 },
  { group: 'Bíceps', side: 'front', shape: 'ellipse', cx: 114, cy: 112, rx: 8, ry: 15 },
  { group: 'Abdômen', side: 'front', shape: 'ellipse', cx: 70, cy: 122, rx: 18, ry: 22 },
  { group: 'Quadríceps', side: 'front', shape: 'ellipse', cx: 58, cy: 176, rx: 13, ry: 24 },
  { group: 'Quadríceps', side: 'front', shape: 'ellipse', cx: 82, cy: 176, rx: 13, ry: 24 },

  { group: 'Trapézio', side: 'back', shape: 'ellipse', cx: 70, cy: 82, rx: 22, ry: 10 },
  { group: 'Costas', side: 'back', shape: 'ellipse', cx: 70, cy: 108, rx: 28, ry: 22 },
  { group: 'Tríceps', side: 'back', shape: 'ellipse', cx: 28, cy: 112, rx: 8, ry: 15 },
  { group: 'Tríceps', side: 'back', shape: 'ellipse', cx: 112, cy: 112, rx: 8, ry: 15 },
  { group: 'Glúteo', side: 'back', shape: 'ellipse', cx: 58, cy: 150, rx: 12, ry: 12 },
  { group: 'Glúteo', side: 'back', shape: 'ellipse', cx: 82, cy: 150, rx: 12, ry: 12 },
  { group: 'Posterior', side: 'back', shape: 'ellipse', cx: 58, cy: 184, rx: 12, ry: 23 },
  { group: 'Posterior', side: 'back', shape: 'ellipse', cx: 82, cy: 184, rx: 12, ry: 23 },
  { group: 'Panturrilha', side: 'back', shape: 'ellipse', cx: 58, cy: 228, rx: 9, ry: 18 },
  { group: 'Panturrilha', side: 'back', shape: 'ellipse', cx: 82, cy: 228, rx: 9, ry: 18 },
];

function colorFor(group: string, scores: FatigueScore[]): string {
  const score = scores.find((s) => s.group === group)?.score ?? 0;
  return fatigueColor(score);
}

function SideMap({
  side,
  scores,
  selected,
  onSelect,
}: {
  side: Side;
  scores: FatigueScore[];
  selected: string | null;
  onSelect: (group: string) => void;
}) {
  return (
    <View style={s.mapSide}>
      <Text style={s.sideLabel}>{side === 'front' ? 'Frontal' : 'Dorsal'}</Text>
      <Svg width={SVG_WIDTH} height={SVG_HEIGHT}>
        <Defs>
          <LinearGradient id="bodyMapBg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#121223" />
            <Stop offset="1" stopColor="#0B0B18" />
          </LinearGradient>
          <LinearGradient id="bodySilhouette" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#1E1E32" />
            <Stop offset="1" stopColor="#141425" />
          </LinearGradient>
        </Defs>
        <Rect
          x={SVG_INSET}
          y={SVG_INSET}
          width={SVG_WIDTH - SVG_INSET * 2}
          height={SVG_HEIGHT - SVG_INSET * 2}
          rx={16}
          fill="url(#bodyMapBg)"
        />
        <Circle cx={78} cy={30} r={16} fill={C.silhouetteHead} stroke={C.silhouetteStroke} strokeWidth={1.5} />
        <Path
          d="M48 56 C52 48 62 44 78 44 C94 44 104 48 108 56
             C114 69 112 88 104 103 C98 114 96 130 96 146
             C96 170 98 190 95 228 C94 244 88 254 78 254
             C68 254 62 244 61 228 C58 190 60 170 60 146
             C60 130 58 114 52 103 C44 88 42 69 48 56 Z"
          fill="url(#bodySilhouette)"
          stroke={C.silhouetteStroke}
          strokeWidth={1.5}
        />
        <Path d="M48 66 C36 78 28 102 28 124 C28 133 34 140 42 137 C48 134 51 126 52 118 C54 102 58 84 60 70 Z" fill="url(#bodySilhouette)" stroke={C.silhouetteStroke} strokeWidth={1.2} />
        <Path d="M108 66 C120 78 128 102 128 124 C128 133 122 140 114 137 C108 134 105 126 104 118 C102 102 98 84 96 70 Z" fill="url(#bodySilhouette)" stroke={C.silhouetteStroke} strokeWidth={1.2} />

        {AREAS.filter((a) => a.side === side).map((a, idx) => {
          const isActive = selected === a.group;
          const fill = colorFor(a.group, scores);
          const stroke = isActive ? C.activeStroke : C.inactiveStroke;
          const strokeWidth = isActive ? 2.2 : 1;
          if (a.shape === 'circle') {
            return (
              <Circle
                key={`${side}-${a.group}-${idx}`}
                cx={a.cx + POSITION_OFFSET_X}
                cy={a.cy}
                r={a.r!}
                fill={fill}
                opacity={0.95}
                stroke={stroke}
                strokeWidth={strokeWidth}
                onPress={() => onSelect(a.group)}
              />
            );
          }
          return (
            <Ellipse
              key={`${side}-${a.group}-${idx}`}
              cx={a.cx + POSITION_OFFSET_X}
              cy={a.cy}
              rx={a.rx!}
              ry={a.ry!}
              fill={fill}
              opacity={0.95}
              stroke={stroke}
              strokeWidth={strokeWidth}
              onPress={() => onSelect(a.group)}
            />
          );
        })}
      </Svg>
    </View>
  );
}

export function BodyMap({
  scores,
  selected,
  onSelect,
}: {
  scores: FatigueScore[];
  selected: string | null;
  onSelect: (group: string) => void;
}) {
  return (
    <View style={s.wrap}>
      <SideMap side="front" scores={scores} selected={selected} onSelect={onSelect} />
      <SideMap side="back" scores={scores} selected={selected} onSelect={onSelect} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 14 },
  mapSide: {
    flex: 1,
    backgroundColor: '#0E0E1A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#24243A',
    alignItems: 'center',
    paddingVertical: 8,
  },
  sideLabel: { color: '#A7B4CC', fontSize: 12, marginBottom: 6, fontWeight: '800', letterSpacing: 0.5 },
});
