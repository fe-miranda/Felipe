# 🌍 Mundo das Descobertas

> Jogo educativo para crianças de 3 anos. Interface lúdica com cores vibrantes, sons e animações alegres.

---

## 🎮 Minijogos

| Minijogo | Descrição |
|---|---|
| 🫧 **Estoura Bolhas** | Bolhas coloridas sobem na tela; ao tocar elas estouram e mostram o nome da cor. |
| 🐾 **Som dos Bichos** | Toque nos animais para ouvir o som e ver uma animação divertida. |
| 🔷 **Arrastar Formas** | Arraste círculo, quadrado e triângulo para encaixar nas suas sombras. |

---

## 🚀 Como Rodar Localmente

### Pré-requisitos
- **Node.js** ≥ 18
- **Expo CLI**: `npm install -g expo-cli`
- App **Expo Go** no celular ([Android](https://play.google.com/store/apps/details?id=host.exp.exponent) / [iOS](https://apps.apple.com/app/expo-go/id982107779))

### Passos
```bash
# 1. Clone o repositório
git clone https://github.com/fe-miranda/felipe.git
cd felipe/MundoDescobertas

# 2. Instale as dependências
npm install

# 3. Inicie o servidor de desenvolvimento
npm start
# ou
npx expo start
```

Escaneie o **QR Code** com o app Expo Go para rodar no celular.

---

## 📱 Gerar APK via EAS (Expo Application Services)

### 1. Instale o EAS CLI
```bash
npm install -g eas-cli
```

### 2. Faça login na sua conta Expo
```bash
eas login
```

### 3. Configure o projeto (primeira vez)
```bash
eas build:configure
```
> Isso vai preencher o `projectId` no `app.json` automaticamente.

### 4. Gere a APK (perfil "preview")
```bash
npx eas build -p android --profile preview
```

Ao finalizar, o EAS vai fornecer um **link para download direto** da APK.  
Instale no Android ativando *"Fontes desconhecidas"* nas configurações.

### Perfis disponíveis (`eas.json`)
| Perfil | Tipo | Uso |
|---|---|---|
| `development` | APK debug | Para testar com Expo Dev Client |
| `preview` | APK release | Para compartilhar com familiares |
| `production` | AAB | Para publicar na Play Store |

---

## 🗂️ Estrutura do Projeto

```
MundoDescobertas/
├── App.js                        # Entry point
├── app.json                      # Configuração Expo
├── eas.json                      # Configuração EAS Build
├── package.json
├── babel.config.js
├── assets/                       # Ícones, splash, sons (adicionar .mp3 aqui)
│   └── sounds/                   # cat.mp3, dog.mp3, etc. (não incluídos)
├── src/
│   ├── constants/
│   │   ├── colors.js             # Paleta de cores e dados de bolhas
│   │   └── gameData.js           # Dados dos animais e formas
│   ├── utils/
│   │   └── gameHelpers.js        # Funções puras (testáveis)
│   ├── navigation/
│   │   └── AppNavigator.jsx      # Stack navigator
│   ├── screens/
│   │   ├── HomeScreen.jsx        # Menu principal
│   │   ├── BubblePopScreen.jsx   # Minijogo: Estoura Bolhas ⭐
│   │   ├── AnimalSoundsScreen.jsx# Minijogo: Som dos Bichos
│   │   └── ShapesScreen.jsx      # Minijogo: Arrastar Formas
│   └── components/
│       ├── AnimatedBubble.jsx    # Bolha individual com animação
│       ├── AnimalCard.jsx        # Card de animal com efeito de toque
│       ├── ConfettiEffect.jsx    # Chuva de confetes
│       └── StarBurst.jsx         # Overlay de "Parabéns!"
└── __tests__/
    └── gameHelpers.test.js       # 30+ testes unitários
```

---

## 🔊 Adicionando Sons dos Animais

1. Coloque arquivos `.mp3` em `assets/sounds/` (ex: `cat.mp3`, `dog.mp3`).
2. Abra `src/constants/gameData.js`.
3. Substitua `sound: null` pelo `require`:

```js
// Antes
{ id: 'cat', sound: null, ... }

// Depois
{ id: 'cat', sound: require('../../assets/sounds/cat.mp3'), ... }
```

Sons gratuitos disponíveis em: [freesound.org](https://freesound.org) e [mixkit.co](https://mixkit.co/free-sound-effects/animals/).

---

## 🧪 Testes Unitários

```bash
# Rodar todos os testes
npm test

# Modo watch
npm run test:watch
```

Cobertura: funções em `gameHelpers.js` (30+ asserções).

---

## 🛠️ Stack Técnica

| Tecnologia | Versão | Uso |
|---|---|---|
| Expo SDK | ~52.0 | Framework base |
| React Native | 0.76 | UI nativa |
| expo-av | ~15.0 | Reprodução de áudio |
| expo-haptics | ~13.0 | Feedback tátil |
| expo-linear-gradient | ~14.0 | Gradientes vibrantes |
| react-navigation | ^6 | Navegação entre telas |
| PanResponder (RN) | built-in | Drag & drop de formas |
| Animated API (RN) | built-in | Todas as animações |

---

## 🎨 Decisões de Design (UX Infantil)

- **Botões grandes** (mínimo 80 × 80 px) — fáceis de tocar por dedos pequenos.
- **Sem textos complexos** — emoji + palavra simples.
- **Sem dead-ends** — o botão 🏠 está sempre visível em todos os minijogos.
- **Feedback imediato** — animação + haptic em cada interação.
- **Cores vibrantes** — paleta de alto contraste escolhida para engajamento visual.
- **Modo retrato forçado** — orienta o dispositivo para uso mais natural por crianças.

---

## 📄 Licença

MIT © 2025 — Feito com ❤️ para aprendizado lúdico.
