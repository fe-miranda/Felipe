# GymAI - Plano de Treino Anual com IA

App React Native + Expo que usa Claude (Anthropic) para gerar um plano de treino anual personalizado.

## Funcionalidades

- Coleta dados do usuário (idade, peso, altura, objetivo, nível)
- Gera plano de treino anual completo (12 meses) via Claude Opus
- Exibe plano organizado por mês, semana e dia
- Detalha cada exercício com séries, reps, descanso e dicas
- Salva plano localmente (AsyncStorage)

## Requisitos

- Node.js 18+
- Expo CLI
- Conta Anthropic com API Key

## Instalação

```bash
cd GymApp
npm install
npx expo start
```

## Gerar APK para Android

### Via EAS Build (Expo Application Services)

```bash
# Instalar EAS CLI
npm install -g eas-cli

# Login na conta Expo
eas login

# Build APK (modo preview)
eas build --platform android --profile preview

# O APK será gerado e disponibilizado para download
```

### Via expo run:android (desenvolvimento local)

```bash
# Necessário Android SDK instalado
npx expo run:android
```

## Como usar

1. Abra o app
2. Insira sua **API Key da Anthropic** (obtenha em console.anthropic.com)
3. Preencha seus dados pessoais
4. Escolha seu objetivo e nível
5. Toque em **Gerar Plano Anual**
6. Aguarde ~2-3 minutos enquanto a IA cria seu plano personalizado
7. Navegue pelo plano mês a mês, semana a semana e treino a treino

## Tecnologias

- React Native + Expo
- TypeScript
- Claude API (claude-opus-4-6 com adaptive thinking)
- React Navigation
- AsyncStorage
