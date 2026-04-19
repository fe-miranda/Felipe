/**
 * ShareService — generates a social card (HTML → PDF/image) from workout data
 * and triggers the platform share sheet, with options for WhatsApp/Instagram.
 *
 * Strategy for Expo managed workflow (SDK 54):
 *   1. Build an HTML string representing the social card
 *   2. Use expo-print to render it to a local file URI
 *   3. Use expo-sharing to open the platform share sheet
 *      (user can then pick WhatsApp, Instagram, etc.)
 *
 * Graceful fallback: if printing or sharing fails, we degrade to
 * React Native's built-in Share module (text-only share).
 */

import { Share } from 'react-native';
import { CompletedWorkout, HeartRateSample } from '../types';

// Requires that gracefully degrade if the native module is not installed.
// Not cached at module level to allow jest mocks to be reset between tests.
function getPrint(): typeof import('expo-print') | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-print');
  } catch {
    return null;
  }
}

function getSharing(): typeof import('expo-sharing') | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-sharing');
  } catch {
    return null;
  }
}

// ─── Theme constants (matches app palette) ────────────────────────────────────

const THEME = {
  bg: '#07070F',
  surface: '#0F0F1A',
  primary: '#7C3AED',
  primaryLight: '#A78BFA',
  success: '#10B981',
  warning: '#F59E0B',
  text1: '#F1F5F9',
  text2: '#94A3B8',
  text3: '#475569',
};

// ─── HTML card builders ───────────────────────────────────────────────────────

export interface WorkoutCardData {
  workout: CompletedWorkout;
  heartRateSamples?: HeartRateSample[];
}

export interface WeeklyCardData {
  weekLabel: string;
  totalWorkouts: number;
  totalMinutes: number;
  topExercise?: string;
  avgBpm?: number | null;
}

function fmtDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return s > 0 ? `${m}min ${s}s` : `${m}min`;
}

function buildWorkoutCardHtml(data: WorkoutCardData): string {
  const { workout, heartRateSamples } = data;
  const doneSets = workout.exercises.reduce(
    (a, e) => a + e.sets.filter(s => s.done).length, 0
  );
  const totalSets = workout.exercises.reduce((a, e) => a + e.sets.length, 0);
  const dateStr = new Date(workout.date).toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const avgBpm =
    heartRateSamples && heartRateSamples.length > 0
      ? Math.round(heartRateSamples.reduce((a, s) => a + s.bpm, 0) / heartRateSamples.length)
      : null;

  const hrRow = avgBpm
    ? `<div class="stat"><span class="stat-val">❤️ ${avgBpm}</span><span class="stat-lbl">BPM médio</span></div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    background: ${THEME.bg};
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    display: flex; align-items: center; justify-content: center;
    min-height: 100vh; padding: 20px;
  }
  .card {
    width: 400px;
    background: ${THEME.surface};
    border-radius: 24px;
    padding: 28px;
    border: 1px solid rgba(124,58,237,0.4);
    box-shadow: 0 8px 32px rgba(124,58,237,0.25);
  }
  .badge {
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(124,58,237,0.2);
    color: ${THEME.primaryLight};
    font-size: 11px; font-weight: 700; letter-spacing: 1.5px;
    padding: 4px 12px; border-radius: 20px; margin-bottom: 16px;
  }
  .title {
    color: ${THEME.text1}; font-size: 26px; font-weight: 900;
    margin-bottom: 4px; line-height: 1.2;
  }
  .date { color: ${THEME.text3}; font-size: 13px; margin-bottom: 20px; }
  .stats-row {
    display: flex; gap: 12px; margin-bottom: 20px;
  }
  .stat {
    flex: 1; background: rgba(255,255,255,0.04);
    border-radius: 14px; padding: 14px; text-align: center;
  }
  .stat-val {
    display: block; color: ${THEME.primary};
    font-size: 22px; font-weight: 900;
  }
  .stat-lbl {
    display: block; color: ${THEME.text3};
    font-size: 11px; margin-top: 4px;
  }
  .divider {
    border: none; border-top: 1px solid rgba(255,255,255,0.06);
    margin: 18px 0;
  }
  .exercises { list-style: none; }
  .ex-item {
    display: flex; align-items: center; gap: 10px;
    padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.04);
  }
  .ex-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: ${THEME.primary};
    flex-shrink: 0;
  }
  .ex-name { color: ${THEME.text2}; font-size: 14px; flex: 1; }
  .ex-sets { color: ${THEME.text3}; font-size: 13px; }
  .footer {
    margin-top: 20px; text-align: center;
    color: ${THEME.text3}; font-size: 12px;
  }
  .brand { color: ${THEME.primaryLight}; font-weight: 700; }
</style>
</head>
<body>
<div class="card">
  <div class="badge">🏋️ TREINO CONCLUÍDO</div>
  <div class="title">${workout.focus}</div>
  <div class="date">${dateStr}</div>

  <div class="stats-row">
    <div class="stat">
      <span class="stat-val">⏱ ${fmtDuration(workout.durationSeconds)}</span>
      <span class="stat-lbl">Duração</span>
    </div>
    <div class="stat">
      <span class="stat-val">💪 ${doneSets}/${totalSets}</span>
      <span class="stat-lbl">Séries</span>
    </div>
    ${hrRow}
  </div>

  <hr class="divider"/>

  <ul class="exercises">
    ${workout.exercises.map(ex => {
      const done = ex.sets.filter(s => s.done).length;
      return `<li class="ex-item">
        <div class="ex-dot"></div>
        <span class="ex-name">${ex.name}</span>
        <span class="ex-sets">${done}/${ex.targetSets} séries</span>
      </li>`;
    }).join('')}
  </ul>

  <div class="footer">gerado por <span class="brand">GymApp 💜</span></div>
</div>
</body>
</html>`;
}

