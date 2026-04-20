import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
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
      <Svg width={140} height={260}>
        <Circle cx={70} cy={28} r={16} fill="#1B1B2A" stroke="#2B2B40" strokeWidth={1.5} />
        <Path
          d="M40 56 C44 48 54 44 70 44 C86 44 96 48 100 56
             C107 70 106 88 98 102 C91 114 89 132 89 150
             C89 172 91 198 89 226 C88 238 82 248 70 248
             C58 248 52 238 51 226 C49 198 51 172 51 150
             C51 132 49 114 42 102 C34 88 33 70 40 56 Z"
          fill="#141426"
          stroke="#2B2B40"
          strokeWidth={1.5}
        />
        <Path d="M40 64 C30 76 23 98 23 122 C23 129 28 134 34 132 C40 130 43 124 44 116 C45 103 48 82 52 68 Z" fill="#141426" stroke="#2B2B40" strokeWidth={1.2} />
        <Path d="M100 64 C110 76 117 98 117 122 C117 129 112 134 106 132 C100 130 97 124 96 116 C95 103 92 82 88 68 Z" fill="#141426" stroke="#2B2B40" strokeWidth={1.2} />

        {AREAS.filter((a) => a.side === side).map((a, idx) => {
          const isActive = selected === a.group;
          const fill = colorFor(a.group, scores);
          const stroke = isActive ? '#F8FAFC' : '#1E1E30';
          const strokeWidth = isActive ? 2.2 : 1;
          if (a.shape === 'circle') {
            return (
              <Circle
                key={`${side}-${a.group}-${idx}`}
                cx={a.cx}
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
              cx={a.cx}
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
    backgroundColor: '#0F0F1A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1E1E30',
    alignItems: 'center',
    paddingVertical: 10,
  },
  sideLabel: { color: '#94A3B8', fontSize: 12, marginBottom: 6, fontWeight: '700' },
});
