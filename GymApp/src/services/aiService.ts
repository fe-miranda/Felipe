import { UserProfile, AnnualPlan, MonthlyBlock, WeeklyPlan, WorkoutDay } from '../types';

const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

let _apiKey: string | null = null;

export function setRuntimeApiKey(key: string | null) {
  _apiKey = key?.trim() || null;
}

function getApiKey(): string {
  if (!_apiKey) {
    throw new Error(
      'API Key não configurada. Toque em ⚙️ e adicione sua chave Groq gratuita.'
    );
  }
  return _apiKey;
}

export const GOAL_LABELS: Record<string, string> = {
  lose_weight: 'Perda de Peso',
  gain_muscle: 'Ganho de Massa Muscular',
  improve_endurance: 'Melhora de Resistência',
  general_fitness: 'Condicionamento Geral',
  increase_strength: 'Aumento de Força',
};

export const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
};

// ─── Token-efficient helpers ────────────────────────────────────────────────

/** Adjust rep range by a delta (e.g. "10-12" + 2 → "12-14"). */
export function adjustReps(reps: string, delta: number): string {
  const range = reps.match(/^(\d+)-(\d+)$/);
  if (range) {
    const min = Math.max(1, parseInt(range[1]) + delta);
    const max = Math.max(min + 1, parseInt(range[2]) + delta);
    return `${min}-${max}`;
  }
  const single = reps.match(/^(\d+)$/);
  if (single) return String(Math.max(1, parseInt(single[1]) + delta));
  return reps; // keep "30s", "AMRAP", etc. unchanged
}

/**
 * Client-side progressive overload: 1 AI template → 4 scientifically-periodized weeks.
 * Eliminates 3× redundant AI calls.
 *
 * Week 1 — Base:        Sets as-is, reps as-is         (establish baseline)
 * Week 2 — Volume:      +1 set,     reps as-is         (accumulate volume)
 * Week 3 — Intensity:   sets as-is, −2 reps            (heavier, build strength)
 * Week 4 — Deload:      −1 set,     +2 reps            (lighter, recovery)
 */
export function expandToWeeks(template: {
  theme: string;
  goals: string[];
  days: WorkoutDay[];
}): WeeklyPlan[] {
  const PROG = [
    { label: 'Base',        setsΔ:  0, repsΔ:  0 },
    { label: 'Volume',      setsΔ: +1, repsΔ:  0 },
    { label: 'Intensidade', setsΔ:  0, repsΔ: -2 },
    { label: 'Recuperação', setsΔ: -1, repsΔ: +2 },
  ];

  return PROG.map(({ label, setsΔ, repsΔ }, i) => ({
    week: i + 1,
    theme: i < 3 ? `${template.theme} — ${label}` : 'Semana de Recuperação Ativa',
    weeklyGoals: template.goals,
    days: template.days.map((day) => ({
      ...day,
      exercises: day.exercises.map((ex) => ({
        ...ex,
        sets: Math.max(1, ex.sets + setsΔ),
        reps: adjustReps(ex.reps, repsΔ),
      })),
    })),
  }));
}

// ─── HTTP layer ──────────────────────────────────────────────────────────────

async function groqPost(messages: object[], maxTokens: number): Promise<string> {
  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({ model: GROQ_MODEL, messages, max_tokens: maxTokens, temperature: 0.7 }),
  });

  if (!response.ok) {
    let msg = `Erro ${response.status}`;
    try { const e = await response.json(); msg = e.error?.message || msg; } catch {}
    throw new Error(msg);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}

function extractJson(text: string): any {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Resposta inválida da IA. Tente novamente.');
  return JSON.parse(match[0]);
}

// ─── Phase 1: Plan overview — ~600 tokens total ──────────────────────────────
// Ultra-compact prompt; no exercise detail, just the 12-month skeleton.

