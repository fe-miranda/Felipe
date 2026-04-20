import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Circle, Ellipse, Path, Defs, LinearGradient, Stop, Rect, ClipPath, G,
} from 'react-native-svg';
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

const COLORS = {
  silhouetteHead: '#232339',
  silhouetteBody: '#17172A',
  silhouetteStroke: '#353553',
  activeStroke: '#F8FAFC',
  inactiveStroke: '#2A2A40',
};

/* SVG canvas */
const SVG_W = 160;
const SVG_H = 290;
const SVG_PAD = 2;

/* Body center X — all muscle coords are absolute on this canvas */
const CX = SVG_W / 2; // 80

/* ── Silhouette paths (reused for both clip and drawing) ── */
const HEAD_CY = 28;
const HEAD_R = 14;

const TORSO_PATH =
  `M52 54 C56 46 66 42 ${CX} 42 C94 42 104 46 108 54
   C113 66 112 82 106 96 C100 108 98 124 98 140
   C98 160 100 180 97 218 C96 232 90 244 ${CX} 244
   C70 244 64 232 63 218 C60 180 62 160 62 140
   C62 124 60 108 54 96 C48 82 47 66 52 54 Z`;

const ARM_L_PATH =
  'M52 63 C40 74 33 96 33 116 C33 124 38 130 44 128 C50 126 53 118 54 111 C56 98 58 80 60 66 Z';
const ARM_R_PATH =
  'M108 63 C120 74 127 96 127 116 C127 124 122 130 116 128 C110 126 107 118 106 111 C104 98 102 80 100 66 Z';

