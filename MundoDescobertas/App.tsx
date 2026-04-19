import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

type Screen = 'home' | 'colors' | 'animals' | 'shapes';
type NonEmptyArray<T> = [T, ...T[]];

type Option = {
  id: string;
  label: string;
  emoji: string;
  extra?: string;
  color?: string;
};

const COLORS: NonEmptyArray<Option> = [
  { id: 'red', label: 'Vermelho', emoji: '🔴', color: '#ef4444' },
  { id: 'blue', label: 'Azul', emoji: '🔵', color: '#3b82f6' },
  { id: 'green', label: 'Verde', emoji: '🟢', color: '#22c55e' },
  { id: 'yellow', label: 'Amarelo', emoji: '🟡', color: '#facc15' },
  { id: 'purple', label: 'Roxo', emoji: '🟣', color: '#a855f7' },
  { id: 'orange', label: 'Laranja', emoji: '🟠', color: '#fb923c' },
];

const ANIMALS: NonEmptyArray<Option> = [
  { id: 'dog', label: 'Cachorro', emoji: '🐶', extra: 'Au au!' },
  { id: 'cat', label: 'Gato', emoji: '🐱', extra: 'Miau!' },
  { id: 'cow', label: 'Vaca', emoji: '🐮', extra: 'Muuu!' },
  { id: 'duck', label: 'Pato', emoji: '🦆', extra: 'Quá quá!' },
];

const SHAPES: NonEmptyArray<Option> = [
  { id: 'circle', label: 'Círculo', emoji: '⚪' },
  { id: 'square', label: 'Quadrado', emoji: '🟦' },
  { id: 'triangle', label: 'Triângulo', emoji: '🔺' },
  { id: 'star', label: 'Estrela', emoji: '⭐' },
];

const pickRandomItem = <T,>(list: NonEmptyArray<T>): T => list[Math.floor(Math.random() * list.length)];