function buildWeeklyCardHtml(data: WeeklyCardData): string {
  const { weekLabel, totalWorkouts, totalMinutes, topExercise, avgBpm } = data;
  const hrRow = avgBpm
    ? `<div class="stat"><span class="stat-val">❤️ ${avgBpm}</span><span class="stat-lbl">BPM médio</span></div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    background: ${THEME.bg};
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    display: flex; align-items: center; justify-content: center;
    min-height: 100vh; padding: 20px;
  }
  .card {
    width: 400px;
    background: ${THEME.surface};
    border-radius: 24px; padding: 28px;
    border: 1px solid rgba(16,185,129,0.4);
    box-shadow: 0 8px 32px rgba(16,185,129,0.2);
  }
  .badge {
    display: inline-flex; align-items: center; gap: 6px;
    background: rgba(16,185,129,0.15);
    color: ${THEME.success};
    font-size: 11px; font-weight: 700; letter-spacing: 1.5px;
    padding: 4px 12px; border-radius: 20px; margin-bottom: 16px;
  }
  .title { color: ${THEME.text1}; font-size: 24px; font-weight: 900; margin-bottom: 4px; }
  .subtitle { color: ${THEME.text3}; font-size: 13px; margin-bottom: 20px; }
  .stats-row { display: flex; gap: 12px; margin-bottom: 20px; }
  .stat {
    flex: 1; background: rgba(255,255,255,0.04);
    border-radius: 14px; padding: 14px; text-align: center;
  }
  .stat-val { display: block; color: ${THEME.success}; font-size: 22px; font-weight: 900; }
  .stat-lbl { display: block; color: ${THEME.text3}; font-size: 11px; margin-top: 4px; }
  .top-ex {
    background: rgba(124,58,237,0.12);
    border-radius: 14px; padding: 14px;
    color: ${THEME.primaryLight}; font-size: 14px; font-weight: 600;
    text-align: center; margin-bottom: 20px;
  }
  .footer { text-align: center; color: ${THEME.text3}; font-size: 12px; }
  .brand { color: ${THEME.primaryLight}; font-weight: 700; }
</style>
</head>
<body>
<div class="card">
  <div class="badge">📅 RESUMO SEMANAL</div>
  <div class="title">${weekLabel}</div>
  <div class="subtitle">Você mandou bem essa semana 💪</div>

  <div class="stats-row">
    <div class="stat">
      <span class="stat-val">🏆 ${totalWorkouts}</span>
      <span class="stat-lbl">Treinos</span>
    </div>
    <div class="stat">
      <span class="stat-val">⏱ ${totalMinutes}min</span>
      <span class="stat-lbl">Total</span>
    </div>
    ${hrRow}
  </div>

  ${topExercise ? `<div class="top-ex">🏅 Exercício destaque: <strong>${topExercise}</strong></div>` : ''}

  <div class="footer">gerado por <span class="brand">GymApp 💜</span></div>
</div>
</body>
</html>`;
}

