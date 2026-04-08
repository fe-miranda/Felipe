import {
  generateAnnualPlan,
  generatePlanOverview,
  generateMonthDetail,
  chatAboutPlan,
  setRuntimeApiKey,
  adjustReps,
  expandToWeeks,
  GOAL_LABELS,
  LEVEL_LABELS,
} from '../src/services/aiService';
import type { UserProfile, AnnualPlan, MonthlyBlock, WorkoutDay } from '../src/types';

// ─── Fixtures ──────────────────────────────────────────────────────────────

const mockProfile: UserProfile = {
  name: 'João', age: 28, weight: 80, height: 178,
  gender: 'male', goal: 'gain_muscle', fitnessLevel: 'intermediate', daysPerWeek: 4,
};

const mockMonthBlock: Pick<MonthlyBlock, 'month' | 'monthName' | 'focus' | 'description'> = {
  month: 1, monthName: 'Janeiro', focus: 'Adaptação', description: 'Mês de adaptação ao treino',
};

const mockDays: WorkoutDay[] = [
  {
    dayOfWeek: 'Segunda', focus: 'Peito e Tríceps', duration: 60,
    exercises: [{ name: 'Supino Reto', sets: 3, reps: '10-12', rest: '60s' }],
  },
];

const mockTemplate = { theme: 'Hipertrofia Base', goals: ['Consistência'], days: mockDays };

const mockOverviewData = {
  overallGoal: 'Ganhar 5kg de músculo em 12 meses',
  months: Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    monthName: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][i],
    focus: 'Base', description: 'Mês de adaptação',
    progressIndicators: ['Completar todos os treinos'],
  })),
  nutritionTips: ['Comer proteína suficiente'],
  recoveryTips: ['Dormir 8h'],
};

const mockAnnualPlan: AnnualPlan = {
  userId: 'João', createdAt: new Date().toISOString(), userProfile: mockProfile, totalMonths: 12,
  overallGoal: mockOverviewData.overallGoal,
  monthlyBlocks: mockOverviewData.months.map((m) => ({ ...m, weeks: [] })),
  nutritionTips: mockOverviewData.nutritionTips, recoveryTips: mockOverviewData.recoveryTips,
};

function groqResponse(content: string) {
  return { ok: true, json: () => Promise.resolve({ choices: [{ message: { content } }] }) };
}
function groqError(status: number, message: string) {
  return { ok: false, status, json: () => Promise.resolve({ error: { message } }) };
}

// ─── Setup ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  global.fetch = jest.fn();
  setRuntimeApiKey('test-groq-key-123');
});
afterEach(() => {
  jest.clearAllMocks();
  setRuntimeApiKey(null);
});

// ─── GOAL_LABELS / LEVEL_LABELS ────────────────────────────────────────────

describe('GOAL_LABELS', () => {
  it('has entries for all goal types', () => {
    expect(GOAL_LABELS.lose_weight).toBe('Perda de Peso');
    expect(GOAL_LABELS.gain_muscle).toBe('Ganho de Massa Muscular');
    expect(GOAL_LABELS.improve_endurance).toBe('Melhora de Resistência');
    expect(GOAL_LABELS.general_fitness).toBe('Condicionamento Geral');
    expect(GOAL_LABELS.increase_strength).toBe('Aumento de Força');
  });
});

describe('LEVEL_LABELS', () => {
  it('has entries for all fitness levels', () => {
    expect(LEVEL_LABELS.beginner).toBe('Iniciante');
    expect(LEVEL_LABELS.intermediate).toBe('Intermediário');
    expect(LEVEL_LABELS.advanced).toBe('Avançado');
  });
});

// ─── adjustReps ────────────────────────────────────────────────────────────

describe('adjustReps', () => {
  it('adjusts a range by positive delta', () => {
    expect(adjustReps('10-12', 2)).toBe('12-14');
  });
  it('adjusts a range by negative delta', () => {
    expect(adjustReps('10-12', -2)).toBe('8-10');
  });
  it('clamps minimum to 1', () => {
    expect(adjustReps('1-3', -5)).toBe('1-2');
  });
  it('adjusts a single number', () => {
    expect(adjustReps('10', 3)).toBe('13');
  });
  it('leaves non-numeric strings unchanged', () => {
    expect(adjustReps('30s', 5)).toBe('30s');
    expect(adjustReps('AMRAP', -2)).toBe('AMRAP');
  });
  it('clamps single number minimum to 1', () => {
    expect(adjustReps('2', -10)).toBe('1');
  });
});

