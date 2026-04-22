import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Circle, Ellipse, Path, Defs, LinearGradient, Stop, Rect, ClipPath, G, Text as SvgText,
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
const SVG_W = 180;
const SVG_H = 320;
const SVG_PAD = 2;

/* Body center X */
const CX = SVG_W / 2; // 90

/* ── Silhouette paths ── */
const HEAD_CY = 30;
const HEAD_R = 16;

const TORSO_PATH =
  `M58 60 C62 50 74 46 ${CX} 46 C106 46 118 50 122 60
   C128 74 126 92 119 108 C113 122 111 140 111 158
   C111 180 113 202 109 246 C108 262 100 276 ${CX} 276
   C80 276 72 262 71 246 C67 202 69 180 69 158
   C69 140 67 122 61 108 C54 92 52 74 58 60 Z`;

const ARM_L_PATH =
  'M58 70 C44 84 36 110 36 133 C36 142 42 149 49 147 C56 145 59 135 60 127 C63 111 65 90 67 73 Z';
const ARM_R_PATH =
  'M122 70 C136 84 144 110 144 133 C144 142 138 149 131 147 C124 145 121 135 120 127 C117 111 115 90 113 73 Z';

const LEG_L_FRONT =
  'M69 246 C67 260 66 278 66 296 C66 308 70 318 ${CX - 14} 318 C${CX - 8} 318 ${CX - 4} 308 ${CX - 5} 296 C${CX - 6} 278 ${CX - 6} 260 71 246 Z'
    .replace(/\$\{CX - 14\}/g, String(CX - 14)).replace(/\$\{CX - 8\}/g, String(CX - 8))
    .replace(/\$\{CX - 4\}/g, String(CX - 4)).replace(/\$\{CX - 5\}/g, String(CX - 5))
    .replace(/\$\{CX - 6\}/g, String(CX - 6));
const LEG_R_FRONT =
  'M109 246 C111 260 114 278 114 296 C114 308 110 318 ${CX + 14} 318 C${CX + 8} 318 ${CX + 4} 308 ${CX + 5} 296 C${CX + 6} 278 ${CX + 6} 260 109 246 Z'
    .replace(/\$\{CX \+ 14\}/g, String(CX + 14)).replace(/\$\{CX \+ 8\}/g, String(CX + 8))
    .replace(/\$\{CX \+ 4\}/g, String(CX + 4)).replace(/\$\{CX \+ 5\}/g, String(CX + 5))
    .replace(/\$\{CX \+ 6\}/g, String(CX + 6));