// ─── Share functions ──────────────────────────────────────────────────────────

/**
 * Share a completed workout as a social card image.
 * Falls back to text share if image generation fails.
 */
export async function shareWorkoutCard(data: WorkoutCardData): Promise<void> {
  try {
    await _shareHtml(buildWorkoutCardHtml(data), `treino_${data.workout.id}.pdf`);
  } catch {
    // Graceful text fallback
    const done = data.workout.exercises.reduce(
      (a, e) => a + e.sets.filter(s => s.done).length, 0
    );
    const total = data.workout.exercises.reduce((a, e) => a + e.sets.length, 0);
    await Share.share({
      message: `🏋️ Treino concluído: ${data.workout.focus}\n⏱ ${fmtDuration(data.workout.durationSeconds)}\n💪 ${done}/${total} séries\n\nGerado por GymApp 💜`,
      title: 'Meu Treino',
    });
  }
}

/**
 * Share a weekly progress summary as a social card image.
 * Falls back to text share if image generation fails.
 */
export async function shareWeeklyCard(data: WeeklyCardData): Promise<void> {
  try {
    await _shareHtml(buildWeeklyCardHtml(data), 'resumo_semanal.pdf');
  } catch {
    await Share.share({
      message: `📅 Resumo semanal: ${data.weekLabel}\n🏆 ${data.totalWorkouts} treinos · ⏱ ${data.totalMinutes}min\n\nGerado por GymApp 💜`,
      title: 'Resumo Semanal',
    });
  }
}

async function _shareHtml(html: string, filename: string): Promise<void> {
  const print = getPrint();
  const sharing = getSharing();

  if (!print || !sharing) {
    throw new Error('expo-print or expo-sharing not available');
  }

  const isAvailable = await sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Sharing not available on this platform');
  }

  const { uri } = await print.printToFileAsync({ html, base64: false });
  await sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Compartilhar treino',
    UTI: 'com.adobe.pdf',
  });
}

// ─── Weekly summary builder ───────────────────────────────────────────────────

export function buildWeeklyCardData(workouts: CompletedWorkout[], avgBpm?: number | null): WeeklyCardData {
  const totalMinutes = Math.round(
    workouts.reduce((a, w) => a + w.durationSeconds, 0) / 60
  );

  // Count exercise occurrences to find top
  const exerciseCounts: Record<string, number> = {};
  for (const w of workouts) {
    for (const ex of w.exercises) {
      exerciseCounts[ex.name] = (exerciseCounts[ex.name] ?? 0) + 1;
    }
  }
  const topExercise = Object.entries(exerciseCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  const now = new Date();
  const weekLabel = `Semana ${_getWeekNumber(now)} · ${now.getFullYear()}`;

  return {
    weekLabel,
    totalWorkouts: workouts.length,
    totalMinutes,
    topExercise,
    avgBpm: avgBpm ?? null,
  };
}

function _getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
