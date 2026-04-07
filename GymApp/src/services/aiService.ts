import { UserProfile, AnnualPlan, MonthlyBlock, WeeklyPlan } from '../types';

// Groq API — free tier, no billing required (console.groq.com)
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Runtime key set by SettingsScreen; required — no hardcoded default
let _apiKey: string | null = null;

export function setRuntimeApiKey(key: string | null) {
  _apiKey = key?.trim() || null;
}

function getApiKey(): string {
  if (!_apiKey) {
    throw new Error(
      'API Key não configurada. Toque em ⚙️ nas configurações e adicione sua chave Groq gratuita.'
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

async function groqPost(messages: object[], maxTokens = 4096): Promise<string> {
  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    let errMsg = `Erro ${response.status}`;
    try {
      const err = await response.json();
      errMsg = err.error?.message || errMsg;
    } catch {}
    throw new Error(errMsg);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}

// Phase 1: generate plan overview (structure only, no exercises)
// ~1,500 tokens — well within Groq free tier 12,000 TPM
export async function generatePlanOverview(
  profile: UserProfile,
  onProgress?: (status: string) => void
): Promise<Omit<AnnualPlan, 'userId' | 'createdAt' | 'userProfile' | 'totalMonths'>> {
  const prompt = `Você é um personal trainer especialista. Crie a estrutura de um plano anual de treinos em JSON.

PERFIL:
- Nome: ${profile.name}, Idade: ${profile.age}, Peso: ${profile.weight}kg, Altura: ${profile.height}cm
- Gênero: ${profile.gender}, Nível: ${LEVEL_LABELS[profile.fitnessLevel]}
- Objetivo: ${GOAL_LABELS[profile.goal]}, Dias/semana: ${profile.daysPerWeek}
${profile.injuries ? `- Lesões: ${profile.injuries}` : ''}

Retorne SOMENTE este JSON (sem texto extra):
{
  "overallGoal": "objetivo em 1 frase",
  "monthlyBlocks": [
    {
      "month": 1,
      "monthName": "Janeiro",
      "focus": "Adaptação",
      "description": "descrição curta do mês",
      "progressIndicators": ["meta 1", "meta 2"],
      "weeks": []
    }
  ],
  "nutritionTips": ["dica 1", "dica 2", "dica 3"],
  "recoveryTips": ["dica 1", "dica 2"]
}

Crie exatamente 12 meses. Progressão: meses 1-3 base, 4-6 desenvolvimento, 7-9 intensificação, 10-12 pico.`;

  onProgress?.('Gerando seu plano personalizado...');

  const fullResponse = await groqPost([{ role: 'user', content: prompt }], 2048);

  const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Não foi possível gerar o plano. Tente novamente.');
  }

  const data = JSON.parse(jsonMatch[0]);
  return {
    overallGoal: data.overallGoal,
    monthlyBlocks: (data.monthlyBlocks as MonthlyBlock[]).map((b) => ({ ...b, weeks: [] })),
    nutritionTips: data.nutritionTips ?? [],
    recoveryTips: data.recoveryTips ?? [],
  };
}

// Phase 2: generate workout details for one month on-demand
// ~3,000 tokens — well within Groq free tier 12,000 TPM
export async function generateMonthDetail(
  monthBlock: Pick<MonthlyBlock, 'month' | 'monthName' | 'focus' | 'description'>,
  profile: UserProfile,
  overallGoal: string
): Promise<WeeklyPlan[]> {
  const prompt = `Personal trainer: gere os treinos detalhados do mês ${monthBlock.month} (${monthBlock.monthName}).

Plano anual: ${overallGoal}
Foco do mês: ${monthBlock.focus} — ${monthBlock.description}
Nível: ${LEVEL_LABELS[profile.fitnessLevel]}, Objetivo: ${GOAL_LABELS[profile.goal]}
Dias/semana: ${profile.daysPerWeek}
${profile.injuries ? `Lesões/Limitações: ${profile.injuries}` : ''}

Retorne SOMENTE este JSON:
{
  "weeks": [
    {
      "week": 1,
      "theme": "tema da semana",
      "weeklyGoals": ["meta 1"],
      "days": [
        {
          "dayOfWeek": "Segunda",
          "focus": "Peito e Tríceps",
          "duration": 60,
          "exercises": [
            { "name": "Supino Reto", "sets": 3, "reps": "10-12", "rest": "60s" }
          ]
        }
      ]
    }
  ]
}

Crie exatamente 4 semanas com ${profile.daysPerWeek} dias de treino cada. Adapte ao nível ${LEVEL_LABELS[profile.fitnessLevel]}.`;

  const fullResponse = await groqPost([{ role: 'user', content: prompt }], 3500);

  const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Não foi possível gerar os treinos do mês. Tente novamente.');
  }

  const data = JSON.parse(jsonMatch[0]);
  return data.weeks ?? [];
}

export async function generateAnnualPlan(
  profile: UserProfile,
  onProgress?: (status: string) => void
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

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export async function chatAboutPlan(
  message: string,
  plan: AnnualPlan,
  history: ChatMessage[]
): Promise<string> {
  const systemPrompt = `Você é um personal trainer especialista e assistente do app GymAI.

PERFIL DO USUÁRIO:
- Nome: ${plan.userProfile.name}
- Objetivo: ${GOAL_LABELS[plan.userProfile.goal]}
- Nível: ${LEVEL_LABELS[plan.userProfile.fitnessLevel]}
- Dias por semana: ${plan.userProfile.daysPerWeek}
- Plano: ${plan.overallGoal}
${plan.userProfile.injuries ? `- Lesões: ${plan.userProfile.injuries}` : ''}

Responda em português, de forma clara e motivadora. Você pode sugerir ajustes ao plano, responder dúvidas sobre treinos, nutrição e recuperação.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map((h) => ({
      role: h.role === 'model' ? 'assistant' : 'user',
      content: h.text,
    })),
    { role: 'user', content: message },
  ];

  const reply = await groqPost(messages, 1024);
  return reply || 'Não consegui gerar uma resposta. Tente novamente.';
}
