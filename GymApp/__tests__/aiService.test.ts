import { generateAnnualPlan, chatAboutPlan, GOAL_LABELS, LEVEL_LABELS } from '../src/services/aiService';
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

function mockFetchSuccess(body: object) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(body),
  });
}

function mockFetchError(status: number, message: string) {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: false,
    status,
    json: () => Promise.resolve({ error: { message } }),
  });
}

// ─── Setup ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.clearAllMocks();
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

// ─── generateAnnualPlan ────────────────────────────────────────────────────

describe('generateAnnualPlan', () => {
  it('returns a valid AnnualPlan on success', async () => {
    mockFetchSuccess({
      candidates: [{ content: { parts: [{ text: JSON.stringify(mockPlanData) }] } }],
    });

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

  it('calls fetch with correct Gemini endpoint', async () => {
    mockFetchSuccess({
      candidates: [{ content: { parts: [{ text: JSON.stringify(mockPlanData) }] } }],
    });

    await generateAnnualPlan(mockProfile);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const url = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain('gemini-2.0-flash');
    expect(url).toContain('generateContent');
  });

  it('calls onProgress callback during generation', async () => {
    const responseText = JSON.stringify(mockPlanData);
    mockFetchSuccess({
      candidates: [{ content: { parts: [{ text: responseText }] } }],
    });

    const onProgress = jest.fn();
    await generateAnnualPlan(mockProfile, onProgress);

    expect(onProgress).toHaveBeenCalledWith('Gerando seu plano personalizado...');
  });

  it('handles profile with injuries', async () => {
    const profileWithInjuries = { ...mockProfile, injuries: 'dor no joelho' };
    mockFetchSuccess({
      candidates: [{ content: { parts: [{ text: JSON.stringify(mockPlanData) }] } }],
    });

    const plan = await generateAnnualPlan(profileWithInjuries);
    expect(plan).toBeDefined();

    const requestBody = JSON.parse(
      (global.fetch as jest.Mock).mock.calls[0][1].body
    );
    const prompt = requestBody.contents[0].parts[0].text;
    expect(prompt).toContain('dor no joelho');
  });

  it('throws when response is not ok', async () => {
    mockFetchError(403, 'API_KEY_INVALID');

    await expect(generateAnnualPlan(mockProfile)).rejects.toThrow('API_KEY_INVALID');
  });

  it('throws when response JSON has no valid JSON block', async () => {
    mockFetchSuccess({
      candidates: [{ content: { parts: [{ text: 'sem json aqui' }] } }],
    });

    await expect(generateAnnualPlan(mockProfile)).rejects.toThrow(
      'Não foi possível gerar o plano'
    );
  });

  it('extracts JSON embedded in surrounding text', async () => {
    mockFetchSuccess({
      candidates: [
        {
          content: {
            parts: [{ text: `Aqui está o plano:\n${JSON.stringify(mockPlanData)}\nEspero que goste!` }],
          },
        },
      ],
    });

    const plan = await generateAnnualPlan(mockProfile);
    expect(plan.overallGoal).toBe(mockPlanData.overallGoal);
  });

  it('uses empty arrays as fallback for missing tips', async () => {
    const planWithoutTips = { ...mockPlanData, nutritionTips: undefined, recoveryTips: undefined };
    mockFetchSuccess({
      candidates: [{ content: { parts: [{ text: JSON.stringify(planWithoutTips) }] } }],
    });

    const plan = await generateAnnualPlan(mockProfile);
    expect(plan.nutritionTips).toEqual([]);
    expect(plan.recoveryTips).toEqual([]);
  });
});

// ─── chatAboutPlan ─────────────────────────────────────────────────────────

describe('chatAboutPlan', () => {
  it('returns model text response', async () => {
    mockFetchSuccess({
      candidates: [{ content: { parts: [{ text: 'Ótimo progresso!' }] } }],
    });

    const reply = await chatAboutPlan('Como estou?', mockAnnualPlan, []);
    expect(reply).toBe('Ótimo progresso!');
  });

  it('includes conversation history in request', async () => {
    mockFetchSuccess({
      candidates: [{ content: { parts: [{ text: 'Resposta' }] } }],
    });

    const history = [
      { role: 'user' as const, text: 'Pergunta anterior' },
      { role: 'model' as const, text: 'Resposta anterior' },
    ];

    await chatAboutPlan('Nova pergunta', mockAnnualPlan, history);

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    const contents = body.contents;
    // Should have system context + bootstrap + history + new message
    expect(contents.length).toBeGreaterThanOrEqual(4);
    expect(contents.some((c: any) => c.parts[0].text === 'Pergunta anterior')).toBe(true);
    expect(contents.some((c: any) => c.parts[0].text === 'Nova pergunta')).toBe(true);
  });

  it('includes user profile info in system context', async () => {
    mockFetchSuccess({
      candidates: [{ content: { parts: [{ text: 'ok' }] } }],
    });

    await chatAboutPlan('Oi', mockAnnualPlan, []);

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    const systemText = body.contents[0].parts[0].text;
    expect(systemText).toContain('João');
    expect(systemText).toContain('Ganho de Massa Muscular');
    expect(systemText).toContain('Intermediário');
  });

  it('returns fallback text when response has no text', async () => {
    mockFetchSuccess({ candidates: [{ content: { parts: [{}] } }] });

    const reply = await chatAboutPlan('Oi', mockAnnualPlan, []);
    expect(reply).toContain('Não consegui gerar uma resposta');
  });

  it('throws on API error', async () => {
    mockFetchError(429, 'RATE_LIMIT_EXCEEDED');

    await expect(chatAboutPlan('Oi', mockAnnualPlan, [])).rejects.toThrow(
      'RATE_LIMIT_EXCEEDED'
    );
  });

  it('includes injuries in system context when present', async () => {
    mockFetchSuccess({
      candidates: [{ content: { parts: [{ text: 'ok' }] } }],
    });

    const planWithInjuries = {
      ...mockAnnualPlan,
      userProfile: { ...mockProfile, injuries: 'joelho direito' },
    };

    await chatAboutPlan('Oi', planWithInjuries, []);

    const body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    const systemText = body.contents[0].parts[0].text;
    expect(systemText).toContain('joelho direito');
  });
});
