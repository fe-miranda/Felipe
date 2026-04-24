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
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, UserProfile, FitnessGoal, FitnessLevel, Gender, PlanDuration } from '../types';
import { usePlan } from '../hooks/usePlan';
import { setRuntimeApiKey } from '../services/aiService';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Onboarding'> };

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: '#07070F',
  surface: '#0F0F1A',
  elevated: '#161625',
  border: '#1E1E30',
  borderFocus: '#7C3AED',
  primary: '#7C3AED',
  primaryLight: '#A78BFA',
  primaryGlow: 'rgba(124,58,237,0.15)',
  text1: '#F1F5F9',
  text2: '#94A3B8',
  text3: '#475569',
  inputBg: '#0A0A14',
};

const GOALS: { value: FitnessGoal; label: string; icon: string; desc: string }[] = [
  { value: 'lose_weight',       label: 'Perda de Peso',    icon: '🔥', desc: 'Queimar gordura' },
  { value: 'gain_muscle',       label: 'Ganho de Massa',   icon: '💪', desc: 'Hipertrofia' },
  { value: 'improve_endurance', label: 'Resistência',      icon: '🏃', desc: 'Cardio & stamina' },
  { value: 'increase_strength', label: 'Força',            icon: '🏋️', desc: 'Mais carga' },
  { value: 'general_fitness',   label: 'Condicionamento',  icon: '⚡', desc: 'Saúde geral' },
];

const LEVELS: { value: FitnessLevel; label: string; icon: string; desc: string }[] = [
  { value: 'beginner',     label: 'Iniciante',     icon: '🌱', desc: '< 6 meses de treino' },
  { value: 'intermediate', label: 'Intermediário', icon: '🔥', desc: '6 meses – 2 anos' },
  { value: 'advanced',     label: 'Avançado',      icon: '⚡', desc: '+ de 2 anos' },
];

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'male',   label: 'Masculino' },
  { value: 'female', label: 'Feminino' },
  { value: 'other',  label: 'Outro' },
];

const DAYS = [2, 3, 4, 5, 6];
const DURATIONS = [30, 45, 60, 75, 90]; // total minutes per session
const CARDIO_OPTIONS = [0, 10, 15, 20, 30]; // cardio minutes per session

const PLAN_DURATIONS: { value: PlanDuration; label: string; sub: string }[] = [
  { value: 'weekly',   label: 'Semanal',    sub: '1 semana' },
  { value: 'monthly',  label: 'Mensal',     sub: '1 mês' },
  { value: 'quarterly',label: 'Trimestral', sub: '3 meses' },
  { value: 'biannual', label: 'Semestral',  sub: '6 meses' },
  { value: 'annual',   label: 'Anual',      sub: '12 meses' },
];

// Step labels for the visual progress bar
const STEPS = ['Perfil', 'Objetivo', 'Treino', 'Gerar'];

