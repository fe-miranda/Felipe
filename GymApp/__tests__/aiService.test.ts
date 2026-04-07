import {
  generateAnnualPlan,
  generatePlanOverview,
  generateMonthDetail,
  chatAboutPlan,
  setRuntimeApiKey,
  GOAL_LABELS,
  LEVEL_LABELS,
} from '../src/services/aiService';
import type { UserProfile, AnnualPlan, MonthlyBlock } from '../src/types';

// ─── Helpers ───────────────────────────────────────────────────────────────

const mockProfile: UserProfile = {
  name: 'João',
  age: 28,
  weight: 80,
  height: 178,
  gender: 'male',
  goal: 'gain_muscle',
  fitnessLevel: 'intermediate',
  daysPerWeek: 4,
};

const mockMonthBlock: Pick<MonthlyBlock, 'month' | 'monthName' | 'focus' | 'description'> = {
  month: 1,
  monthName: 'Janeiro',
  focus: 'Adaptação',
  description: 'Mês de adaptação ao treino',
};

const mockWeeks = Array.from({ length: 4 }, (_, w) => ({
  week: w + 1,
  theme: 'Semana de treino',
  weeklyGoals: ['Manter consistência'],
  days: [
    {
      dayOfWeek: 'Segunda',
      focus: 'Peito',
      duration: 60,
      exercises: [{ name: 'Supino', sets: 3, reps: '10-12', rest: '60s' }],
    },
  ],
}));

const mockOverviewData = {
  overallGoal: 'Ganhar 5kg de músculo em 12 meses',
  monthlyBlocks: Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    monthName: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][i],
    focus: 'Base',
    description: 'Mês de adaptação',
    progressIndicators: ['Completar todos os treinos'],
    weeks: [],
  })),
  nutritionTips: ['Comer proteína suficiente'],
  recoveryTips: ['Dormir 8h'],
};

const mockAnnualPlan: AnnualPlan = {
  userId: 'João',
  createdAt: new Date().toISOString(),
  userProfile: mockProfile,
  totalMonths: 12,
  overallGoal: mockOverviewData.overallGoal,
  monthlyBlocks: mockOverviewData.monthlyBlocks,
  nutritionTips: mockOverviewData.nutritionTips,
  recoveryTips: mockOverviewData.recoveryTips,
};

// Groq returns OpenAI-compatible format
function groqResponse(content: string) {
  return {
    ok: true,
    json: () => Promise.resolve({
      choices: [{ message: { content } }],
    }),
  };
}

function groqError(status: number, message: string) {
  return {
    ok: false,
    status,
    json: () => Promise.resolve({ error: { message } }),
  };
}

// ─── Setup ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  global.fetch = jest.fn();
  setRuntimeApiKey('test-groq-key-123'); // set valid key for all tests
});

afterEach(() => {
  jest.clearAllMocks();
  setRuntimeApiKey(null);
});

// ─── GOAL_LABELS / LEVEL_LABELS ────────────────────────────────────────────

describe('GOAL_LABELS', () => {
  it('has entries for all goal types', () => {
    expect(GOAL_LABELS['lose_weight']).toBe('Perda de Peso');
    expect(GOAL_LABELS['gain_muscle']).toBe('Ganho de Massa Muscular');
    expect(GOAL_LABELS['improve_endurance']).toBe('Melhora de Resistência');
    expect(GOAL_LABELS['general_fitness']).toBe('Condicionamento Geral');
    expect(GOAL_LABELS['increase_strength']).toBe('Aumento de Força');
  });
});

describe('LEVEL_LABELS', () => {
  it('has entries for all fitness levels', () => {
    expect(LEVEL_LABELS['beginner']).toBe('Iniciante');
    expect(LEVEL_LABELS['intermediate']).toBe('Intermediário');
    expect(LEVEL_LABELS['advanced']).toBe('Avançado');
  });
});

// ─── setRuntimeApiKey ──────────────────────────────────────────────────────

describe('setRuntimeApiKey', () => {
  it('throws when no key is set', async () => {
    setRuntimeApiKey(null);
    await expect(generateAnnualPlan(mockProfile)).rejects.toThrow(
      'API Key não configurada'
    );
  });

  it('throws when empty string is set', async () => {
    setRuntimeApiKey('');
    await expect(generateAnnualPlan(mockProfile)).rejects.toThrow(
      'API Key não configurada'
    );
  });
});

// ─── generatePlanOverview ──────────────────────────────────────────────────