export async function generatePlanOverview(
  profile: UserProfile,
  onProgress?: (s: string) => void
): Promise<Omit<AnnualPlan, 'userId' | 'createdAt' | 'userProfile' | 'totalMonths'>> {
  const inj = profile.injuries ? ` Injuries/limits: ${profile.injuries}.` : '';
  const prompt =
    `12-month fitness plan structure. User: ${profile.daysPerWeek}d/week, ${profile.gender}, ` +
    `${profile.age}yo, level ${profile.fitnessLevel}, goal ${profile.goal}.${inj}\n` +
    `JSON only, PT-BR, no markdown:\n` +
    `{"overallGoal":"..","months":[{"month":1,"monthName":"Janeiro","focus":"Adaptação",` +
    `"description":"..","progressIndicators":["meta"]}],"nutritionTips":[".."],"recoveryTips":[".."]}\n` +
    `Exactly 12 months. Progressive: m1-3 base, m4-6 development, m7-9 intensity, m10-12 peak.`;

  onProgress?.('Gerando seu plano personalizado...');

  const raw = await groqPost([{ role: 'user', content: prompt }], 900);
  const data = extractJson(raw);

  return {
    overallGoal: data.overallGoal ?? '',
    monthlyBlocks: ((data.months ?? data.monthlyBlocks ?? []) as MonthlyBlock[]).map((b) => ({
      ...b,
      weeks: [],
    })),
    nutritionTips: data.nutritionTips ?? [],
    recoveryTips: data.recoveryTips ?? [],
  };
}

// ─── Phase 2: Month template — ~700 tokens total ─────────────────────────────
// AI returns ONE representative week; client expands to 4 with progressive overload.
// This approach:
//   • Reduces AI tokens by ~80% vs generating all 4 weeks
//   • Applies scientifically sound periodization automatically

export async function generateMonthDetail(
  monthBlock: Pick<MonthlyBlock, 'month' | 'monthName' | 'focus' | 'description'>,
  profile: UserProfile,
  overallGoal: string
): Promise<WeeklyPlan[]> {
  const inj = profile.injuries ? ` Avoid: ${profile.injuries}.` : '';
  const prompt =
    `Month ${monthBlock.month} (${monthBlock.monthName}) workout template. ` +
    `Plan: ${overallGoal}. Focus: ${monthBlock.focus}.\n` +
    `User: ${profile.fitnessLevel} level, goal ${profile.goal}, ${profile.daysPerWeek}d/week.${inj}\n` +
    `JSON only, PT-BR, ${profile.daysPerWeek} training days, 4+ exercises each:\n` +
    `{"theme":"tema","goals":["meta"],"days":[{"dayOfWeek":"Segunda","focus":"Peito","duration":60,` +
    `"exercises":[{"name":"Supino Reto","sets":3,"reps":"10-12","rest":"60s"}]}]}`;

  const raw = await groqPost([{ role: 'user', content: prompt }], 1400);
  const data = extractJson(raw);

  if (!data.days || !Array.isArray(data.days)) {
    throw new Error('Não foi possível gerar os treinos do mês. Tente novamente.');
  }

  return expandToWeeks({
    theme: data.theme ?? monthBlock.focus,
    goals: data.goals ?? [],
    days: data.days,
  });
}

// ─── Backward-compatible wrapper ─────────────────────────────────────────────

export async function generateAnnualPlan(
  profile: UserProfile,
  onProgress?: (s: string) => void
): Promise<AnnualPlan> {
  const overview = await generatePlanOverview(profile, onProgress);
  return {
    userId: profile.name,
    createdAt: new Date().toISOString(),
    userProfile: profile,
    totalMonths: 12,
    ...overview,
  };
}

// ─── Chat ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export async function chatAboutPlan(
  message: string,
  plan: AnnualPlan,
  history: ChatMessage[]
): Promise<string> {
  const system =
    `Personal trainer assistant for GymAI app.\n` +
    `User: ${plan.userProfile.name}, goal: ${GOAL_LABELS[plan.userProfile.goal]}, ` +
    `level: ${LEVEL_LABELS[plan.userProfile.fitnessLevel]}, ` +
    `${plan.userProfile.daysPerWeek}d/week. Plan: ${plan.overallGoal}.` +
    (plan.userProfile.injuries ? ` Limitations: ${plan.userProfile.injuries}.` : '') +
    `\nReply in PT-BR. Be concise, motivating, practical.`;

  const messages = [
    { role: 'system', content: system },
    ...history.map((h) => ({ role: h.role === 'model' ? 'assistant' : 'user', content: h.text })),
    { role: 'user', content: message },
  ];

  const reply = await groqPost(messages, 512);
  return reply || 'Não consegui gerar uma resposta. Tente novamente.';
}