export function OnboardingScreen({ navigation }: Props) {
  const { generate, loadStoredPlan } = usePlan();

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [gender, setGender] = useState<Gender>('male');
  const [goal, setGoal] = useState<FitnessGoal>('gain_muscle');
  const [level, setLevel] = useState<FitnessLevel>('beginner');
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [workoutDuration, setWorkoutDuration] = useState(60);
  const [cardioMinutes, setCardioMinutes] = useState(10);
  const [injuries, setInjuries] = useState('');
  const [planDuration, setPlanDuration] = useState<PlanDuration>('annual');
  const [generating, setGenerating] = useState(false);

  React.useEffect(() => {
    (async () => {
      const found = await loadStoredPlan();
      if (found) { navigation.replace('Main'); return; }
      const key = await AsyncStorage.getItem('@gymapp_custom_apikey');
      if (key) setRuntimeApiKey(key);
    })();
  }, [loadStoredPlan, navigation]);

  const handleGenerate = async () => {
    if (!name.trim() || !age || !weight || !height) {
      Alert.alert('Atenção', 'Preencha todos os campos obrigatórios.');
      return;
    }
    const parsedAge    = parseInt(age, 10);
    const parsedWeight = parseFloat(weight);
    const parsedHeight = parseFloat(height);

    if (isNaN(parsedAge) || parsedAge < 10 || parsedAge > 100) {
      Alert.alert('Atenção', 'Insira uma idade válida (10–100).'); return;
    }
    if (isNaN(parsedWeight) || parsedWeight < 30 || parsedWeight > 300) {
      Alert.alert('Atenção', 'Insira um peso válido em kg.'); return;
    }
    if (isNaN(parsedHeight) || parsedHeight < 100 || parsedHeight > 250) {
      Alert.alert('Atenção', 'Insira uma altura válida em cm.'); return;
    }

    const profile: UserProfile = {
      name: name.trim(), age: parsedAge, weight: parsedWeight, height: parsedHeight,
      gender, goal, fitnessLevel: level, daysPerWeek, workoutDuration, cardioMinutes,
      injuries: injuries.trim() || undefined,
      planDuration,
    };

    setGenerating(true);
    try {
      await generate(profile);
      navigation.replace('Main');
    } catch (err: any) {
      const msg: string = err.message || 'Erro ao gerar o plano. Tente novamente.';
      if (msg.includes('API Key') || msg.includes('401') || msg.includes('403')) {
        Alert.alert(
          'Chave API necessária',
          'Configure sua chave Groq gratuita antes de gerar o plano.',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Configurar agora', onPress: () => navigation.navigate('Settings') },
          ]
        );
      } else {
        Alert.alert('Erro', msg);
      }
    } finally {
      setGenerating(false);
    }
  };

  return (
    <SafeAreaView style={s.safeArea} edges={['top', 'bottom']}>
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Hero header ── */}
        <View style={s.hero}>
          <View style={s.logoWrap}>
            <Text style={s.logoEmoji}>💪</Text>
          </View>
          <Text style={s.appName}>GymAI</Text>
          <Text style={s.tagline}>Plano anual personalizado com IA</Text>
          <Text style={s.taglineSub}>Em segundos. Gratuito. Feito para você.</Text>
        </View>

        {/* Step dots */}
        <View style={s.stepRow}>
          {STEPS.map((label, i) => (
            <View key={i} style={s.stepItem}>
              <View style={s.stepDot}>
                <Text style={s.stepNum}>{i + 1}</Text>
              </View>
              <Text style={s.stepLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* ── Section 1: Perfil ── */}
        <View style={s.sectionHeader}>
          <View style={s.sectionBadge}><Text style={s.sectionBadgeText}>1</Text></View>
          <Text style={s.sectionTitle}>Seus dados</Text>
        </View>
        <View style={s.card}>
          <Text style={s.inputLabel}>Nome completo *</Text>
          <TextInput
            style={s.input}
            placeholder="Como prefere ser chamado"
            placeholderTextColor={C.text3}
            value={name}
            onChangeText={setName}
            testID="input-name"
          />

          <View style={s.row}>
            <View style={s.halfWrap}>
              <Text style={s.inputLabel}>Idade *</Text>
              <TextInput
                style={s.input}
                placeholder="Ex: 28"
                placeholderTextColor={C.text3}
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
                testID="input-age"
              />
            </View>
            <View style={[s.halfWrap, { marginLeft: 10 }]}>
              <Text style={s.inputLabel}>Peso (kg) *</Text>
              <TextInput
                style={s.input}
                placeholder="Ex: 75"
                placeholderTextColor={C.text3}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                testID="input-weight"
              />
            </View>
          </View>

          <Text style={s.inputLabel}>Altura (cm) *</Text>
          <TextInput
            style={s.input}
            placeholder="Ex: 175"
            placeholderTextColor={C.text3}
            value={height}
            onChangeText={setHeight}
            keyboardType="numeric"
            testID="input-height"
          />

          <Text style={s.inputLabel}>Gênero</Text>
          <View style={s.pillRow}>
            {GENDERS.map((g) => (
              <TouchableOpacity
                key={g.value}
                style={[s.pill, gender === g.value && s.pillActive]}
                onPress={() => setGender(g.value)}
                testID={`gender-${g.value}`}
              >
                <Text style={[s.pillText, gender === g.value && s.pillTextActive]}>{g.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Section 2: Objetivo ── */}
        <View style={s.sectionHeader}>
          <View style={s.sectionBadge}><Text style={s.sectionBadgeText}>2</Text></View>
          <Text style={s.sectionTitle}>Seu objetivo</Text>
        </View>
        <View style={s.card}>
          <View style={s.goalGrid}>
            {GOALS.map((g) => (
              <TouchableOpacity
                key={g.value}
                style={[s.goalCard, goal === g.value && s.goalCardActive]}
                onPress={() => setGoal(g.value)}
                testID={`goal-${g.value}`}
              >
                <Text style={s.goalEmoji}>{g.icon}</Text>
                <Text style={[s.goalLabel, goal === g.value && s.goalLabelActive]}>{g.label}</Text>
                <Text style={s.goalDesc}>{g.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Section 3: Nível e frequência ── */}
        <View style={s.sectionHeader}>
          <View style={s.sectionBadge}><Text style={s.sectionBadgeText}>3</Text></View>
          <Text style={s.sectionTitle}>Nível e frequência</Text>
        </View>
        <View style={s.card}>
          <Text style={s.inputLabel}>Experiência</Text>
          {LEVELS.map((l) => (
            <TouchableOpacity
              key={l.value}
              style={[s.levelRow, level === l.value && s.levelRowActive]}
              onPress={() => setLevel(l.value)}
              testID={`level-${l.value}`}
            >
              <Text style={s.levelEmoji}>{l.icon}</Text>
              <View style={s.levelInfo}>
                <Text style={[s.levelName, level === l.value && s.levelNameActive]}>{l.label}</Text>
                <Text style={s.levelDesc}>{l.desc}</Text>
              </View>
              <View style={[s.radioOuter, level === l.value && s.radioOuterActive]}>
                {level === l.value && <View style={s.radioInner} />}
              </View>
            </TouchableOpacity>
          ))}

          <Text style={[s.inputLabel, { marginTop: 16 }]}>Dias de treino por semana</Text>
          <View style={s.daysRow}>
            {DAYS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[s.dayCircle, daysPerWeek === d && s.dayCircleActive]}
                onPress={() => setDaysPerWeek(d)}
                testID={`days-${d}`}
              >
                <Text style={[s.dayNum, daysPerWeek === d && s.dayNumActive]}>{d}</Text>
                <Text style={[s.dayLabel, daysPerWeek === d && s.dayLabelActive]}>dias</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[s.inputLabel, { marginTop: 16 }]}>Duração do treino</Text>
          <View style={s.daysRow}>
            {DURATIONS.map((d) => (
              <TouchableOpacity
                key={d}
                style={[s.dayCircle, workoutDuration === d && s.dayCircleActive]}
                onPress={() => setWorkoutDuration(d)}
                testID={`duration-${d}`}
              >
                <Text style={[s.dayNum, workoutDuration === d && s.dayNumActive, { fontSize: 14 }]}>{d}</Text>
                <Text style={[s.dayLabel, workoutDuration === d && s.dayLabelActive]}>min</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[s.inputLabel, { marginTop: 16 }]}>Tempo de cardio por sessão</Text>
          <View style={s.daysRow}>
            {CARDIO_OPTIONS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[s.dayCircle, cardioMinutes === c && s.dayCircleActive]}
                onPress={() => setCardioMinutes(c)}
                testID={`cardio-${c}`}
              >
                <Text style={[s.dayNum, cardioMinutes === c && s.dayNumActive, { fontSize: 14 }]}>{c}</Text>
                <Text style={[s.dayLabel, cardioMinutes === c && s.dayLabelActive]}>min</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Section 4: Plan duration ── */}
        <View style={s.sectionHeader}>
          <View style={s.sectionBadge}><Text style={s.sectionBadgeText}>4</Text></View>
          <Text style={s.sectionTitle}>Duração do plano</Text>
        </View>
        <View style={s.card}>
          <Text style={s.inputLabel}>Por quanto tempo quer planejar?</Text>
          <View style={s.durationGrid}>
            {PLAN_DURATIONS.map((d) => (
              <TouchableOpacity
                key={d.value}
                style={[s.durationOption, planDuration === d.value && s.durationOptionActive]}
                onPress={() => setPlanDuration(d.value)}
                testID={`duration-plan-${d.value}`}
              >
                <Text style={[s.durationLabel, planDuration === d.value && s.durationLabelActive]}>{d.label}</Text>
                <Text style={s.durationSub}>{d.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Section 5: Lesões ── */}
        <View style={s.sectionHeader}>
          <View style={[s.sectionBadge, { backgroundColor: C.elevated }]}>
            <Text style={[s.sectionBadgeText, { color: C.text2 }]}>5</Text>
          </View>
          <Text style={s.sectionTitle}>Limitações <Text style={s.optional}>(opcional)</Text></Text>
        </View>
        <View style={s.card}>
          <Text style={s.inputLabel}>Lesões ou restrições físicas</Text>
          <TextInput
            style={[s.input, s.textArea]}
            placeholder="Ex: dor no joelho, lesão no ombro, hérnia de disco..."
            placeholderTextColor={C.text3}
            value={injuries}
            onChangeText={setInjuries}
            multiline
            numberOfLines={3}
            testID="input-injuries"
          />
          <Text style={s.hint}>A IA adaptará seus treinos para respeitar suas limitações.</Text>
        </View>

        {/* ── Generate CTA ── */}
        <TouchableOpacity
          style={[s.generateBtn, generating && s.generateBtnLoading]}
          onPress={handleGenerate}
          disabled={generating}
          testID="btn-generate"
          activeOpacity={0.85}
        >
          <Text style={s.generateText}>
            {generating
              ? '⏳  Criando seu plano...'
              : `🚀  Gerar Plano ${PLAN_DURATIONS.find(d => d.value === planDuration)?.label ?? ''}`}
          </Text>
        </TouchableOpacity>

        {generating && (
          <View style={s.loadingCard}>
            <Text style={s.loadingTitle}>✨ IA gerando sua estrutura...</Text>
            <Text style={s.loadingDesc}>
              O plano estará pronto em segundos. Os treinos de cada mês são gerados ao abrí-los — assim usamos muito menos IA e você começa mais rápido!
            </Text>
          </View>
        )}

        <Text style={s.footer}>100% gratuito · Powered by Groq + Llama 3.3</Text>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20, paddingBottom: 20 },

  // Hero
  hero: { alignItems: 'center', paddingTop: 16, paddingBottom: 24 },
  logoWrap: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: C.primaryGlow,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4, shadowRadius: 20, elevation: 10,
  },
  logoEmoji: { fontSize: 42 },
  appName: { color: C.text1, fontSize: 38, fontWeight: '900', letterSpacing: 0.5 },
  tagline: { color: C.primaryLight, fontSize: 16, marginTop: 6, fontWeight: '600' },
  taglineSub: { color: C.text3, fontSize: 13, marginTop: 4 },

  // Step dots
  stepRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 24 },
  stepItem: { alignItems: 'center', gap: 4 },
  stepDot: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.primaryGlow, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)' },
  stepNum: { color: C.primaryLight, fontSize: 12, fontWeight: '700' },
  stepLabel: { color: C.text3, fontSize: 10 },

  // Section header
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10, marginTop: 6 },
  sectionBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  sectionBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  sectionTitle: { color: C.text1, fontSize: 16, fontWeight: '700' },
  optional: { color: C.text3, fontWeight: '400', fontSize: 13 },

  // Card
  card: { backgroundColor: C.surface, borderRadius: 18, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: C.border },

  // Input
  inputLabel: { color: C.text2, fontSize: 12, fontWeight: '600', marginBottom: 6, letterSpacing: 0.3 },
  input: {
    backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13,
    color: C.text1, fontSize: 15, marginBottom: 14,
  },
  textArea: { height: 90, textAlignVertical: 'top', paddingTop: 12 },
  row: { flexDirection: 'row' },
  halfWrap: { flex: 1 },
  hint: { color: C.text3, fontSize: 12, lineHeight: 18, marginTop: -6 },

  // Gender pills
  pillRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 18, paddingVertical: 9, borderRadius: 10, backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border },
  pillActive: { backgroundColor: C.primaryGlow, borderColor: C.primary },
  pillText: { color: C.text2, fontSize: 14, fontWeight: '500' },
  pillTextActive: { color: C.primaryLight, fontWeight: '700' },

  // Goals
  goalGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  goalCard: {
    width: '47%', padding: 14, borderRadius: 14,
    backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border,
    alignItems: 'center',
  },
  goalCardActive: { backgroundColor: C.primaryGlow, borderColor: C.primary },
  goalEmoji: { fontSize: 32, marginBottom: 6 },
  goalLabel: { color: C.text2, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  goalLabelActive: { color: C.primaryLight, fontWeight: '800' },
  goalDesc: { color: C.text3, fontSize: 11, marginTop: 3, textAlign: 'center' },

  // Levels
  levelRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 14, borderRadius: 12, marginBottom: 8,
    backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border,
  },
  levelRowActive: { backgroundColor: C.primaryGlow, borderColor: C.primary },
  levelEmoji: { fontSize: 24 },
  levelInfo: { flex: 1 },
  levelName: { color: C.text2, fontSize: 15, fontWeight: '600' },
  levelNameActive: { color: C.primaryLight, fontWeight: '700' },
  levelDesc: { color: C.text3, fontSize: 12, marginTop: 2 },
  radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: C.text3, alignItems: 'center', justifyContent: 'center' },
  radioOuterActive: { borderColor: C.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary },

  // Days
  daysRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 4 },
  dayCircle: {
    width: 56, height: 60, borderRadius: 14,
    backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  dayCircleActive: { backgroundColor: C.primary, borderColor: C.primary },
  dayNum: { color: C.text2, fontSize: 20, fontWeight: '800' },
  dayNumActive: { color: '#fff' },
  dayLabel: { color: C.text3, fontSize: 10, marginTop: 1 },
  dayLabelActive: { color: 'rgba(255,255,255,0.8)' },

  // Generate
  generateBtn: {
    backgroundColor: C.primary, padding: 18, borderRadius: 16,
    alignItems: 'center', marginTop: 8,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45, shadowRadius: 16, elevation: 10,
  },
  generateBtnLoading: { backgroundColor: '#5B21B6', opacity: 0.8, shadowOpacity: 0 },
  generateText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },

  // Loading info card
  loadingCard: {
    marginTop: 14, padding: 18,
    backgroundColor: C.surface, borderRadius: 14,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)',
  },
  loadingTitle: { color: C.primaryLight, fontWeight: '700', fontSize: 14, marginBottom: 8 },
  loadingDesc: { color: C.text2, fontSize: 13, lineHeight: 20 },

  footer: { color: C.text3, fontSize: 11, textAlign: 'center', marginTop: 20 },

  // Plan duration
  durationGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  durationOption: {
    width: '47%', paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 12, backgroundColor: C.elevated,
    borderWidth: 1, borderColor: C.border, alignItems: 'center',
  },
  durationOptionActive: { backgroundColor: C.primaryGlow, borderColor: C.primary },
  durationLabel: { color: C.text2, fontSize: 14, fontWeight: '700' },
  durationLabelActive: { color: C.primaryLight },
  durationSub: { color: C.text3, fontSize: 11, marginTop: 3 },
});