// ─── expandToWeeks ─────────────────────────────────────────────────────────

describe('expandToWeeks', () => {
  it('always produces exactly 4 weeks', () => {
    const weeks = expandToWeeks(mockTemplate);
    expect(weeks).toHaveLength(4);
  });

  it('week numbers are 1–4', () => {
    const weeks = expandToWeeks(mockTemplate);
    weeks.forEach((w, i) => expect(w.week).toBe(i + 1));
  });

  it('week 2 has +1 set (volume phase)', () => {
    const weeks = expandToWeeks(mockTemplate);
    const baseSets = mockDays[0].exercises[0].sets;
    expect(weeks[1].days[0].exercises[0].sets).toBe(baseSets + 1);
  });

  it('week 3 has −2 reps (intensity phase)', () => {
    const weeks = expandToWeeks(mockTemplate);
    const baseReps = mockDays[0].exercises[0].reps; // "10-12"
    expect(weeks[2].days[0].exercises[0].reps).toBe('8-10');
    expect(baseReps).toBe('10-12'); // original unchanged
  });

  it('week 4 has −1 set and +2 reps (deload phase)', () => {
    const weeks = expandToWeeks(mockTemplate);
    const baseSets = mockDays[0].exercises[0].sets;
    expect(weeks[3].days[0].exercises[0].sets).toBe(Math.max(1, baseSets - 1));
    expect(weeks[3].days[0].exercises[0].reps).toBe('12-14');
  });

  it('week 4 theme contains "Recuperação"', () => {
    const weeks = expandToWeeks(mockTemplate);
    expect(weeks[3].theme).toContain('Recuperação');
  });

  it('all weeks share the same goals from template', () => {
    const weeks = expandToWeeks(mockTemplate);
    weeks.forEach((w) => expect(w.weeklyGoals).toEqual(mockTemplate.goals));
  });

  it('preserves non-numeric reps unchanged', () => {
    const template = {
      ...mockTemplate,
      days: [{ ...mockDays[0], exercises: [{ name: 'Prancha', sets: 3, reps: '30s', rest: '60s' }] }],
    };
    const weeks = expandToWeeks(template);
    // week 3 has repsΔ = -2 but "30s" should not change
    expect(weeks[2].days[0].exercises[0].reps).toBe('30s');
  });
});

// ─── setRuntimeApiKey ──────────────────────────────────────────────────────

describe('setRuntimeApiKey', () => {
  it('throws when no key is set', async () => {
    setRuntimeApiKey(null);
    await expect(generateAnnualPlan(mockProfile)).rejects.toThrow('API Key não configurada');
  });

  it('throws when empty string is set', async () => {
    setRuntimeApiKey('   ');
    await expect(generateAnnualPlan(mockProfile)).rejects.toThrow('API Key não configurada');
  });
});

// ─── generatePlanOverview ──────────────────────────────────────────────────

