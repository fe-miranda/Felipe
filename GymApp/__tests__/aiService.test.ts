import {
  generateAnnualPlan,
  chatAboutPlan,
  setRuntimeApiKey,
  GOAL_LABELS,
  LEVEL_LABELS,
} from '../src/services/aiService';
import type { UserProfile, AnnualPlan } from '../src/types';

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

const mockPlanData = {
  overallGoal: 'Ganhar 5kg de músculo em 12 meses',
  monthlyBlocks: Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    monthName: ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][i],
    focus: 'Base',
    description: 'Mês de adaptação',
    weeks: Array.from({ length: 4 }, (_, w) => ({
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
    })),
    progressIndicators: ['Completar todos os treinos'],
  })),
  nutritionTips: ['Comer proteína suficiente'],
  recoveryTips: ['Dormir 8h'],
};

const mockAnnualPlan: AnnualPlan = {
  userId: 'João',
  createdAt: new Date().toISOString(),
  userProfile: mockProfile,
  totalMonths: 12,
  overallGoal: mockPlanData.overallGoal,
  monthlyBlocks: mockPlanData.monthlyBlocks,
  nutritionTips: mockPlanData.nutritionTips,
  recoveryTips: mockPlanData.recoveryTips,
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

// ─── generateAnnualPlan ────────────────────────────────────────────────────

describe('generateAnnualPlan', () => {
  it('returns a valid AnnualPlan on success', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      groqResponse(JSON.stringify(mockPlanData))
    );

    const plan = await generateAnnualPlan(mockProfile);

    expect(plan.userId).toBe('João');
    expect(plan.totalMonths).toBe(12);
    expect(plan.monthlyBlocks).toHaveLength(12);
    expect(plan.overallGoal).toBe(mockPlanData.overallGoal);
    expect(plan.nutritionTips).toEqual(mockPlanData.nutritionTips);
    expect(plan.recoveryTips).toEqual(mockPlanData.recoveryTips);
    expect(plan.userProfile).toEqual(mockProfile);
    expect(plan.createdAt).toBeTruthy();
  });

  it('calls Groq endpoint with correct URL and Authorization header', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      groqResponse(JSON.stringify(mockPlanData))
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
      groqResponse(JSON.stringify(mockPlanData))
    );

    await generateAnnualPlan(mockProfile);

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(body.model).toBe('llama-3.3-70b-versatile');
  });

  it('calls onProgress callback during generation', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      groqResponse(JSON.stringify(mockPlanData))
    );

    const onProgress = jest.fn();
    await generateAnnualPlan(mockProfile, onProgress);

    expect(onProgress).toHaveBeenCalledWith('Gerando seu plano personalizado...');
  });

  it('includes injuries in prompt when present', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      groqResponse(JSON.stringify(mockPlanData))
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
      groqResponse(`Aqui está:\n${JSON.stringify(mockPlanData)}\nBom treino!`)
    );

    const plan = await generateAnnualPlan(mockProfile);
    expect(plan.overallGoal).toBe(mockPlanData.overallGoal);
  });

  it('uses empty arrays as fallback for missing tips', async () => {
    const { nutritionTips: _, recoveryTips: __, ...planWithoutTips } = mockPlanData;
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      groqResponse(JSON.stringify(planWithoutTips))
    );

    const plan = await generateAnnualPlan(mockProfile);
    expect(plan.nutritionTips).toEqual([]);
    expect(plan.recoveryTips).toEqual([]);
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