/* ── Muscle areas ── */
const AREAS: MuscleArea[] = [
  /* ─ Front ─ */
  { group: 'Ombro',       side: 'front', shape: 'ellipse', cx: 47,   cy: 68,  rx: 11, ry: 9  },
  { group: 'Ombro',       side: 'front', shape: 'ellipse', cx: 133,  cy: 68,  rx: 11, ry: 9  },
  { group: 'Peito',       side: 'front', shape: 'ellipse', cx: 76,   cy: 86,  rx: 14, ry: 12 },
  { group: 'Peito',       side: 'front', shape: 'ellipse', cx: 104,  cy: 86,  rx: 14, ry: 12 },
  { group: 'Bíceps',      side: 'front', shape: 'ellipse', cx: 42,   cy: 110, rx: 8,  ry: 14 },
  { group: 'Bíceps',      side: 'front', shape: 'ellipse', cx: 138,  cy: 110, rx: 8,  ry: 14 },
  { group: 'Abdômen',     side: 'front', shape: 'ellipse', cx: CX,   cy: 126, rx: 15, ry: 22 },
  { group: 'Antebraço',   side: 'front', shape: 'ellipse', cx: 39,   cy: 138, rx: 6,  ry: 12 },
  { group: 'Antebraço',   side: 'front', shape: 'ellipse', cx: 141,  cy: 138, rx: 6,  ry: 12 },
  { group: 'Quadríceps',  side: 'front', shape: 'ellipse', cx: 79,   cy: 192, rx: 12, ry: 24 },
  { group: 'Quadríceps',  side: 'front', shape: 'ellipse', cx: 101,  cy: 192, rx: 12, ry: 24 },
  { group: 'Panturrilha', side: 'front', shape: 'ellipse', cx: 79,   cy: 268, rx: 9,  ry: 16 },
  { group: 'Panturrilha', side: 'front', shape: 'ellipse', cx: 101,  cy: 268, rx: 9,  ry: 16 },

  /* ─ Back ─ */
  { group: 'Trapézio',    side: 'back',  shape: 'ellipse', cx: CX,   cy: 72,  rx: 22, ry: 9  },
  { group: 'Costas',      side: 'back',  shape: 'ellipse', cx: CX,   cy: 106, rx: 24, ry: 20 },
  { group: 'Tríceps',     side: 'back',  shape: 'ellipse', cx: 42,   cy: 110, rx: 8,  ry: 14 },
  { group: 'Tríceps',     side: 'back',  shape: 'ellipse', cx: 138,  cy: 110, rx: 8,  ry: 14 },
  { group: 'Antebraço',   side: 'back',  shape: 'ellipse', cx: 39,   cy: 138, rx: 6,  ry: 12 },
  { group: 'Antebraço',   side: 'back',  shape: 'ellipse', cx: 141,  cy: 138, rx: 6,  ry: 12 },
  { group: 'Glúteo',      side: 'back',  shape: 'ellipse', cx: 79,   cy: 160, rx: 12, ry: 12 },
  { group: 'Glúteo',      side: 'back',  shape: 'ellipse', cx: 101,  cy: 160, rx: 12, ry: 12 },
  { group: 'Posterior',   side: 'back',  shape: 'ellipse', cx: 79,   cy: 200, rx: 11, ry: 22 },
  { group: 'Posterior',   side: 'back',  shape: 'ellipse', cx: 101,  cy: 200, rx: 11, ry: 22 },
  { group: 'Panturrilha', side: 'back',  shape: 'ellipse', cx: 79,   cy: 254, rx: 9,  ry: 17 },
  { group: 'Panturrilha', side: 'back',  shape: 'ellipse', cx: 101,  cy: 254, rx: 9,  ry: 17 },
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
          <LinearGradient id={`sil-${side}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#222238" />
            <Stop offset="0.5" stopColor="#1E1E32" />
            <Stop offset="1" stopColor="#141425" />
          </LinearGradient>
          {/* Clip path keeps all muscle fills inside the body */}
          <ClipPath id={clipId}>
            <Circle cx={CX} cy={HEAD_CY} r={HEAD_R} />
            <Path d={TORSO_PATH} />
            <Path d={ARM_L_PATH} />
            <Path d={ARM_R_PATH} />
            <Path d={LEG_L_FRONT} />
            <Path d={LEG_R_FRONT} />
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
        <Path d={LEG_L_FRONT}
          fill={`url(#sil-${side})`} stroke={COLORS.silhouetteStroke} strokeWidth={1} />
        <Path d={LEG_R_FRONT}
          fill={`url(#sil-${side})`} stroke={COLORS.silhouetteStroke} strokeWidth={1} />

        {/* Muscle areas — clipped to the body silhouette */}
        <G clipPath={`url(#${clipId})`}>
          {AREAS.filter((a) => a.side === side).map((a, idx) => {
            const isSelected = selected === a.group;
            const fill = colorFor(a.group, scores);
            const stroke = isSelected ? COLORS.activeStroke : COLORS.inactiveStroke;
            const strokeW = isSelected ? 2 : 0.8;
            const opacity = isSelected ? 0.95 : 0.75;
            if (a.shape === 'circle') {
              return (
                <G key={`${side}-${a.group}-${idx}`}>
                  <Circle cx={a.cx} cy={a.cy} r={a.r!}
                    fill={fill} opacity={opacity}
                    stroke={stroke} strokeWidth={strokeW}
                    onPress={() => onSelect(a.group)} />
                  {isSelected && (
                    <Circle cx={a.cx} cy={a.cy} r={a.r! * 0.6}
                      fill={fill} opacity={0.3} />
                  )}
                </G>
              );
            }
            return (
              <G key={`${side}-${a.group}-${idx}`}>
                <Ellipse cx={a.cx} cy={a.cy} rx={a.rx!} ry={a.ry!}
                  fill={fill} opacity={opacity}
                  stroke={stroke} strokeWidth={strokeW}
                  onPress={() => onSelect(a.group)} />
                {isSelected && (
                  <Ellipse cx={a.cx} cy={a.cy} rx={a.rx! * 0.6} ry={a.ry! * 0.6}
                    fill={fill} opacity={0.3} />
                )}
                {isSelected && (
                  <SvgText
                    x={a.cx} y={a.cy + 3}
                    fill="#fff" fontSize={7} textAnchor="middle" fontWeight="700"
                  >
                    {a.group.split(' ')[0]}
                  </SvgText>
                )}
              </G>
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
        <Path d={LEG_L_FRONT}
          fill="none" stroke={COLORS.silhouetteStroke} strokeWidth={1} />
        <Path d={LEG_R_FRONT}
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