/* ── Muscle areas with coordinates tuned to the silhouette ── */
const AREAS: MuscleArea[] = [
  /* ─ Front ─ */
  { group: 'Ombro',       side: 'front', shape: 'ellipse', cx: 42,  cy: 62,  rx: 10, ry: 8  },
  { group: 'Ombro',       side: 'front', shape: 'ellipse', cx: 118, cy: 62,  rx: 10, ry: 8  },
  { group: 'Peito',       side: 'front', shape: 'ellipse', cx: 67,  cy: 78,  rx: 13, ry: 11 },
  { group: 'Peito',       side: 'front', shape: 'ellipse', cx: 93,  cy: 78,  rx: 13, ry: 11 },
  { group: 'Bíceps',      side: 'front', shape: 'ellipse', cx: 38,  cy: 100, rx: 7,  ry: 13 },
  { group: 'Bíceps',      side: 'front', shape: 'ellipse', cx: 122, cy: 100, rx: 7,  ry: 13 },
  { group: 'Abdômen',     side: 'front', shape: 'ellipse', cx: CX,  cy: 114, rx: 14, ry: 20 },
  { group: 'Quadríceps',  side: 'front', shape: 'ellipse', cx: 70,  cy: 172, rx: 11, ry: 22 },
  { group: 'Quadríceps',  side: 'front', shape: 'ellipse', cx: 90,  cy: 172, rx: 11, ry: 22 },

  /* ─ Back ─ */
  { group: 'Trapézio',    side: 'back',  shape: 'ellipse', cx: CX,  cy: 66,  rx: 20, ry: 8  },
  { group: 'Costas',      side: 'back',  shape: 'ellipse', cx: CX,  cy: 96,  rx: 22, ry: 18 },
  { group: 'Tríceps',     side: 'back',  shape: 'ellipse', cx: 38,  cy: 100, rx: 7,  ry: 13 },
  { group: 'Tríceps',     side: 'back',  shape: 'ellipse', cx: 122, cy: 100, rx: 7,  ry: 13 },
  { group: 'Glúteo',      side: 'back',  shape: 'ellipse', cx: 70,  cy: 144, rx: 11, ry: 11 },
  { group: 'Glúteo',      side: 'back',  shape: 'ellipse', cx: 90,  cy: 144, rx: 11, ry: 11 },
  { group: 'Posterior',   side: 'back',  shape: 'ellipse', cx: 70,  cy: 178, rx: 10, ry: 20 },
  { group: 'Posterior',   side: 'back',  shape: 'ellipse', cx: 90,  cy: 178, rx: 10, ry: 20 },
  { group: 'Panturrilha', side: 'back',  shape: 'ellipse', cx: 70,  cy: 222, rx: 8,  ry: 15 },
  { group: 'Panturrilha', side: 'back',  shape: 'ellipse', cx: 90,  cy: 222, rx: 8,  ry: 15 },
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
  const clipId = `body-clip-${side}`;
  return (
    <View style={sty.mapSide}>
      <Text style={sty.sideLabel}>{side === 'front' ? 'Frontal' : 'Dorsal'}</Text>
      <Svg width={SVG_W} height={SVG_H}>
        <Defs>
          <LinearGradient id={`bg-${side}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#121223" />
            <Stop offset="1" stopColor="#0B0B18" />
          </LinearGradient>
          <LinearGradient id={`sil-${side}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#1E1E32" />
            <Stop offset="1" stopColor="#141425" />
          </LinearGradient>
          {/* Clip path keeps all muscle fills inside the body */}
          <ClipPath id={clipId}>
            <Circle cx={CX} cy={HEAD_CY} r={HEAD_R} />
            <Path d={TORSO_PATH} />
            <Path d={ARM_L_PATH} />
            <Path d={ARM_R_PATH} />
          </ClipPath>
        </Defs>

        {/* Background */}
        <Rect
          x={SVG_PAD} y={SVG_PAD}
          width={SVG_W - SVG_PAD * 2} height={SVG_H - SVG_PAD * 2}
          rx={16} fill={`url(#bg-${side})`}
        />

        {/* Silhouette fill */}
        <Circle cx={CX} cy={HEAD_CY} r={HEAD_R}
          fill={COLORS.silhouetteHead} stroke={COLORS.silhouetteStroke} strokeWidth={1.2} />
        <Path d={TORSO_PATH}
          fill={`url(#sil-${side})`} stroke={COLORS.silhouetteStroke} strokeWidth={1.2} />
        <Path d={ARM_L_PATH}
          fill={`url(#sil-${side})`} stroke={COLORS.silhouetteStroke} strokeWidth={1} />
        <Path d={ARM_R_PATH}
          fill={`url(#sil-${side})`} stroke={COLORS.silhouetteStroke} strokeWidth={1} />

        {/* Muscle areas — clipped to the body silhouette */}
        <G clipPath={`url(#${clipId})`}>
          {AREAS.filter((a) => a.side === side).map((a, idx) => {
            const isActive = selected === a.group;
            const fill = colorFor(a.group, scores);
            const stroke = isActive ? COLORS.activeStroke : COLORS.inactiveStroke;
            const strokeW = isActive ? 2 : 0.8;
            if (a.shape === 'circle') {
              return (
                <Circle
                  key={`${side}-${a.group}-${idx}`}
                  cx={a.cx} cy={a.cy} r={a.r!}
                  fill={fill} opacity={0.85}
                  stroke={stroke} strokeWidth={strokeW}
                  onPress={() => onSelect(a.group)}
                />
              );
            }
            return (
              <Ellipse
                key={`${side}-${a.group}-${idx}`}
                cx={a.cx} cy={a.cy} rx={a.rx!} ry={a.ry!}
                fill={fill} opacity={0.85}
                stroke={stroke} strokeWidth={strokeW}
                onPress={() => onSelect(a.group)}
              />
            );
          })}
        </G>

        {/* Re-draw silhouette outline on top for clean edges */}
        <Circle cx={CX} cy={HEAD_CY} r={HEAD_R}
          fill="none" stroke={COLORS.silhouetteStroke} strokeWidth={1.2} />
        <Path d={TORSO_PATH}
          fill="none" stroke={COLORS.silhouetteStroke} strokeWidth={1.2} />
        <Path d={ARM_L_PATH}
          fill="none" stroke={COLORS.silhouetteStroke} strokeWidth={1} />
        <Path d={ARM_R_PATH}
          fill="none" stroke={COLORS.silhouetteStroke} strokeWidth={1} />
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
    <View style={sty.wrap}>
      <SideMap side="front" scores={scores} selected={selected} onSelect={onSelect} />
      <SideMap side="back" scores={scores} selected={selected} onSelect={onSelect} />
    </View>
  );
}

const sty = StyleSheet.create({
  wrap: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 14 },
  mapSide: {
    flex: 1,
    backgroundColor: '#0E0E1A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#24243A',
    alignItems: 'center',
    paddingVertical: 8,
    overflow: 'hidden',
  },
  sideLabel: { color: '#A7B4CC', fontSize: 12, marginBottom: 6, fontWeight: '800', letterSpacing: 0.5 },
});
