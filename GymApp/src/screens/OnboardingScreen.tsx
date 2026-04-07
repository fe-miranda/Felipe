import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, UserProfile, FitnessGoal, FitnessLevel, Gender } from '../types';
import { usePlan } from '../hooks/usePlan';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding'>;
};

const GOALS: { value: FitnessGoal; label: string; icon: string }[] = [
  { value: 'lose_weight', label: 'Perda de Peso', icon: '🔥' },
  { value: 'gain_muscle', label: 'Ganho de Massa', icon: '💪' },
  { value: 'improve_endurance', label: 'Resistência', icon: '🏃' },
  { value: 'increase_strength', label: 'Força', icon: '🏋️' },
  { value: 'general_fitness', label: 'Condicionamento', icon: '⚡' },
];

const LEVELS: { value: FitnessLevel; label: string; desc: string }[] = [
  { value: 'beginner', label: 'Iniciante', desc: 'Menos de 6 meses' },
  { value: 'intermediate', label: 'Intermediário', desc: '6 meses - 2 anos' },
  { value: 'advanced', label: 'Avançado', desc: 'Mais de 2 anos' },
];

const DAYS = [2, 3, 4, 5, 6];

export function OnboardingScreen({ navigation }: Props) {
  const { generate, loadStoredPlan } = usePlan();
  const [step, setStep] = useState(0);
  const [apiKey, setApiKey] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [goal, setGoal] = useState<FitnessGoal>('gain_muscle');
  const [level, setLevel] = useState<FitnessLevel>('beginner');
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [injuries, setInjuries] = useState('');
  const [generating, setGenerating] = useState(false);

  React.useEffect(() => {
    loadStoredPlan().then((found) => {
      if (found) navigation.replace('Home');
    });
  }, []);

  const handleGenerate = async () => {
    if (!apiKey.trim()) {
      Alert.alert('Atenção', 'Por favor, insira sua API Key da Anthropic.');
      return;
    }
    if (!name || !age || !weight || !height) {
      Alert.alert('Atenção', 'Preencha todos os campos obrigatórios.');
      return;
    }

    // Set API key in environment
    process.env.ANTHROPIC_API_KEY = apiKey.trim();

    const profile: UserProfile = {
      name: name.trim(),
      age: parseInt(age),
      weight: parseFloat(weight),
      height: parseFloat(height),
      gender,
      goal,
      fitnessLevel: level,
      daysPerWeek,
      injuries: injuries.trim() || undefined,
    };

    setGenerating(true);
    try {
      await generate(profile);
      navigation.replace('Home');
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Erro ao gerar o plano. Verifique sua API Key.');
    } finally {
      setGenerating(false);
    }
  };

  const GENDERS: { value: Gender; label: string }[] = [
    { value: 'male', label: 'Masculino' },
    { value: 'female', label: 'Feminino' },
    { value: 'other', label: 'Outro' },
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.logo}>💪</Text>
          <Text style={styles.title}>GymAI</Text>
          <Text style={styles.subtitle}>Seu plano de treino anual com IA</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>🔑 API Key Anthropic</Text>
          <TextInput
            style={styles.input}
            placeholder="sk-ant-..."
            value={apiKey}
            onChangeText={setApiKey}
            secureTextEntry
            placeholderTextColor="#666"
            autoCapitalize="none"
          />
          <Text style={styles.hint}>Obtenha em console.anthropic.com</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>👤 Seus Dados</Text>
          <TextInput
            style={styles.input}
            placeholder="Seu nome *"
            value={name}
            onChangeText={setName}
            placeholderTextColor="#666"
          />
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Idade *"
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
              placeholderTextColor="#666"
            />
            <TextInput
              style={[styles.input, styles.halfInput]}
              placeholder="Peso (kg) *"
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              placeholderTextColor="#666"
            />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Altura (cm) *"
            value={height}
            onChangeText={setHeight}
            keyboardType="numeric"
            placeholderTextColor="#666"
          />

          <Text style={styles.label}>Gênero</Text>
          <View style={styles.optionRow}>
            {GENDERS.map((g) => (
              <TouchableOpacity
                key={g.value}
                style={[styles.optionBtn, gender === g.value && styles.optionBtnActive]}
                onPress={() => setGender(g.value)}
              >
                <Text style={[styles.optionText, gender === g.value && styles.optionTextActive]}>
                  {g.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>🎯 Objetivo</Text>
          <View style={styles.goalGrid}>
            {GOALS.map((g) => (
              <TouchableOpacity
                key={g.value}
                style={[styles.goalBtn, goal === g.value && styles.goalBtnActive]}
                onPress={() => setGoal(g.value)}
              >
                <Text style={styles.goalIcon}>{g.icon}</Text>
                <Text style={[styles.goalText, goal === g.value && styles.goalTextActive]}>
                  {g.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>📊 Nível de Experiência</Text>
          {LEVELS.map((l) => (
            <TouchableOpacity
              key={l.value}
              style={[styles.levelBtn, level === l.value && styles.levelBtnActive]}
              onPress={() => setLevel(l.value)}
            >
              <View>
                <Text style={[styles.levelLabel, level === l.value && styles.levelLabelActive]}>
                  {l.label}
                </Text>
                <Text style={styles.levelDesc}>{l.desc}</Text>
              </View>
              {level === l.value && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>📅 Dias por Semana</Text>
          <View style={styles.optionRow}>
            {DAYS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[styles.dayBtn, daysPerWeek === d && styles.dayBtnActive]}
                onPress={() => setDaysPerWeek(d)}
              >
                <Text style={[styles.dayText, daysPerWeek === d && styles.dayTextActive]}>
                  {d}x
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>🩹 Lesões ou Limitações (opcional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Ex: dor no joelho, lesão no ombro..."
            value={injuries}
            onChangeText={setInjuries}
            multiline
            numberOfLines={3}
            placeholderTextColor="#666"
          />
        </View>

        <TouchableOpacity
          style={[styles.generateBtn, generating && styles.generateBtnDisabled]}
          onPress={handleGenerate}
          disabled={generating}
        >
          {generating ? (
            <Text style={styles.generateBtnText}>⏳ Gerando seu plano anual...</Text>
          ) : (
            <Text style={styles.generateBtnText}>🚀 Gerar Plano Anual</Text>
          )}
        </TouchableOpacity>

        {generating && (
          <View style={styles.loadingCard}>
            <Text style={styles.loadingText}>
              A IA está criando seu plano personalizado de 12 meses.{'\n'}
              Isso pode levar alguns minutos...
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f14' },
  scroll: { padding: 20, paddingBottom: 40 },
  header: { alignItems: 'center', paddingVertical: 30 },
  logo: { fontSize: 60 },
  title: { fontSize: 36, fontWeight: '900', color: '#fff', letterSpacing: 1 },
  subtitle: { fontSize: 16, color: '#888', marginTop: 6 },
  card: {
    backgroundColor: '#1a1a24',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 14 },
  input: {
    backgroundColor: '#0f0f14',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 10,
    padding: 14,
    color: '#fff',
    fontSize: 15,
    marginBottom: 12,
  },
  textArea: { height: 80, textAlignVertical: 'top' },
  halfInput: { flex: 1, marginRight: 8 },
  row: { flexDirection: 'row' },
  label: { color: '#aaa', fontSize: 14, marginBottom: 10, marginTop: 4 },
  hint: { color: '#555', fontSize: 12, marginTop: -6 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#0f0f14',
    borderWidth: 1,
    borderColor: '#333',
  },
  optionBtnActive: { backgroundColor: '#6c47ff', borderColor: '#6c47ff' },
  optionText: { color: '#aaa', fontSize: 14 },
  optionTextActive: { color: '#fff', fontWeight: '700' },
  goalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  goalBtn: {
    width: '47%',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#0f0f14',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
  },
  goalBtnActive: { backgroundColor: '#1a0f3a', borderColor: '#6c47ff' },
  goalIcon: { fontSize: 28, marginBottom: 6 },
  goalText: { color: '#aaa', fontSize: 13, textAlign: 'center' },
  goalTextActive: { color: '#a78bfa', fontWeight: '700' },
  levelBtn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#0f0f14',
    borderWidth: 1,
    borderColor: '#333',
    marginBottom: 8,
  },
  levelBtnActive: { backgroundColor: '#1a0f3a', borderColor: '#6c47ff' },
  levelLabel: { color: '#aaa', fontSize: 15, fontWeight: '600' },
  levelLabelActive: { color: '#a78bfa' },
  levelDesc: { color: '#555', fontSize: 12, marginTop: 2 },
  checkmark: { color: '#6c47ff', fontSize: 18, fontWeight: '700' },
  dayBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#0f0f14',
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayBtnActive: { backgroundColor: '#6c47ff', borderColor: '#6c47ff' },
  dayText: { color: '#aaa', fontSize: 15, fontWeight: '600' },
  dayTextActive: { color: '#fff' },
  generateBtn: {
    backgroundColor: '#6c47ff',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  generateBtnDisabled: { backgroundColor: '#3d2b99', opacity: 0.7 },
  generateBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  loadingCard: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#1a0f3a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#6c47ff44',
  },
  loadingText: { color: '#a78bfa', textAlign: 'center', lineHeight: 22 },
});