describe('generatePlanOverview', () => {
  it('returns overview with 12 months and empty weeks', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(groqResponse(JSON.stringify(mockOverviewData)));
    const overview = await generatePlanOverview(mockProfile);
    expect(overview.overallGoal).toBe(mockOverviewData.overallGoal);
    expect(overview.monthlyBlocks).toHaveLength(12);
    overview.monthlyBlocks.forEach((b) => expect(b.weeks).toEqual([]));
    expect(overview.nutritionTips).toEqual(mockOverviewData.nutritionTips);
    expect(overview.recoveryTips).toEqual(mockOverviewData.recoveryTips);
  });

  it('calls onProgress with expected message', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(groqResponse(JSON.stringify(mockOverviewData)));
    const onProgress = jest.fn();
    await generatePlanOverview(mockProfile, onProgress);
    expect(onProgress).toHaveBeenCalledWith('Gerando seu plano personalizado...');
  });

  it('strips weeks even if AI returns them', async () => {
    const withWeeks = {
      ...mockOverviewData,
      months: mockOverviewData.months.map((m) => ({ ...m, weeks: [{ week: 1 }] })),
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce(groqResponse(JSON.stringify(withWeeks)));
    const overview = await generatePlanOverview(mockProfile);
    overview.monthlyBlocks.forEach((b) => expect(b.weeks).toEqual([]));
  });

  it('uses max_tokens 1400 for overview', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(groqResponse(JSON.stringify(mockOverviewData)));
    await generatePlanOverview(mockProfile);
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.max_tokens).toBe(1400);
  });

  it('includes injuries in prompt when present', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(groqResponse(JSON.stringify(mockOverviewData)));
    await generatePlanOverview({ ...mockProfile, injuries: 'dor no joelho' });
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.messages[0].content).toContain('dor no joelho');
  });

  it('falls back to empty arrays for missing tips', async () => {
    const { nutritionTips: _, recoveryTips: __, ...withoutTips } = mockOverviewData;
    (global.fetch as jest.Mock).mockResolvedValueOnce(groqResponse(JSON.stringify(withoutTips)));
    const overview = await generatePlanOverview(mockProfile);
    expect(overview.nutritionTips).toEqual([]);
    expect(overview.recoveryTips).toEqual([]);
  });

  it('accepts monthlyBlocks key as fallback for months', async () => {
    const withOldKey = {
      overallGoal: 'Test goal',
      monthlyBlocks: mockOverviewData.months,
      nutritionTips: [], recoveryTips: [],
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce(groqResponse(JSON.stringify(withOldKey)));
    const overview = await generatePlanOverview(mockProfile);
    expect(overview.monthlyBlocks).toHaveLength(12);
  });

  it('throws when response contains no JSON', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(groqResponse('sem json aqui'));
    await expect(generatePlanOverview(mockProfile)).rejects.toThrow();
  });

  it('throws on API error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(groqError(401, 'Invalid API Key'));
    await expect(generatePlanOverview(mockProfile)).rejects.toThrow('Invalid API Key');
  });
});

// ─── generateMonthDetail ──────────────────────────────────────────────────

describe('generateMonthDetail', () => {
  it('returns exactly 4 weeks from template', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(groqResponse(JSON.stringify(mockTemplate)));
    const weeks = await generateMonthDetail(mockMonthBlock, mockProfile, 'Ganhar massa');
    expect(weeks).toHaveLength(4);
  });

  it('weeks have correct week numbers 1-4', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(groqResponse(JSON.stringify(mockTemplate)));
    const weeks = await generateMonthDetail(mockMonthBlock, mockProfile, 'Ganhar massa');
    weeks.forEach((w, i) => expect(w.week).toBe(i + 1));
  });

  it('applies progressive overload across weeks', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(groqResponse(JSON.stringify(mockTemplate)));
    const weeks = await generateMonthDetail(mockMonthBlock, mockProfile, 'Ganhar massa');
    const w1sets = weeks[0].days[0].exercises[0].sets;
    const w2sets = weeks[1].days[0].exercises[0].sets;
    expect(w2sets).toBe(w1sets + 1); // volume week
  });

  it('uses max_tokens 1800 for month detail', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(groqResponse(JSON.stringify(mockTemplate)));
    await generateMonthDetail(mockMonthBlock, mockProfile, 'Ganhar massa');
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.max_tokens).toBe(1800);
  });

  it('includes month name in prompt', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(groqResponse(JSON.stringify(mockTemplate)));
    await generateMonthDetail(mockMonthBlock, mockProfile, 'Ganhar massa');
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.messages[0].content).toContain('Janeiro');
  });

  it('includes injuries in prompt', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(groqResponse(JSON.stringify(mockTemplate)));
    await generateMonthDetail(mockMonthBlock, { ...mockProfile, injuries: 'joelho' }, 'Ganhar massa');
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.messages[0].content).toContain('joelho');
  });

  it('throws when AI returns no days array', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(groqResponse(JSON.stringify({ theme: 'Test' })));
    await expect(generateMonthDetail(mockMonthBlock, mockProfile, 'Ganhar massa')).rejects.toThrow();
  });

  it('throws when response has no valid JSON', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(groqResponse('sem json'));
    await expect(generateMonthDetail(mockMonthBlock, mockProfile, 'Ganhar massa')).rejects.toThrow();
  });

  it('extracts JSON embedded in surrounding text', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      groqResponse(`Aqui estão os treinos:\n${JSON.stringify(mockTemplate)}\nBom treino!`)
    );
    const weeks = await generateMonthDetail(mockMonthBlock, mockProfile, 'Ganhar massa');
    expect(weeks).toHaveLength(4);
  });

  it('throws on API error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(groqError(429, 'RATE_LIMIT'));
    await expect(generateMonthDetail(mockMonthBlock, mockProfile, 'Ganhar massa')).rejects.toThrow('RATE_LIMIT');
  });
});