describe('generatePlanOverview', () => {
  it('returns overview with 12 empty-weeks months', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      groqResponse(JSON.stringify(mockOverviewData))
    );

    const overview = await generatePlanOverview(mockProfile);

    expect(overview.overallGoal).toBe(mockOverviewData.overallGoal);
    expect(overview.monthlyBlocks).toHaveLength(12);
    expect(overview.monthlyBlocks[0].weeks).toEqual([]);
    expect(overview.nutritionTips).toEqual(mockOverviewData.nutritionTips);
    expect(overview.recoveryTips).toEqual(mockOverviewData.recoveryTips);
  });

  it('calls onProgress callback', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      groqResponse(JSON.stringify(mockOverviewData))
    );

    const onProgress = jest.fn();
    await generatePlanOverview(mockProfile, onProgress);

    expect(onProgress).toHaveBeenCalledWith('Gerando seu plano personalizado...');
  });

  it('forces weeks to empty array even if AI returns weeks', async () => {
    const dataWithWeeks = {
      ...mockOverviewData,
      monthlyBlocks: mockOverviewData.monthlyBlocks.map((b) => ({ ...b, weeks: mockWeeks })),
    };
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      groqResponse(JSON.stringify(dataWithWeeks))
    );

    const overview = await generatePlanOverview(mockProfile);
    // overview should strip weeks
    overview.monthlyBlocks.forEach((b) => expect(b.weeks).toEqual([]));
  });

  it('uses empty arrays as fallback for missing tips', async () => {
    const { nutritionTips: _, recoveryTips: __, ...overviewWithoutTips } = mockOverviewData;
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      groqResponse(JSON.stringify(overviewWithoutTips))
    );

    const overview = await generatePlanOverview(mockProfile);
    expect(overview.nutritionTips).toEqual([]);
    expect(overview.recoveryTips).toEqual([]);
  });

  it('throws when response has no valid JSON block', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(groqResponse('sem json aqui'));

    await expect(generatePlanOverview(mockProfile)).rejects.toThrow(
      'Não foi possível gerar o plano'
    );
  });

  it('includes injuries in prompt when present', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      groqResponse(JSON.stringify(mockOverviewData))
    );

    await generatePlanOverview({ ...mockProfile, injuries: 'dor no joelho' });

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    const prompt = body.messages[0].content;
    expect(prompt).toContain('dor no joelho');
  });

  it('uses max_tokens 2048 for overview request', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      groqResponse(JSON.stringify(mockOverviewData))
    );

    await generatePlanOverview(mockProfile);

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.max_tokens).toBe(2048);
  });
});

// ─── generateMonthDetail ──────────────────────────────────────────────────

describe('generateMonthDetail', () => {
  it('returns 4 weeks of workout data', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      groqResponse(JSON.stringify({ weeks: mockWeeks }))
    );

    const weeks = await generateMonthDetail(mockMonthBlock, mockProfile, 'Ganhar massa muscular');

    expect(weeks).toHaveLength(4);
    expect(weeks[0].week).toBe(1);
    expect(weeks[0].days).toBeDefined();
  });

  it('includes month name and focus in prompt', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      groqResponse(JSON.stringify({ weeks: mockWeeks }))
    );

    await generateMonthDetail(mockMonthBlock, mockProfile, 'Ganhar massa muscular');

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    const prompt = body.messages[0].content;
    expect(prompt).toContain('Janeiro');
    expect(prompt).toContain('Adaptação');
  });

  it('includes injuries in prompt when present', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      groqResponse(JSON.stringify({ weeks: mockWeeks }))
    );

    await generateMonthDetail(mockMonthBlock, { ...mockProfile, injuries: 'joelho' }, 'Ganhar massa');

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.messages[0].content).toContain('joelho');
  });

  it('uses max_tokens 3500 for month detail request', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      groqResponse(JSON.stringify({ weeks: mockWeeks }))
    );

    await generateMonthDetail(mockMonthBlock, mockProfile, 'Ganhar massa muscular');

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.max_tokens).toBe(3500);
  });

  it('throws when response has no valid JSON', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(groqResponse('sem json'));

    await expect(
      generateMonthDetail(mockMonthBlock, mockProfile, 'Ganhar massa')
    ).rejects.toThrow('Não foi possível gerar os treinos do mês');
  });

  it('returns empty array when weeks key is missing', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      groqResponse(JSON.stringify({}))
    );

    const weeks = await generateMonthDetail(mockMonthBlock, mockProfile, 'Ganhar massa');
    expect(weeks).toEqual([]);
  });

  it('throws on API error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(groqError(429, 'RATE_LIMIT'));

    await expect(
      generateMonthDetail(mockMonthBlock, mockProfile, 'Ganhar massa')
    ).rejects.toThrow('RATE_LIMIT');
  });

  it('extracts JSON embedded in surrounding text', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      groqResponse(`Aqui estão os treinos:\n${JSON.stringify({ weeks: mockWeeks })}\nBom treino!`)
    );

    const weeks = await generateMonthDetail(mockMonthBlock, mockProfile, 'Ganhar massa');
    expect(weeks).toHaveLength(4);
  });
});

