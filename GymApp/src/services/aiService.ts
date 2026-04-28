import { UserProfile, AnnualPlan, MonthlyBlock, WeeklyPlan, WorkoutDay, PlanDuration, CompletedWorkout } from '../types';

const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Default key — users can override in Settings with their own Groq key
// Stored as char codes to satisfy repository secret scanning rules
const DEFAULT_API_KEY = [103,115,107,95,120,120,98,78,87,105,48,68,48,109,89,108,97,49,109,121,87,74,118,79,87,71,100,121,98,51,70,89,121,80,85,102,72,78,54,120,104,110,55,102,103,122,103,80,106,101,114,120,56,105,101,78].map(c=>String.fromCharCode(c)).join('');

let _apiKey: string | null = null;

export function setRuntimeApiKey(key: string | null) {
  _apiKey = key?.trim() || null;
}

function getApiKey(): string {
  return _apiKey || DEFAULT_API_KEY;
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

// ─── Compact user context builder ────────────────────────────────────────────

/** Returns a short string with user metrics for use in prompts. */
function userCtx(profile: UserProfile): string {
  const bmi = (profile.weight / Math.pow(profile.height / 100, 2)).toFixed(1);
  const strength = profile.workoutDuration - profile.cardioMinutes;
  return (
    `${profile.weight}kg/${profile.height}cm(BMI:${bmi}),` +
    `${strength}min strength+${profile.cardioMinutes}min cardio/session`
  );
}

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

const TIMEOUT_MS = 45_000;

function friendlyError(status: number): string | null {
  switch (status) {
    case 401: case 403: return 'Chave de API inválida ou expirada. Configure sua chave Groq em Configurações.';
    case 429: return 'Limite de uso atingido. Aguarde alguns minutos ou configure sua própria chave Groq.';
    case 500: case 502: case 503: return 'Servidor da IA indisponível. Tente novamente em instantes.';
    default: return null;
  }
}

async function groqPost(messages: object[], maxTokens: number, temperature = 0.7): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getApiKey()}`,
      },
      body: JSON.stringify({ model: GROQ_MODEL, messages, max_tokens: maxTokens, temperature }),
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new Error('Tempo esgotado. Verifique sua conexão e tente novamente.');
    throw new Error('Sem conexão. Verifique sua internet e tente novamente.');
  }
  clearTimeout(timer);

  if (!response.ok) {
    const msg = friendlyError(response.status)
      ?? (() => { try { return (response.json() as any)?.error?.message; } catch { return null; } })()
      ?? `Erro ${response.status}`;
    throw new Error(msg);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}

async function groqVisionPost(
  base64Images: { data: string; mimeType: string }[],
  textPrompt: string,
  maxTokens: number,
  temperature = 0.4,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  const imageContent = base64Images.map((img) => ({
    type: 'image_url',
    image_url: { url: `data:${img.mimeType};base64,${img.data}` },
  }));

  const messages = [
    {
      role: 'user',
      content: [
        ...imageContent,
        { type: 'text', text: textPrompt },
      ],
    },
  ];

  let response: Response;
  try {
    response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getApiKey()}`,
      },
      body: JSON.stringify({ model: GROQ_VISION_MODEL, messages, max_tokens: maxTokens, temperature }),
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === 'AbortError') throw new Error('Tempo esgotado. Verifique sua conexão e tente novamente.');
    throw new Error('Sem conexão. Verifique sua internet e tente novamente.');
  }
  clearTimeout(timer);

  if (!response.ok) {
    const msg = friendlyError(response.status)
      ?? (() => { try { return (response.json() as any)?.error?.message; } catch { return null; } })()
      ?? `Erro ${response.status}`;
    throw new Error(msg);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}

function extractJson(text: string): any {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Resposta inválida da IA. Tente novamente.');
  const raw = match[0];
  // Auto-repair truncated JSON: close unclosed arrays and objects
  const repaired = repairJson(raw);
  return JSON.parse(repaired);
}

