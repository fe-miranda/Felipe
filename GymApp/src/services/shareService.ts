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
  const progress = totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0;
  const dateStr = new Date(workout.date).toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const avgBpm =
    heartRateSamples && heartRateSamples.length > 0
      ? Math.round(heartRateSamples.reduce((a, s) => a + s.bpm, 0) / heartRateSamples.length)
      : null;

  // Calculate total volume
  let totalVol = 0;
  for (const ex of workout.exercises)
    for (const set of ex.sets)
      if (set.done && set.load && set.reps)
        totalVol += parseFloat(set.load) * parseInt(set.reps, 10);
  totalVol = Math.round(totalVol);

  const hrRow = avgBpm
    ? `<div class="stat"><span class="stat-val">❤️ ${avgBpm}</span><span class="stat-lbl">BPM médio</span></div>`
    : '';
  const volRow = totalVol > 0
    ? `<div class="stat"><span class="stat-val">📊 ${totalVol}kg</span><span class="stat-lbl">Volume total</span></div>`
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
  .date { color: ${THEME.text3}; font-size: 13px; margin-bottom: 16px; }
  .progress-bar {
    height: 8px; background: rgba(255,255,255,0.06); border-radius: 4px;
    overflow: hidden; margin-bottom: 6px;
  }
  .progress-fill {
    height: 8px; width: ${progress}%;
    background: ${THEME.success}; border-radius: 4px;
  }
  .progress-text {
    color: ${THEME.success}; font-size: 11px; font-weight: 700;
    margin-bottom: 18px;
  }
  .stats-row {
    display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;
  }
  .stat {
    flex: 1; min-width: 80px; background: rgba(255,255,255,0.04);
    border-radius: 14px; padding: 12px; text-align: center;
  }
  .stat-val {
    display: block; color: ${THEME.primary};
    font-size: 20px; font-weight: 900;
  }
  .stat-lbl {
    display: block; color: ${THEME.text3};
    font-size: 10px; margin-top: 4px;
  }
  .divider {
    border: none; border-top: 1px solid rgba(255,255,255,0.06);
    margin: 16px 0;
  }
  .ex-title {
    color: ${THEME.text3}; font-size: 10px; font-weight: 700;
    letter-spacing: 1.5px; margin-bottom: 10px;
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
  .ex-name { color: ${THEME.text2}; font-size: 13px; flex: 1; }
  .ex-detail { color: ${THEME.text3}; font-size: 11px; white-space: nowrap; }
  .ex-loads { color: ${THEME.success}; font-size: 11px; font-weight: 700; white-space: nowrap; }
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

  <div class="progress-bar"><div class="progress-fill"></div></div>
  <div class="progress-text">${progress}% completo · ${doneSets}/${totalSets} séries</div>

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
    ${volRow}
  </div>

  <hr class="divider"/>
  <div class="ex-title">EXERCÍCIOS REALIZADOS</div>

  <ul class="exercises">
    ${workout.exercises.map(ex => {
      const done = ex.sets.filter(s => s.done).length;
      const loads = ex.sets
        .filter(s => s.done && s.load)
        .map(s => `${s.load}kg x${s.reps || '?'}`)
        .join(' · ');
      return `<li class="ex-item">
        <div class="ex-dot"></div>
        <span class="ex-name">${ex.name}</span>
        <span class="ex-detail">${done}/${ex.targetSets}</span>
        ${loads ? `<span class="ex-loads">${loads}</span>` : ''}
      </li>`;
    }).join('')}
  </ul>

  <div class="footer">gerado por <span class="brand">GymApp 💜</span></div>
</div>
</body>
</html>`;
}

function buildWorkoutStoryHtml(data: WorkoutCardData): string {
  const { workout, heartRateSamples } = data;
  const doneSets = workout.exercises.reduce((a, e) => a + e.sets.filter(s => s.done).length, 0);
  const totalSets = workout.exercises.reduce((a, e) => a + e.sets.length, 0);
  const progress = totalSets > 0 ? Math.round((doneSets / totalSets) * 100) : 0;

  const avgBpm =
    heartRateSamples && heartRateSamples.length > 0
      ? Math.round(heartRateSamples.reduce((a, s) => a + s.bpm, 0) / heartRateSamples.length)
      : null;

  // Calculate total volume
  let totalVol = 0;
  for (const ex of workout.exercises)
    for (const set of ex.sets)
      if (set.done && set.load && set.reps)
        totalVol += parseFloat(set.load) * parseInt(set.reps, 10);
  totalVol = Math.round(totalVol);

  const bpmRow = avgBpm
    ? `<div class="card-row"><span>❤️ BPM Médio</span><strong>${avgBpm}</strong></div>`
    : '';
  const volRow = totalVol > 0
    ? `<div class="card-row"><span>📊 Volume</span><strong>${totalVol}kg</strong></div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1080px; height: 1920px;
    background: linear-gradient(160deg, ${THEME.bg}, ${THEME.surface});
    color: ${THEME.text1};
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    padding: 100px 80px;
    display: flex; flex-direction: column;
  }
  .tag { color: ${THEME.primaryLight}; font-size: 36px; font-weight: 800; margin-bottom: 24px; letter-spacing: 2px; }
  .title { font-size: 72px; font-weight: 900; line-height: 1.1; margin-bottom: 16px; }
  .date { color: ${THEME.text2}; font-size: 36px; margin-bottom: 20px; }
  .done-badge {
    display: inline-block;
    background: rgba(16,185,129,0.15);
    border: 2px solid rgba(16,185,129,0.4);
    border-radius: 20px; padding: 12px 28px;
    color: ${THEME.success}; font-size: 30px; font-weight: 800;
    margin-bottom: 40px;
  }
  .progress-section { margin-bottom: 50px; }
  .bar { height: 20px; background: rgba(255,255,255,0.1); border-radius: 10px; overflow: hidden; }
  .bar-fill { height: 20px; width: ${progress}%; background: ${THEME.success}; border-radius: 10px; }
  .progress-text { color: ${THEME.success}; font-size: 28px; font-weight: 700; margin-top: 12px; }
  .card {
    background: rgba(124,58,237,0.1);
    border: 2px solid rgba(124,58,237,0.35);
    border-radius: 36px;
    padding: 48px;
    margin-bottom: 40px;
  }
  .card-row {
    display: flex; justify-content: space-between;
    margin-bottom: 20px; font-size: 36px; line-height: 1.4;
  }
  .card-row span { color: ${THEME.text2}; }
  .card-row strong { color: ${THEME.text1}; }
  .ex-title {
    color: ${THEME.text3}; font-size: 26px; font-weight: 700;
    letter-spacing: 2px; margin-bottom: 16px;
  }
  .exercise {
    display: flex; justify-content: space-between; align-items: center;
    color: ${THEME.text2}; font-size: 30px; margin-bottom: 12px;
    padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .exercise .loads { color: ${THEME.success}; font-weight: 700; font-size: 28px; }
  .footer { margin-top: auto; color: ${THEME.text3}; font-size: 28px; text-align: center; }
</style>
</head>
<body>
  <div class="tag">🔥 STORY DE TREINO</div>
  <div class="title">${workout.focus}</div>
  <div class="date">${new Date(workout.date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
  <span class="done-badge">✓ CONCLUÍDO</span>

  <div class="progress-section">
    <div class="bar"><div class="bar-fill"></div></div>
    <div class="progress-text">${progress}% completo · ${doneSets}/${totalSets} séries</div>
  </div>

  <div class="card">
    <div class="card-row"><span>⏱ Duração</span><strong>${fmtDuration(workout.durationSeconds)}</strong></div>
    <div class="card-row"><span>💪 Séries</span><strong>${doneSets}/${totalSets}</strong></div>
    ${bpmRow}
    ${volRow}
  </div>

  <div class="ex-title">EXERCÍCIOS REALIZADOS</div>
  ${workout.exercises.slice(0, 6).map((ex) => {
    const done = ex.sets.filter(s => s.done).length;
    const loads = ex.sets
      .filter(s => s.done && s.load)
      .map(s => `${s.load}kg${s.reps ? 'x' + s.reps : ''}`)
      .slice(0, 3)
      .join(' · ');
    return `<div class="exercise">
      <span>• ${ex.name} (${done}/${ex.targetSets})</span>
      ${loads ? `<span class="loads">${loads}</span>` : ''}
    </div>`;
  }).join('')}

  <div class="footer">Compartilhado via GymApp 💜</div>
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
    // Graceful text fallback — structured and readable
    const w = data.workout;
    const done = w.exercises.reduce(
      (a, e) => a + e.sets.filter(s => s.done).length, 0
    );
    const total = w.exercises.reduce((a, e) => a + e.sets.length, 0);
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;
    const dateStr = new Date(w.date).toLocaleDateString('pt-BR', {
      weekday: 'long', day: 'numeric', month: 'long',
    });

    const exLines = w.exercises.map(ex => {
      const exDone = ex.sets.filter(s => s.done).length;
      const loads = ex.sets
        .filter(s => s.done && s.load)
        .map(s => `${s.load}kg x${s.reps || '?'}`)
        .join(', ');
      return `  • ${ex.name}: ${exDone}/${ex.targetSets} séries${loads ? ` → ${loads}` : ''}`;
    }).join('\n');

    const msg = [
      `🏋️ TREINO CONCLUÍDO`,
      ``,
      `📌 ${w.focus}`,
      `📅 ${dateStr}`,
      ``,
      `⏱ Duração: ${fmtDuration(w.durationSeconds)}`,
      `💪 Séries: ${done}/${total} (${progress}%)`,
      ``,
      `📋 Exercícios:`,
      exLines,
      ``,
      `Gerado por GymApp 💜`,
    ].join('\n');

    await Share.share({ message: msg, title: 'Meu Treino' });
  }
}

/** Share workout in 9:16 story format. */
export async function shareWorkoutStory(data: WorkoutCardData): Promise<void> {
  try {
    await _shareHtml(buildWorkoutStoryHtml(data), `treino_story_${data.workout.id}.pdf`, {
      width: 1080,
      height: 1920,
    });
  } catch {
    const w = data.workout;
    const done = w.exercises.reduce((a, e) => a + e.sets.filter(s => s.done).length, 0);
    const total = w.exercises.reduce((a, e) => a + e.sets.length, 0);
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;

    const exList = w.exercises.slice(0, 5).map(ex => {
      const exDone = ex.sets.filter(s => s.done).length;
      return `  • ${ex.name} (${exDone}/${ex.targetSets})`;
    }).join('\n');

    const msg = [
      `🔥 STORY DE TREINO`,
      ``,
      `📌 ${w.focus}`,
      `⏱ ${fmtDuration(w.durationSeconds)}`,
      `💪 ${done}/${total} séries · ${progress}%`,
      ``,
      exList,
      ``,
      `Compartilhado via GymApp 💜`,
    ].join('\n');

    await Share.share({ message: msg, title: 'Story de Treino' });
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

async function _shareHtml(
  html: string,
  filename: string,
  options?: { width?: number; height?: number },
): Promise<void> {
  const print = getPrint();
  const sharing = getSharing();

  if (!print || !sharing) {
    throw new Error('expo-print or expo-sharing not available');
  }

  const isAvailable = await sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Sharing not available on this platform');
  }

  const { uri } = await print.printToFileAsync({ html, base64: false, ...options });
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