// ─── generateAnnualPlan ────────────────────────────────────────────────────

describe('generateAnnualPlan', () => {
  it('returns a valid AnnualPlan with empty weeks on success', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      groqResponse(JSON.stringify(mockOverviewData))
    );

    const plan = await generateAnnualPlan(mockProfile);

    expect(plan.userId).toBe('João');
    expect(plan.totalMonths).toBe(12);
    expect(plan.monthlyBlocks).toHaveLength(12);
    expect(plan.overallGoal).toBe(mockOverviewData.overallGoal);
    expect(plan.nutritionTips).toEqual(mockOverviewData.nutritionTips);
    expect(plan.recoveryTips).toEqual(mockOverviewData.recoveryTips);
    expect(plan.userProfile).toEqual(mockProfile);
    expect(plan.createdAt).toBeTruthy();
    // Weeks are empty — generated on-demand
    plan.monthlyBlocks.forEach((b) => expect(b.weeks).toEqual([]));
  });

  it('calls Groq endpoint with correct URL and Authorization header', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      groqResponse(JSON.stringify(mockOverviewData))
    );

    await generateAnnualPlan(mockProfile);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('groq.com');
    expect(url).toContain('chat/completions');
    expect(options.headers.Authorization).toBe('Bearer test-groq-key-123');
  });

  it('uses llama-3.3-70b model', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      groqResponse(JSON.stringify(mockOverviewData))
    );

    await generateAnnualPlan(mockProfile);

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.model).toBe('llama-3.3-70b-versatile');
  });

  it('calls onProgress callback during generation', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      groqResponse(JSON.stringify(mockOverviewData))
    );

    const onProgress = jest.fn();
    await generateAnnualPlan(mockProfile, onProgress);

    expect(onProgress).toHaveBeenCalledWith('Gerando seu plano personalizado...');
  });

  it('includes injuries in prompt when present', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      groqResponse(JSON.stringify(mockOverviewData))
    );

    await generateAnnualPlan({ ...mockProfile, injuries: 'dor no joelho' });

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    const prompt = body.messages[0].content;
    expect(prompt).toContain('dor no joelho');
  });

  it('throws when Groq returns an error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      groqError(401, 'Invalid API Key')
    );

    await expect(generateAnnualPlan(mockProfile)).rejects.toThrow('Invalid API Key');
  });

  it('throws when response has no valid JSON block', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      groqResponse('sem json aqui')
    );

    await expect(generateAnnualPlan(mockProfile)).rejects.toThrow(
      'Não foi possível gerar o plano'
    );
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
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      groqResponse('Ótimo progresso!')
    );

    const reply = await chatAboutPlan('Como estou?', mockAnnualPlan, []);
    expect(reply).toBe('Ótimo progresso!');
  });

  it('includes conversation history as OpenAI messages', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(groqResponse('Resposta'));

    const history = [
      { role: 'user' as const, text: 'Pergunta anterior' },
      { role: 'model' as const, text: 'Resposta anterior' },
    ];

    await chatAboutPlan('Nova pergunta', mockAnnualPlan, history);

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    const msgs = body.messages;
    expect(msgs[0].role).toBe('system'); // system prompt first
    expect(msgs.some((m: any) => m.content === 'Pergunta anterior')).toBe(true);
    expect(msgs.some((m: any) => m.content === 'Nova pergunta')).toBe(true);
  });

  it('maps model role to assistant for OpenAI format', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(groqResponse('ok'));

    const history = [{ role: 'model' as const, text: 'AI reply' }];
    await chatAboutPlan('Oi', mockAnnualPlan, history);

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    const aiMsg = body.messages.find((m: any) => m.content === 'AI reply');
    expect(aiMsg?.role).toBe('assistant');
  });

  it('includes user profile info in system prompt', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(groqResponse('ok'));

    await chatAboutPlan('Oi', mockAnnualPlan, []);

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    const systemText = body.messages[0].content;
    expect(systemText).toContain('João');
    expect(systemText).toContain('Ganho de Massa Muscular');
    expect(systemText).toContain('Intermediário');
  });

  it('returns fallback text when response is empty', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      groqResponse('')
    );

    const reply = await chatAboutPlan('Oi', mockAnnualPlan, []);
    expect(reply).toContain('Não consegui gerar');
  });

  it('throws on API error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(groqError(429, 'RATE_LIMIT'));

    await expect(chatAboutPlan('Oi', mockAnnualPlan, [])).rejects.toThrow('RATE_LIMIT');
  });

  it('includes injuries in system prompt when present', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(groqResponse('ok'));

    const plan = { ...mockAnnualPlan, userProfile: { ...mockProfile, injuries: 'joelho' } };
    await chatAboutPlan('Oi', plan, []);

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.messages[0].content).toContain('joelho');
  });
});
