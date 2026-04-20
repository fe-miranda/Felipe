import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { FatigueScore, fatigueColor } from '../services/muscleService';

type Side = 'front' | 'back';

interface Region {
  group: string;
  side: Side;
  x: number;
  y: number;
  w: number;
  h: number;
}

const REGIONS: Region[] = [
  { group: 'Ombro', side: 'front', x: 16, y: 16, w: 68, h: 24 },
  { group: 'Peito', side: 'front', x: 20, y: 44, w: 60, h: 34 },
  { group: 'Bíceps', side: 'front', x: 5, y: 50, w: 12, h: 42 },
  { group: 'Tríceps', side: 'back', x: 83, y: 50, w: 12, h: 42 },
  { group: 'Abdômen', side: 'front', x: 28, y: 82, w: 44, h: 40 },
  { group: 'Costas', side: 'back', x: 20, y: 44, w: 60, h: 48 },
  { group: 'Trapézio', side: 'back', x: 28, y: 18, w: 44, h: 22 },
  { group: 'Glúteo', side: 'back', x: 26, y: 96, w: 48, h: 24 },
  { group: 'Quadríceps', side: 'front', x: 26, y: 126, w: 22, h: 48 },
  { group: 'Posterior', side: 'back', x: 52, y: 126, w: 22, h: 48 },
  { group: 'Panturrilha', side: 'back', x: 52, y: 178, w: 18, h: 38 },
];

function colorFor(group: string, scores: FatigueScore[]): string {
  const score = scores.find((s) => s.group === group)?.score ?? 0;
  return fatigueColor(score);
}

export function BodyMap({ scores, selected, onSelect }: {
  scores: FatigueScore[];
  selected: string | null;
  onSelect: (group: string) => void;
}) {
  const renderSide = (side: Side) => (
    <TouchableOpacity style={s.mapSide} activeOpacity={0.9} onPress={() => {}}>
      <Text style={s.sideLabel}>{side === 'front' ? 'Frontal' : 'Dorsal'}</Text>
      <Svg width={100} height={220}>
        {REGIONS.filter((r) => r.side === side).map((r) => {
          const active = selected === r.group;
          return (
            <Rect
              key={`${side}-${r.group}-${r.x}`}
              x={r.x}
              y={r.y}
              width={r.w}
              height={r.h}
              rx={8}
              fill={colorFor(r.group, scores)}
              stroke={active ? '#F1F5F9' : '#1E1E30'}
              strokeWidth={active ? 2 : 1}
              onPress={() => onSelect(r.group)}
            />
          );
        })}
      </Svg>
    </TouchableOpacity>
  );

  return <View style={s.wrap}>{renderSide('front')}{renderSide('back')}</View>;
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