// ─── generateAnnualPlan ────────────────────────────────────────────────────

describe('generateAnnualPlan', () => {
  it('returns a valid AnnualPlan with empty weeks', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(groqResponse(JSON.stringify(mockOverviewData)));
    const plan = await generateAnnualPlan(mockProfile);
    expect(plan.userId).toBe('João');
    expect(plan.totalMonths).toBe(12);
    expect(plan.monthlyBlocks).toHaveLength(12);
    expect(plan.overallGoal).toBe(mockOverviewData.overallGoal);
    expect(plan.userProfile).toEqual(mockProfile);
    expect(plan.createdAt).toBeTruthy();
    plan.monthlyBlocks.forEach((b) => expect(b.weeks).toEqual([]));
  });

  it('calls Groq API with correct URL and auth header', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(groqResponse(JSON.stringify(mockOverviewData)));
    await generateAnnualPlan(mockProfile);
    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('groq.com/openai/v1/chat/completions');
    expect(opts.headers.Authorization).toBe('Bearer test-groq-key-123');
  });

  it('uses llama-3.3-70b-versatile model', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(groqResponse(JSON.stringify(mockOverviewData)));
    await generateAnnualPlan(mockProfile);
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.model).toBe('llama-3.3-70b-versatile');
  });

  it('calls onProgress during generation', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(groqResponse(JSON.stringify(mockOverviewData)));
    const onProgress = jest.fn();
    await generateAnnualPlan(mockProfile, onProgress);
    expect(onProgress).toHaveBeenCalledWith('Gerando seu plano personalizado...');
  });

  it('throws on API error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(groqError(401, 'Unauthorized'));
    await expect(generateAnnualPlan(mockProfile)).rejects.toThrow('Unauthorized');
  });

  it('extracts JSON embedded in surrounding text', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      groqResponse(`Aqui está:\n${JSON.stringify(mockOverviewData)}\nBom treino!`)
    );
    const plan = await generateAnnualPlan(mockProfile);
    expect(plan.overallGoal).toBe(mockOverviewData.overallGoal);
  });
});

// ─── chatAboutPlan ─────────────────────────────────────────────────────────

describe('chatAboutPlan', () => {
  it('returns model text response', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(groqResponse('Ótimo progresso!'));
    const reply = await chatAboutPlan('Como estou?', mockAnnualPlan, []);
    expect(reply).toBe('Ótimo progresso!');
  });

  it('includes conversation history', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(groqResponse('ok'));
    const history = [
      { role: 'user' as const, text: 'Pergunta anterior' },
      { role: 'model' as const, text: 'Resposta anterior' },
    ];
    await chatAboutPlan('Nova pergunta', mockAnnualPlan, history);
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.messages.some((m: any) => m.content === 'Pergunta anterior')).toBe(true);
    expect(body.messages.some((m: any) => m.content === 'Nova pergunta')).toBe(true);
  });

  it('maps model role to assistant for Groq format', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(groqResponse('ok'));
    await chatAboutPlan('Oi', mockAnnualPlan, [{ role: 'model', text: 'AI reply' }]);
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    const aiMsg = body.messages.find((m: any) => m.content === 'AI reply');
    expect(aiMsg?.role).toBe('assistant');
  });

  it('includes user profile in system prompt', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(groqResponse('ok'));
    await chatAboutPlan('Oi', mockAnnualPlan, []);
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    const sys = body.messages[0].content;
    expect(sys).toContain('João');
  });

  it('uses max_tokens 512 for chat (compact)', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(groqResponse('ok'));
    await chatAboutPlan('Oi', mockAnnualPlan, []);
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.max_tokens).toBe(512);
  });

  it('returns fallback text when response is empty', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(groqResponse(''));
    const reply = await chatAboutPlan('Oi', mockAnnualPlan, []);
    expect(reply).toContain('Não consegui');
  });

  it('throws on API error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(groqError(429, 'RATE_LIMIT'));
    await expect(chatAboutPlan('Oi', mockAnnualPlan, [])).rejects.toThrow('RATE_LIMIT');
  });

  it('includes injuries in system prompt', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(groqResponse('ok'));
    const plan = { ...mockAnnualPlan, userProfile: { ...mockProfile, injuries: 'joelho' } };
    await chatAboutPlan('Oi', plan, []);
    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.messages[0].content).toContain('joelho');
  });
});