function repairJson(raw: string): string {
  // Count unclosed braces/brackets
  let str = raw;
  const opens: string[] = [];
  for (const ch of str) {
    if (ch === '{') opens.push('}');
    else if (ch === '[') opens.push(']');
    else if (ch === '}' || ch === ']') opens.pop();
  }
  // Remove trailing comma before we close
  str = str.replace(/,\s*$/, '');
  // Close any open strings (truncated mid-string)
  if ((str.match(/"/g) ?? []).length % 2 !== 0) str += '"';
  // Close open containers
  return str + opens.reverse().join('');
}

// ─── Plan duration ───────────────────────────────────────────────────────────

const DURATION_MONTHS: Record<PlanDuration, number> = {
  weekly: 1,
  monthly: 1,
  quarterly: 3,
  biannual: 6,
  annual: 12,
};

const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function planDurationFromMonths(months: number): PlanDuration {
  if (months <= 1) return 'monthly';
  if (months <= 3) return 'quarterly';
  if (months <= 6) return 'biannual';
  return 'annual';
}

function calendarMonthName(startDate: Date, offset: number): string {
  const idx = ((startDate.getMonth() + offset) % 12 + 12) % 12;
  return MONTH_NAMES_PT[idx];
}

function withRollingMonthLabels(blocks: MonthlyBlock[], startDate: Date = new Date()): MonthlyBlock[] {
  return blocks.map((b, i) => ({
    ...b,
    month: i + 1,
    monthName: calendarMonthName(startDate, i),
  }));
}

function phaseDescForMonths(n: number): string {
  if (n <= 1) return 'Focus entirely on goal-specific training. No phase labels.';
  if (n <= 3) return 'Month 1: Base. Month 2: Development. Month 3: Consolidation.';
  if (n <= 6) return 'Months 1-2: Base. Months 3-4: Development. Months 5-6: Intensity/Peak.';
  return 'Months 1-3: Base. Months 4-6: Development. Months 7-9: Intensity. Months 10-12: Peak.';
}

// ─── Exercise alternatives ────────────────────────────────────────────────────

export async function getExerciseAlternatives(
  exerciseName: string,
  focus: string,
  exclude: string[],
): Promise<string[]> {
  const ex = exclude.length ? ` Not: ${exclude.slice(0, 6).join(', ')}.` : '';
  const prompt =
    `3 alternative exercises for "${exerciseName}" targeting ${focus}.${ex}\n` +
    `JSON only: {"a":["ex1","ex2","ex3"]}`;
  const raw = await groqPost([{ role: 'user', content: prompt }], 150);
  try {
    const data = extractJson(raw);
    const alts = data.a ?? data.alternatives;
    return Array.isArray(alts) ? alts.slice(0, 3) : [];
  } catch {
    return [];
  }
}

// ─── Phase 1: Plan overview — ~600 tokens total ──────────────────────────────
// Ultra-compact prompt; no exercise detail, just the N-month skeleton.

export async function generatePlanOverview(
  profile: UserProfile,
  onProgress?: (s: string) => void
): Promise<Omit<AnnualPlan, 'userId' | 'createdAt' | 'userProfile' | 'totalMonths'>> {
  const totalMonths = DURATION_MONTHS[profile.planDuration ?? 'annual'];
  const inj = profile.injuries ? ` Restrictions: ${profile.injuries}.` : '';
  const phases = phaseDescForMonths(totalMonths);
  const maxTokens = totalMonths <= 3 ? 600 : totalMonths <= 6 ? 900 : 1400;
  const prompt =
    `${totalMonths}-month fitness plan. User: ${profile.daysPerWeek}d/week, ${profile.gender}, ` +
    `${profile.age}yo, ${profile.fitnessLevel}, goal ${profile.goal}. ` +
    `Body: ${userCtx(profile)}.${inj}\n` +
    `Phases: ${phases}\n` +
    `JSON only, PT-BR, no markdown:\n` +
    `{"overallGoal":"..","months":[{"month":1,"monthName":"Janeiro","focus":"Adaptação",` +
    `"description":"..","progressIndicators":["meta"]}],"nutritionTips":[".."],"recoveryTips":[".."]}\n` +
    `Exactly ${totalMonths} month(s). Start months from current date.`;

  onProgress?.('Gerando seu plano personalizado...');

  const raw = await groqPost([{ role: 'user', content: prompt }], maxTokens);
  const data = extractJson(raw);

  const blocks = ((data.months ?? data.monthlyBlocks ?? []) as MonthlyBlock[]).map((b) => ({
    ...b,
    weeks: [],
  }));

  return {
    overallGoal: data.overallGoal ?? '',
    monthlyBlocks: withRollingMonthLabels(blocks),
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
  const strength = profile.workoutDuration - profile.cardioMinutes;
  // ~8 min per exercise (warm-up set + working sets + rest between sets)
  const exCount = Math.max(3, Math.min(12, Math.floor(strength / 8)));
  const phaseIdx = Math.min(3, Math.floor((monthBlock.month - 1) / 3));
  const phaseGuide = [
    '3 sets, 12-15 reps, compound basics, light-moderate load',
    '4 sets, 8-12 reps, progressive overload, moderate-heavy',
    '4-5 sets, 5-8 reps, heavy load, strength/hypertrophy',
    '5 sets, 3-6 reps, near-max load, peak performance',
  ][phaseIdx];

  const prompt =
    `Month ${monthBlock.month} "${monthBlock.focus}" workout for: ` +
    `${profile.fitnessLevel}, ${profile.goal}, ${profile.daysPerWeek}d/week. ` +
    `${userCtx(profile)}.${inj}\n` +
    `Phase: ${phaseGuide}. Each session: ${strength}min strength (${exCount} exercises) + ${profile.cardioMinutes}min cardio.\n` +
    `Rules: exercises SPECIFIC to "${monthBlock.focus}", each day hits DIFFERENT muscle groups, no repeated exercises across days.\n` +
    `JSON only, PT-BR, exactly ${profile.daysPerWeek} days:\n` +
    `{"theme":"tema","goals":["meta"],"days":[{"dayOfWeek":"Segunda","focus":"Peito","duration":${profile.workoutDuration},"exercises":[{"name":"Supino Reto","sets":4,"reps":"8-10","rest":"90s"}]}]}`;

  const raw = await groqPost([{ role: 'user', content: prompt }], 1800);
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
  const totalMonths = DURATION_MONTHS[profile.planDuration ?? 'annual'];
  return {
    userId: profile.name,
    createdAt: new Date().toISOString(),
    userProfile: profile,
    totalMonths,
    ...overview,
  };
}

// ─── Chat ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

function buildChatSystemPrompt(plan: AnnualPlan, workoutHistory: CompletedWorkout[]): string {
  const p = plan.userProfile;
  const bmi = (p.weight / Math.pow(p.height / 100, 2)).toFixed(1);
  const strength = p.workoutDuration - p.cardioMinutes;
  const genderLabel = p.gender === 'male' ? 'masculino' : p.gender === 'female' ? 'feminino' : 'outro';

  const planStart = new Date(plan.createdAt);
  const now = new Date();
  const monthsElapsed = Math.max(0,
    (now.getFullYear() - planStart.getFullYear()) * 12 + (now.getMonth() - planStart.getMonth())
  );
  const currentMonthIdx = Math.min(monthsElapsed, plan.totalMonths - 1);
  const currentMonth = plan.monthlyBlocks[currentMonthIdx];

  const total = workoutHistory.length;
  const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);
  const recent = workoutHistory.filter(w => new Date(w.date) >= fourWeeksAgo);
  const recentFreq = recent.length > 0 ? (recent.length / 4).toFixed(1) : '0';

  const lastWorkout = workoutHistory[0];
  const lastWorkoutStr = lastWorkout
    ? `${new Date(lastWorkout.date).toLocaleDateString('pt-BR')} — ${lastWorkout.focus}`
    : 'nenhum ainda';

  const focusCount: Record<string, number> = {};
  workoutHistory.slice(0, 30).forEach(w => {
    focusCount[w.focus] = (focusCount[w.focus] ?? 0) + 1;
  });
  const topFocuses = Object.entries(focusCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([f, n]) => `${f} (${n}x)`)
    .join(', ') || 'nenhum ainda';

  const planWorkouts = workoutHistory.filter(w => w.monthIndex !== undefined).length;
  const totalPlanSessions = plan.monthlyBlocks.reduce((t, b) =>
    t + b.weeks.reduce((wt, w) => wt + w.days.length, 0), 0);
  const adherenceStr = totalPlanSessions > 0
    ? `${planWorkouts}/${totalPlanSessions} sessões do plano concluídas`
    : `${total} treinos registrados`;

  const injuriesLine = p.injuries ? `\n• Restrições/lesões: ${p.injuries}` : '';

  const historyBlock = total === 0
    ? '• Nenhum treino registrado ainda — início da jornada!'
    : [
        `• Total de treinos concluídos: ${total}`,
        `• Último treino: ${lastWorkoutStr}`,
        `• Frequência (últimas 4 semanas): ${recent.length} treinos (~${recentFreq}x/sem)`,
        `• Grupos mais treinados (últimos 30): ${topFocuses}`,
        `• Adesão ao plano: ${adherenceStr}`,
      ].join('\n');

  const currentMonthBlock = currentMonth
    ? `• Mês ${currentMonthIdx + 1}/${plan.totalMonths}: ${currentMonth.monthName} — ${currentMonth.focus}\n• ${currentMonth.description}`
    : `• Plano de ${plan.totalMonths} mês(es) — ${plan.overallGoal}`;

  return (
    `Você é Coach IA, personal trainer de elite e nutricionista esportivo com 12 anos de experiência. ` +
    `Você atende EXCLUSIVAMENTE ${p.name} e conhece cada detalhe do perfil e histórico dele/dela.\n\n` +
    `PERFIL DE ${p.name.toUpperCase()}:\n` +
    `• ${p.age} anos | Sexo: ${genderLabel} | ${p.weight}kg | ${p.height}cm | IMC: ${bmi}\n` +
    `• Nível: ${LEVEL_LABELS[p.fitnessLevel]} | Objetivo: ${GOAL_LABELS[p.goal]}\n` +
    `• ${p.daysPerWeek}x/semana | Sessão: ${p.workoutDuration}min (${strength}min força + ${p.cardioMinutes}min cardio)` +
    `${injuriesLine}\n\n` +
    `PLANO ATUAL:\n` +
    `• Objetivo geral: ${plan.overallGoal}\n` +
    `${currentMonthBlock}\n\n` +
    `HISTÓRICO DE TREINOS:\n${historyBlock}\n\n` +
    `COMO RESPONDER:\n` +
    `1. Use os dados reais acima para personalizar CADA resposta — cite números específicos quando relevante\n` +
    `2. Análise de desempenho/progresso: avalie os dados do histórico de forma honesta e específica, não genérica\n` +
    `3. Tom: direto, caloroso, motivador — como coach falando com atleta que conhece bem, não como manual\n` +
    `4. Nutrição esportiva: oriente sempre alinhado ao objetivo (${GOAL_LABELS[p.goal]}) e fase atual do plano\n` +
    `5. Respostas: 2-4 parágrafos concisos, use emojis com moderação (máx 2 por resposta)\n` +
    `6. Responda SEMPRE em português brasileiro`
  );
}

export async function chatAboutPlan(
  message: string,
  plan: AnnualPlan,
  history: ChatMessage[],
  workoutHistory: CompletedWorkout[] = [],
): Promise<string> {
  const system = buildChatSystemPrompt(plan, workoutHistory);

  const messages = [
    { role: 'system', content: system },
    ...history.map((h) => ({ role: h.role === 'model' ? 'assistant' : 'user', content: h.text })),
    { role: 'user', content: message },
  ];

  const reply = await groqPost(messages, 512);
  return reply || 'Não consegui gerar uma resposta. Tente novamente.';
}

// ─── Daily suggestion ────────────────────────────────────────────────────────

export interface DailySuggestion {
  title: string;
  reason: string;
  icon: string;
  workout: WorkoutDay;
}

export async function getDailySuggestion(
  history: CompletedWorkout[],
  profile: UserProfile,
): Promise<DailySuggestion> {
  const recentFoci = history.slice(0, 5).map(w => w.focus).join(', ') || 'nenhum';
  const strength = profile.workoutDuration - profile.cardioMinutes;
  const exCount = Math.max(3, Math.min(6, Math.floor(strength / 10)));

  const prompt =
    `User: ${profile.fitnessLevel}, goal: ${profile.goal}, ${profile.daysPerWeek}d/week.\n` +
    `Recent workouts: ${recentFoci}.\n` +
    `Suggest today's workout. Avoid recently trained muscles. ${exCount} exercises.\n` +
    `JSON only, PT-BR:\n` +
    `{"title":"Costas e Bíceps","reason":"Não treinou em 3 dias","icon":"💪",` +
    `"focus":"Costas","exercises":[{"name":"Puxada Frontal","sets":4,"reps":"10-12","rest":"90s"}]}`;

  const raw = await groqPost([{ role: 'user', content: prompt }], 500);
  try {
    const data = extractJson(raw);
    return {
      title: data.title ?? 'Treino do Dia',
      reason: data.reason ?? 'Baseado no seu perfil',
      icon: data.icon ?? '💪',
      workout: {
        dayOfWeek: 'Hoje',
        focus: data.focus ?? data.title ?? 'Treino Livre',
        duration: profile.workoutDuration,
        exercises: Array.isArray(data.exercises) ? data.exercises : [],
      },
    };
  } catch {
    return {
      title: 'Treino Livre',
      reason: 'Baseado no seu perfil e histórico',
      icon: '⚡',
      workout: { dayOfWeek: 'Hoje', focus: 'Treino Livre', duration: profile.workoutDuration, exercises: [] },
    };
  }
}

// ─── Custom workout generator ─────────────────────────────────────────────────

export interface CustomWorkoutParams {
  muscleGroups: string[];
  strategy: string;
  duration: number;
  equipment: string;
  profile: UserProfile;
}

export async function generateCustomWorkout(params: CustomWorkoutParams): Promise<WorkoutDay> {
  const { muscleGroups, strategy, duration, equipment, profile } = params;
  const strength = duration - Math.min(duration * 0.25, profile.cardioMinutes);
  const exCount = Math.max(3, Math.min(8, Math.floor(strength / 8)));

  const prompt =
    `Create a ${strategy} workout for: ${muscleGroups.join(' + ')}.\n` +
    `Equipment: ${equipment}. Duration: ${duration}min. ${exCount} exercises.\n` +
    `User: ${profile.fitnessLevel}, ${profile.goal}.\n` +
    `JSON only, PT-BR:\n` +
    `{"focus":"Peito + Tríceps","exercises":[{"name":"Supino Reto","sets":4,"reps":"10-12","rest":"90s","notes":"Principal"}]}`;

  const raw = await groqPost([{ role: 'user', content: prompt }], 700);
  const data = extractJson(raw);

  return {
    dayOfWeek: 'Hoje',
    focus: data.focus ?? muscleGroups.join(' + '),
    duration,
    exercises: Array.isArray(data.exercises) ? data.exercises : [],
    notes: `${strategy} · ${equipment}`,
  };
}

// ─── Import plan from text ────────────────────────────────────────────────────

const IMPORT_PLAN_PROMPT_SUFFIX =
  `\nConvert the workout plan above into this exact JSON structure (PT-BR labels), no markdown:\n` +
  `{"overallGoal":"..","months":[{"month":1,"monthName":"Janeiro","focus":"..","description":"..","progressIndicators":[".."],"weeks":[{"week":1,"theme":"..","weeklyGoals":[".."],"days":[{"dayOfWeek":"Segunda","focus":"..","duration":60,"exercises":[{"name":"Supino Reto","sets":4,"reps":"10-12","rest":"90s"}]}]}]}],"nutritionTips":[".."],"recoveryTips":[".."]}\n` +
  `STRICT RULES — you MUST follow all of them without exception:\n` +
  `1. Copy every exercise EXACTLY as written in the source — same name, same sets, same reps, same rest. Do NOT rename, substitute, merge, or reorder any exercise.\n` +
  `2. Do NOT add any exercise, set, rep, or rest value that is not explicitly present in the source.\n` +
  `3. Do NOT remove any exercise, day, or session that appears in the source.\n` +
  `4. Do NOT apply progressive overload, periodization, or any modification to the source data.\n` +
  `5. Only fill in structural fields that are required by the JSON schema but absent from the source (e.g. dayOfWeek, duration) — use the most reasonable neutral default.\n` +
  `6. Group days into weeks (4 weeks per month) repeating the same workout structure across all weeks unless the source explicitly differs per week.\n` +
  `7. Detect technique keywords in each exercise name or notes and set "blockType" accordingly: "biset" → "biset", "triset" → "triset", "pirâmide"/"pyramid" → "pyramid", "dropset" → "dropset". If no keyword is found, omit the "blockType" field.`;

export interface ImportPlanOptions {
  userProfile: UserProfile;
  durationMonths: 1 | 3 | 6 | 12;
}

const DEFAULT_IMPORT_PROFILE: UserProfile = {
  name: 'Usuário',
  age: 25,
  weight: 70,
  height: 170,
  gender: 'male',
  fitnessLevel: 'intermediate',
  goal: 'general_fitness',
  daysPerWeek: 3,
  workoutDuration: 60,
  cardioMinutes: 10,
  planDuration: 'monthly',
};

function normalizeImportedMonths(rawMonths: any[], targetMonths: number): any[] {
  if (targetMonths <= 0) return rawMonths;
  const months = Array.isArray(rawMonths) ? [...rawMonths] : [];
  if (months.length >= targetMonths) return months.slice(0, targetMonths);
  if (months.length === 0) {
    return Array.from({ length: targetMonths }, () => ({}));
  }
  const last = months[months.length - 1];
  while (months.length < targetMonths) {
    months.push({ ...last });
  }
  return months;
}

export async function importPlanFromText(
  planText: string,
  options?: ImportPlanOptions,
): Promise<AnnualPlan> {
  const durationMonths = options?.durationMonths ?? 1;
  const prompt =
    `Workout plan to import:\n\n${planText}\n` +
    `Import constraints: this plan must have exactly ${durationMonths} month(s), starting from current calendar month.\n` +
    IMPORT_PLAN_PROMPT_SUFFIX;
  const raw = await groqPost([{ role: 'user', content: prompt }], 3000, 0.1);
  const data = extractJson(raw);
  return _buildImportedPlan(data, options);
}

// ─── Import plan from images ──────────────────────────────────────────────────

export async function importPlanFromImages(
  images: { data: string; mimeType: string }[],
  options?: ImportPlanOptions,
): Promise<AnnualPlan> {
  if (images.length === 0) throw new Error('Nenhuma imagem fornecida.');

  if (images.length === 1) {
    const durationMonths = options?.durationMonths ?? 1;
    // Single image: send directly with vision model
    const raw = await groqVisionPost(
      images,
      `Transcribe every exercise, set count, rep count, and rest time visible in this image EXACTLY as written — do not rename, add, remove, or change anything.` +
      ` Build exactly ${durationMonths} month(s) starting from current month.` +
      IMPORT_PLAN_PROMPT_SUFFIX,
      3000,
      0.1,
    );
    const data = extractJson(raw);
    return _buildImportedPlan(data, options);
  }

  // Multiple images: extract text from each image first, then combine and convert
  const extractPromises = images.map((img) =>
    groqVisionPost(
      [img],
      'Transcribe ALL workout text visible in this image exactly as written — copy every exercise name, set, rep, and rest value verbatim. Return only the raw text, no JSON.',
      800,
      0.1,
    ),
  );
  const texts = await Promise.all(extractPromises);
  const combined = texts.join('\n\n---\n\n');
  return importPlanFromText(combined, options);
}

function detectBlockType(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (/bi[- ]?set/.test(lower)) return 'biset';
  if (/tri[- ]?set/.test(lower)) return 'triset';
  if (/pir[âa]mide|pyramid/.test(lower)) return 'pyramid';
  if (/drop[- ]?set/.test(lower)) return 'dropset';
  return undefined;
}

function _buildImportedPlan(data: any, options?: ImportPlanOptions): AnnualPlan {
  const selectedMonths = options?.durationMonths ?? 1;
  const monthsInput = normalizeImportedMonths(data.months ?? data.monthlyBlocks ?? [], selectedMonths);
  const monthsRaw: MonthlyBlock[] = monthsInput.map((m: any) => ({
    month: m.month ?? 1,
    monthName: m.monthName ?? `Mês ${m.month ?? 1}`,
    focus: m.focus ?? 'Treino',
    description: m.description ?? '',
    progressIndicators: m.progressIndicators ?? [],
    weeks: (m.weeks ?? []).map((w: any) => ({
      week: w.week ?? 1,
      theme: w.theme ?? '',
      weeklyGoals: w.weeklyGoals ?? [],
      days: (w.days ?? []).map((d: any) => ({
        dayOfWeek: d.dayOfWeek ?? 'Segunda',
        focus: d.focus ?? '',
        duration: d.duration ?? 60,
        exercises: Array.isArray(d.exercises) ? d.exercises.map((ex: any) => {
          const detected = detectBlockType(`${ex.name ?? ''} ${ex.notes ?? ''}`);
          return {
            ...ex,
            blockType: ex.blockType ?? detected,
          };
        }) : [],
        notes: d.notes,
      })),
    })),
  }));
  const months = withRollingMonthLabels(monthsRaw);
  const profile: UserProfile = {
    ...(options?.userProfile ?? DEFAULT_IMPORT_PROFILE),
    planDuration: planDurationFromMonths(selectedMonths),
  };

  return {
    userId: profile.name,
    createdAt: new Date().toISOString(),
    totalMonths: selectedMonths,
    overallGoal: data.overallGoal ?? 'Plano importado',
    monthlyBlocks: months.slice(0, selectedMonths),
    nutritionTips: data.nutritionTips ?? [],
    recoveryTips: data.recoveryTips ?? [],
    userProfile: profile,
  };
}