const shuffleList = <T,>(list: readonly T[]): T[] => {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[randomIndex]] = [copy[randomIndex], copy[i]];
  }
  return copy;
};

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');

  const [colorTarget, setColorTarget] = useState<Option>(pickRandomItem(COLORS));
  const [colorScore, setColorScore] = useState(0);
  const [colorFeedback, setColorFeedback] = useState('Toque na cor pedida.');

  const [animalTarget, setAnimalTarget] = useState<Option>(pickRandomItem(ANIMALS));
  const [animalScore, setAnimalScore] = useState(0);
  const [animalFeedback, setAnimalFeedback] = useState('Escolha o bichinho certo.');

  const [shapeTarget, setShapeTarget] = useState<Option>(pickRandomItem(SHAPES));
  const [shapeScore, setShapeScore] = useState(0);
  const [shapeFeedback, setShapeFeedback] = useState('Toque na forma pedida.');

  const animalOptions = useMemo(() => shuffleList(ANIMALS), [animalTarget]);
  const shapeOptions = useMemo(() => shuffleList(SHAPES), [shapeTarget]);

  const resetAndGoHome = () => {
    setScreen('home');
    setColorTarget(pickRandomItem(COLORS));
    setAnimalTarget(pickRandomItem(ANIMALS));
    setShapeTarget(pickRandomItem(SHAPES));
    setColorFeedback('Toque na cor pedida.');
    setAnimalFeedback('Escolha o bichinho certo.');
    setShapeFeedback('Toque na forma pedida.');
  };

  const onPickColor = (item: Option) => {
    if (item.id === colorTarget.id) {
      setColorScore((value) => value + 1);
      setColorFeedback(`Muito bem! ${item.label}!`);
      setColorTarget(pickRandomItem(COLORS));
      return;
    }

    setColorFeedback(`Vamos tentar de novo: ${colorTarget.label}.`);
  };

  const onPickAnimal = (item: Option) => {
    if (item.id === animalTarget.id) {
      setAnimalScore((value) => value + 1);
      setAnimalFeedback(`${item.emoji} ${item.extra}`);
      setAnimalTarget(pickRandomItem(ANIMALS));
      return;
    }

    setAnimalFeedback(`Esse não é. Procure: ${animalTarget.label}.`);
  };

  const onPickShape = (item: Option) => {
    if (item.id === shapeTarget.id) {
      setShapeScore((value) => value + 1);
      setShapeFeedback(`Boa! ${item.label}!`);
      setShapeTarget(pickRandomItem(SHAPES));
      return;
    }

    setShapeFeedback(`Quase! Toque em: ${shapeTarget.label}.`);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>🌈 Mundo das Descobertas</Text>
        <Text style={styles.subtitle}>Jogo educativo para crianças a partir de 3 anos</Text>

        {screen === 'home' && (
          <View style={styles.grid}>
            <ActionButton text="🎨 Cores" detail="Toque na cor certa" onPress={() => setScreen('colors')} />
            <ActionButton text="🐾 Bichinhos" detail="Descubra os sons" onPress={() => setScreen('animals')} />
            <ActionButton text="🔷 Formas" detail="Encontre a forma" onPress={() => setScreen('shapes')} />
          </View>
        )}

        {screen === 'colors' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Toque na cor: {colorTarget.label}</Text>
            <Text style={styles.score}>Pontuação: {colorScore}</Text>
            <View style={styles.colorGrid}>
              {COLORS.map((item) => (
                <Pressable
                  key={item.id}
                  style={[styles.colorBubble, { backgroundColor: item.color ?? '#ddd' }]}
                  onPress={() => onPickColor(item)}
                >
                  <Text style={styles.bubbleEmoji}>{item.emoji}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.feedback}>{colorFeedback}</Text>
          </View>
        )}

        {screen === 'animals' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cadê o: {animalTarget.label}?</Text>
            <Text style={styles.score}>Pontuação: {animalScore}</Text>
            {animalOptions.map((item) => (
              <Pressable key={item.id} style={styles.optionButton} onPress={() => onPickAnimal(item)}>
                <Text style={styles.optionText}>
                  {item.emoji} {item.label}
                </Text>
              </Pressable>
            ))}
            <Text style={styles.feedback}>{animalFeedback}</Text>
          </View>
        )}

        {screen === 'shapes' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Encontre a forma: {shapeTarget.label}</Text>
            <Text style={styles.score}>Pontuação: {shapeScore}</Text>
            <View style={styles.shapeGrid}>
              {shapeOptions.map((item) => (
                <Pressable key={item.id} style={styles.shapeButton} onPress={() => onPickShape(item)}>
                  <Text style={styles.shapeEmoji}>{item.emoji}</Text>
                  <Text style={styles.shapeText}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.feedback}>{shapeFeedback}</Text>
          </View>
        )}

        {screen !== 'home' && <ActionButton text="🏠 Voltar ao início" detail="Menu principal" onPress={resetAndGoHome} />}
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionButton({ text, detail, onPress }: { text: string; detail: string; onPress: () => void }) {
  return (
    <Pressable style={styles.actionButton} onPress={onPress}>
      <Text style={styles.actionText}>{text}</Text>
      <Text style={styles.actionDetail}>{detail}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#fef3c7',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    gap: 14,
  },
  title: {
    textAlign: 'center',
    fontSize: 30,
    fontWeight: '900',
    color: '#1e3a8a',
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 16,
    color: '#334155',
    fontWeight: '700',
  },
  grid: {
    gap: 12,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
  },
  score: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '800',
    color: '#be123c',
  },
  feedback: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  actionButton: {
    backgroundColor: '#1d4ed8',
    borderRadius: 20,
    minHeight: 88,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
  },
  actionText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
  },
  actionDetail: {
    color: '#dbeafe',
    fontSize: 18,
    fontWeight: '700',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  colorBubble: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubbleEmoji: {
    fontSize: 36,
  },
  optionButton: {
    minHeight: 82,
    borderRadius: 16,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    color: '#052e16',
    fontSize: 28,
    fontWeight: '900',
  },
  shapeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  shapeButton: {
    backgroundColor: '#ddd6fe',
    borderRadius: 16,
    width: 150,
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    gap: 6,
  },
  shapeEmoji: {
    fontSize: 38,
  },
  shapeText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#312e81',
  },
});
