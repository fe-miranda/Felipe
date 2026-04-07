import { GEMINI_API_KEY } from '../constants/config';
import { UserProfile, AnnualPlan } from '../types';

const GEMINI_MODEL = 'gemini-2.0-flash';
const BASE_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}`;

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

async function geminiPost(endpoint: string, body: object): Promise<any> {
  const response = await fetch(`${BASE_URL}:${endpoint}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let errMsg = `Erro ${response.status}`;
    try {
      const err = await response.json();
      errMsg = err.error?.message || errMsg;
    } catch {}
    throw new Error(errMsg);
  }

  return response.json();
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

Retorne APENAS um JSON válido com a seguinte estrutura exata (sem texto extra, sem markdown):
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
- Para ${profile.daysPerWeek} dias/semana, distribua os grupos musculares adequadamente`;

  onProgress?.('Gerando seu plano personalizado...');

  const data = await geminiPost('generateContent', {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 1.0, maxOutputTokens: 65536 },
  });

  const fullResponse: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

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
  const systemContext = `Você é um personal trainer especialista e assistente do app GymAI.

PERFIL DO USUÁRIO:
- Nome: ${plan.userProfile.name}
- Objetivo: ${GOAL_LABELS[plan.userProfile.goal]}
- Nível: ${LEVEL_LABELS[plan.userProfile.fitnessLevel]}
- Dias por semana: ${plan.userProfile.daysPerWeek}
- Plano: ${plan.overallGoal}
${plan.userProfile.injuries ? `- Lesões: ${plan.userProfile.injuries}` : ''}

Responda em português, de forma clara e motivadora. Você pode sugerir ajustes ao plano, responder dúvidas sobre treinos, nutrição e recuperação.`;

  const contents = [
    { role: 'user', parts: [{ text: systemContext }] },
    { role: 'model', parts: [{ text: 'Entendido! Estou pronto para ajudar com seu treino.' }] },
    ...history.map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
    { role: 'user', parts: [{ text: message }] },
  ];

  const data = await geminiPost('generateContent', {
    contents,
    generationConfig: { temperature: 0.9, maxOutputTokens: 2048 },
  });

  return (
    data.candidates?.[0]?.content?.parts?.[0]?.text ??
    'Não consegui gerar uma resposta. Tente novamente.'
  );
}
