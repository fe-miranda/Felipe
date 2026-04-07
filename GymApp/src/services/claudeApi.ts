import Anthropic from '@anthropic-ai/sdk';
import { UserProfile, AnnualPlan } from '../types';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
  dangerouslyAllowBrowser: true,
});

const GOAL_LABELS: Record<string, string> = {
  lose_weight: 'Perda de Peso',
  gain_muscle: 'Ganho de Massa Muscular',
  improve_endurance: 'Melhora de Resistência',
  general_fitness: 'Condicionamento Geral',
  increase_strength: 'Aumento de Força',
};

const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Iniciante',
  intermediate: 'Intermediário',
  advanced: 'Avançado',
};

export async function generateAnnualPlan(
  profile: UserProfile,
  onProgress?: (chunk: string) => void
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

  let fullResponse = '';

  const stream = client.messages.stream({
    model: 'claude-opus-4-6',
    max_tokens: 64000,
    thinking: { type: 'adaptive' },
    messages: [{ role: 'user', content: prompt }],
  });

  for await (const event of stream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      fullResponse += event.delta.text;
      onProgress?.(event.delta.text);
    }
  }

  // Parse JSON from response
  const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Não foi possível gerar o plano. Tente novamente.');
  }

  const planData = JSON.parse(jsonMatch[0]);

  const annualPlan: AnnualPlan = {
    userId: profile.name,
    createdAt: new Date().toISOString(),
    userProfile: profile,
    totalMonths: 12,
    overallGoal: planData.overallGoal,
    monthlyBlocks: planData.monthlyBlocks,
    nutritionTips: planData.nutritionTips || [],
    recoveryTips: planData.recoveryTips || [],
  };

  return annualPlan;
}
