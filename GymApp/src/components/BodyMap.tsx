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

/* SVG canvas — taller to give more room for realistic leg proportions */
const SVG_W = 180;
const SVG_H = 340;
const SVG_PAD = 2;

/* Body center X */
const CX = SVG_W / 2; // 90

/* ── Head ── */
const HEAD_CY = 26;
const HEAD_R  = 15;

/*
 * ── Silhouette paths (redesigned for realistic human proportions) ──
 *
 * Human body ratios (standing, neutral):
 *   Head        ≈ 13%  →  ~40px
 *   Neck+torso  ≈ 35%  →  ~106px  (shoulders y≈46 to waist y≈152)
 *   Hips        ≈ 10%  →  ~30px   (y≈152 to groin y≈182)
 *   Thigh       ≈ 23%  →  ~70px   (y≈182 to knee y≈252)
 *   Shin/calf   ≈ 15%  →  ~46px   (y≈252 to ankle y≈298)
 *   Foot        ≈  4%  →  ~12px   (y≈298 to y≈310)
 *   Total visible: y=10..320 → 310px
 */

/* Torso: shoulders (y≈46) → hips (y≈190) */
const TORSO_PATH =
  `M62 54 C58 46 78 40 ${CX} 40 C102 40 122 46 118 54` +
  ` C126 68 128 88 122 108 C116 128 114 148 114 164` +
  ` C118 178 120 188 116 198 C110 204 98 208 ${CX} 208` +
  ` C82 208 70 204 64 198 C60 188 62 178 66 164` +
  ` C66 148 64 128 58 108 C52 88 54 68 62 54 Z`;

/* Left arm: shoulder→elbow y≈135, elbow→wrist y≈175 */
const ARM_L_PATH =
  'M62 64 C48 78 40 106 40 132 C40 150 48 162 56 158 C64 154 66 138 67 126 C70 108 70 84 68 68 Z';
const ARM_R_PATH =
  'M118 64 C132 78 140 106 140 132 C140 150 132 162 124 158 C116 154 114 138 113 126 C110 108 110 84 112 68 Z';

/* Left leg: hip (y≈198)→knee (y≈268)→ankle (y≈310) */
const LEG_L_PATH =
  `M64 198 C60 210 58 232 58 258 C58 278 62 298 66 314` +
  ` C68 324 72 332 78 334 C84 334 86 326 84 316` +
  ` C82 302 80 284 78 260 C76 236 74 214 72 202 Z`;
const LEG_R_PATH =
  `M116 198 C120 210 122 232 122 258 C122 278 118 298 114 314` +
  ` C112 324 108 332 102 334 C96 334 94 326 96 316` +
  ` C98 302 100 284 102 260 C104 236 106 214 108 202 Z`;

/* ── Muscle areas (anatomically positioned) ── */
const AREAS: MuscleArea[] = [
  /* ─ Front ─ */
  // Deltoid (shoulder) — lateral heads, at top of upper arm
  { group: 'Ombro',       side: 'front', shape: 'ellipse', cx: 50,   cy: 66,  rx: 11, ry: 9  },
  { group: 'Ombro',       side: 'front', shape: 'ellipse', cx: 130,  cy: 66,  rx: 11, ry: 9  },
  // Pectoralis major — upper chest, two lobes
  { group: 'Peito',       side: 'front', shape: 'ellipse', cx: 77,   cy: 88,  rx: 14, ry: 13 },
  { group: 'Peito',       side: 'front', shape: 'ellipse', cx: 103,  cy: 88,  rx: 14, ry: 13 },
  // Biceps brachii — mid upper arm
  { group: 'Bíceps',      side: 'front', shape: 'ellipse', cx: 44,   cy: 112, rx: 8,  ry: 15 },
  { group: 'Bíceps',      side: 'front', shape: 'ellipse', cx: 136,  cy: 112, rx: 8,  ry: 15 },
  // Rectus abdominis — central abdomen
  { group: 'Abdômen',     side: 'front', shape: 'ellipse', cx: CX,   cy: 134, rx: 14, ry: 26 },
  // Forearm flexors
  { group: 'Antebraço',   side: 'front', shape: 'ellipse', cx: 40,   cy: 144, rx: 6,  ry: 13 },
  { group: 'Antebraço',   side: 'front', shape: 'ellipse', cx: 140,  cy: 144, rx: 6,  ry: 13 },
  // Quadriceps — front of thigh (longer, placed in leg region)
  { group: 'Quadríceps',  side: 'front', shape: 'ellipse', cx: 77,   cy: 234, rx: 12, ry: 28 },
  { group: 'Quadríceps',  side: 'front', shape: 'ellipse', cx: 103,  cy: 234, rx: 12, ry: 28 },
  // Tibialis / gastrocnemius front
  { group: 'Panturrilha', side: 'front', shape: 'ellipse', cx: 77,   cy: 290, rx: 9,  ry: 17 },
  { group: 'Panturrilha', side: 'front', shape: 'ellipse', cx: 103,  cy: 290, rx: 9,  ry: 17 },

  /* ─ Back ─ */
  // Trapezius — upper back / neck base
  { group: 'Trapézio',    side: 'back',  shape: 'ellipse', cx: CX,   cy: 70,  rx: 22, ry: 9  },
  // Latissimus dorsi — wide mid-back
  { group: 'Costas',      side: 'back',  shape: 'ellipse', cx: CX,   cy: 112, rx: 24, ry: 22 },
  // Triceps brachii — back of upper arm
  { group: 'Tríceps',     side: 'back',  shape: 'ellipse', cx: 44,   cy: 110, rx: 8,  ry: 15 },
  { group: 'Tríceps',     side: 'back',  shape: 'ellipse', cx: 136,  cy: 110, rx: 8,  ry: 15 },
  // Forearm extensors
  { group: 'Antebraço',   side: 'back',  shape: 'ellipse', cx: 40,   cy: 144, rx: 6,  ry: 13 },
  { group: 'Antebraço',   side: 'back',  shape: 'ellipse', cx: 140,  cy: 144, rx: 6,  ry: 13 },
  // Gluteus maximus — prominent at hip/buttock area
  { group: 'Glúteo',      side: 'back',  shape: 'ellipse', cx: 77,   cy: 194, rx: 13, ry: 13 },
  { group: 'Glúteo',      side: 'back',  shape: 'ellipse', cx: 103,  cy: 194, rx: 13, ry: 13 },
  // Hamstrings — back of thigh
  { group: 'Posterior',   side: 'back',  shape: 'ellipse', cx: 77,   cy: 238, rx: 11, ry: 26 },
  { group: 'Posterior',   side: 'back',  shape: 'ellipse', cx: 103,  cy: 238, rx: 11, ry: 26 },
  // Gastrocnemius (calf) — back of lower leg
  { group: 'Panturrilha', side: 'back',  shape: 'ellipse', cx: 77,   cy: 286, rx: 9,  ry: 18 },
  { group: 'Panturrilha', side: 'back',  shape: 'ellipse', cx: 103,  cy: 286, rx: 9,  ry: 18 },
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
            <Path d={LEG_L_PATH} />
            <Path d={LEG_R_PATH} />
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
        <Path d={LEG_L_PATH}
          fill={`url(#sil-${side})`} stroke={COLORS.silhouetteStroke} strokeWidth={1} />
        <Path d={LEG_R_PATH}
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
        <Path d={LEG_L_PATH}
          fill="none" stroke={COLORS.silhouetteStroke} strokeWidth={1} />
        <Path d={LEG_R_PATH}
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
