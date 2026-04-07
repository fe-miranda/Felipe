import { UserProfile, AnnualPlan } from '../types';

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

async function groqPost(messages: object[]): Promise<string> {
  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      max_tokens: 32768,
      temperature: 1.0,
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

export async function generateAnnualPlan(
  profile: UserProfile,
  onProgress?: (status: string) => void
): Promise<AnnualPlan> {
  const prompt = `Você é um personal trainer especialista. Crie um plano de treino anual completo e personalizado em formato JSON estrito.

PERFIL DO USUÁRIO:
- Nome: ${profile.name}
- Idade: ${profile.age} anos
- Peso: ${profile.weight} kg
- Altura: ${profile.height} cm
- Gênero: ${profile.gender}
- Nível: ${LEVEL_LABELS[profile.fitnessLevel]}
- Objetivo: ${GOAL_LABELS[profile.goal]}
- Dias por semana disponíveis: ${profile.daysPerWeek}
${profile.injuries ? `- Lesões/Limitações: ${profile.injuries}` : ''}

Retorne APENAS um JSON válido com a seguinte estrutura exata (sem texto extra, sem markdown, sem \`\`\`):
{
  "overallGoal": "descrição do objetivo geral em 1 frase",
  "monthlyBlocks": [
    {
      "month": 1,
      "monthName": "Janeiro",
      "focus": "Adaptação/Base",
      "description": "Descrição do foco do mês",
      "weeks": [
        {
          "week": 1,
          "theme": "Semana de Adaptação",
          "weeklyGoals": ["meta 1", "meta 2"],
          "days": [
            {
              "dayOfWeek": "Segunda",
              "focus": "Peito e Tríceps",
              "duration": 60,
              "exercises": [
                {
                  "name": "Supino Reto",
                  "sets": 3,
                  "reps": "10-12",
                  "rest": "60s",
                  "notes": "Dica opcional"
                }
              ],
              "notes": "Observação do dia"
            }
          ]
        }
      ],
      "progressIndicators": ["indicador 1", "indicador 2"]
    }
  ],
  "nutritionTips": ["dica 1", "dica 2", "dica 3"],
  "recoveryTips": ["dica 1", "dica 2", "dica 3"]
}

REGRAS IMPORTANTES:
- Crie exatamente 12 meses de treino
- Cada mês tem 4 semanas
- Cada semana tem apenas ${profile.daysPerWeek} dias de treino (não mais)
- Progrida gradualmente: meses 1-3 base, 4-6 desenvolvimento, 7-9 intensificação, 10-12 pico/manutenção
- Adapte todos os exercícios ao nível ${LEVEL_LABELS[profile.fitnessLevel]}
- Foque no objetivo: ${GOAL_LABELS[profile.goal]}
- Inclua descanso adequado entre grupos musculares
- Retorne SOMENTE o JSON, sem nenhum texto antes ou depois`;

  onProgress?.('Gerando seu plano personalizado...');

  const fullResponse = await groqPost([
    { role: 'user', content: prompt },
  ]);

  const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Não foi possível gerar o plano. Tente novamente.');
  }

  const planData = JSON.parse(jsonMatch[0]);

  return {
    userId: profile.name,
    createdAt: new Date().toISOString(),
    userProfile: profile,
    totalMonths: 12,
    overallGoal: planData.overallGoal,
    monthlyBlocks: planData.monthlyBlocks,
    nutritionTips: planData.nutritionTips ?? [],
    recoveryTips: planData.recoveryTips ?? [],
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

  const reply = await groqPost(messages);
  return reply || 'Não consegui gerar uma resposta. Tente novamente.';
}
