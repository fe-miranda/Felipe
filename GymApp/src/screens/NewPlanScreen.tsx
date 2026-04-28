import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  TextInput, Alert, ActivityIndicator, Image, Platform, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { RootStackParamList, UserProfile, FitnessGoal, FitnessLevel, Gender } from '../types';
import { importPlanFromText, importPlanFromImages } from '../services/aiService';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'NewPlan'> };

const PLAN_KEY = '@gymapp_plan';

const C = {
  bg: '#07070F', surface: '#0F0F1A', elevated: '#161625', border: '#1E1E30',
  primary: '#7C3AED', primaryLight: '#A78BFA', primaryGlow: 'rgba(124,58,237,0.15)',
  success: '#10B981', successBg: 'rgba(16,185,129,0.1)',
  text1: '#F1F5F9', text2: '#94A3B8', text3: '#475569',
  danger: '#EF4444',
};

type Mode = 'choose' | 'text' | 'images';

interface PickedImage {
  uri: string;
  base64: string;
  mimeType: string;
}

type PendingImportMode = 'text' | 'images' | null;

interface ImportForm {
  name: string;
  age: string;
  weight: string;
  height: string;
  gender: Gender;
  fitnessLevel: FitnessLevel;
  goal: FitnessGoal;
  daysPerWeek: string;
  workoutDuration: string;
  cardioMinutes: string;
  durationMonths: 1 | 3 | 6 | 12;
}

export function NewPlanScreen({ navigation }: Props) {
  const [mode, setMode] = useState<Mode>('choose');
  const [planText, setPlanText] = useState('');
  const [images, setImages] = useState<PickedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);
  const [pendingImportMode, setPendingImportMode] = useState<PendingImportMode>(null);
  const [form, setForm] = useState<ImportForm>({
    name: 'Usuário',
    age: '25',
    weight: '70',
    height: '170',
    gender: 'male',
    fitnessLevel: 'intermediate',
    goal: 'general_fitness',
    daysPerWeek: '3',
    workoutDuration: '60',
    cardioMinutes: '10',
    durationMonths: 3,
  });

  // ── image picker ──────────────────────────────────────────────────────────

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria para importar as imagens do treino.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      base64: true,
      quality: 0.8,
    });
    if (result.canceled || !result.assets.length) return;
    const picked: PickedImage[] = result.assets
      .filter((a) => a.base64)
      .map((a) => ({
        uri: a.uri,
        base64: a.base64!,
        mimeType: a.mimeType ?? 'image/jpeg',
      }));
    setImages((prev) => [...prev, ...picked]);
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // ── import handlers ───────────────────────────────────────────────────────

  const handleImportText = async () => {
    if (!planText.trim()) {
      Alert.alert('Atenção', 'Cole seu plano de treino no campo acima.');
      return;
    }
    setPendingImportMode('text');
    setShowImportForm(true);
  };

  const handleImportImages = async () => {
    if (images.length === 0) {
      Alert.alert('Atenção', 'Adicione pelo menos uma imagem do seu treino.');
      return;
    }
    setPendingImportMode('images');
    setShowImportForm(true);
  };

  const runImport = async () => {
    if (!pendingImportMode) return;
    const age = parseInt(form.age, 10);
    const weight = parseFloat(form.weight);
    const height = parseFloat(form.height);
    const daysPerWeek = parseInt(form.daysPerWeek, 10);
    const workoutDuration = parseInt(form.workoutDuration, 10);
    const cardioMinutes = parseInt(form.cardioMinutes, 10);

    if (!form.name.trim()) {
      Alert.alert('Atenção', 'Informe o nome.');
      return;
    }
    if (
      [age, weight, height, daysPerWeek, workoutDuration, cardioMinutes].some((n) => Number.isNaN(n)) ||
      age < 12 || age > 100 || weight <= 0 || height <= 0 ||
      daysPerWeek < 1 || daysPerWeek > 7 || workoutDuration < 10 || cardioMinutes < 0 ||
      cardioMinutes > workoutDuration
    ) {
      Alert.alert('Atenção', 'Revise os dados do perfil antes de continuar.');
      return;
    }

    const userProfile: UserProfile = {
      name: form.name.trim(),
      age,
      weight,
      height,
      gender: form.gender,
      fitnessLevel: form.fitnessLevel,
      goal: form.goal,
      daysPerWeek,
      workoutDuration,
      cardioMinutes,
    };

    setLoading(true);
    try {
      const options = { userProfile, durationMonths: form.durationMonths };
      const plan = pendingImportMode === 'text'
        ? await importPlanFromText(planText.trim(), options)
        : await importPlanFromImages(images.map((img) => ({ data: img.base64, mimeType: img.mimeType })), options);
      await AsyncStorage.setItem(PLAN_KEY, JSON.stringify(plan));
      setShowImportForm(false);
      navigation.replace('Main');
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Não foi possível importar o plano. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // ── render ────────────────────────────────────────────────────────────────

  if (mode === 'choose') {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <View style={s.hero}>
            <Text style={s.heroEmoji}>🏋️</Text>
            <Text style={s.heroTitle}>Novo Plano de Treino</Text>
            <Text style={s.heroDesc}>Escolha como deseja criar seu plano</Text>
          </View>

          {/* Option 1 – AI generation */}
          <TouchableOpacity style={s.optionCard} onPress={() => navigation.replace('Onboarding')} activeOpacity={0.85}>
            <View style={[s.optionIcon, { backgroundColor: 'rgba(124,58,237,0.18)' }]}>
              <Text style={s.optionEmoji}>🤖</Text>
            </View>
            <View style={s.optionInfo}>
              <Text style={s.optionTitle}>Criar com IA</Text>
              <Text style={s.optionDesc}>Responda algumas perguntas e a IA monta seu plano personalizado</Text>
            </View>
            <Text style={s.optionArrow}>›</Text>
          </TouchableOpacity>

          {/* Option 2 – Import from images */}
          <TouchableOpacity style={s.optionCard} onPress={() => setMode('images')} activeOpacity={0.85}>
            <View style={[s.optionIcon, { backgroundColor: 'rgba(59,130,246,0.18)' }]}>
              <Text style={s.optionEmoji}>🖼️</Text>
            </View>
            <View style={s.optionInfo}>
              <Text style={s.optionTitle}>Importar de Imagem</Text>
              <Text style={s.optionDesc}>Envie fotos ou prints do seu plano — a IA extrai os exercícios automaticamente</Text>
            </View>
            <Text style={s.optionArrow}>›</Text>
          </TouchableOpacity>

          {/* Option 3 – Import from text */}
          <TouchableOpacity style={s.optionCard} onPress={() => setMode('text')} activeOpacity={0.85}>
            <View style={[s.optionIcon, { backgroundColor: 'rgba(16,185,129,0.18)' }]}>
              <Text style={s.optionEmoji}>📋</Text>
            </View>
            <View style={s.optionInfo}>
              <Text style={s.optionTitle}>Colar Texto</Text>
              <Text style={s.optionDesc}>Cole o texto do seu plano de treino e a IA converte para o formato do app</Text>
            </View>
            <Text style={s.optionArrow}>›</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (mode === 'text') {
    const charCount = planText.length;
    const wordCount = planText.trim() ? planText.trim().split(/\s+/).length : 0;
    const hasContent = planText.trim().length > 10;

    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <ScrollView style={s.container} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <TouchableOpacity style={s.backRow} onPress={() => setMode('choose')} disabled={loading}>
            <Text style={s.backText}>‹ Voltar</Text>
          </TouchableOpacity>

          <View style={s.sectionHeader}>
            <Text style={s.sectionEmoji}>📋</Text>
            <Text style={s.sectionTitle}>Importar via Texto</Text>
          </View>
          <Text style={s.sectionDesc}>
            Cole o texto do seu plano de treino em qualquer formato. A IA interpreta e converte automaticamente para o app.
          </Text>

          {/* Format hints */}
          <View style={s.hintCard}>
            <Text style={s.hintTitle}>💡 Formatos aceitos</Text>
            {[
              '📅  Planilha de academia (Segunda, Terça…)',
              '📄  PDF / texto copiado de app',
              '🤖  Plano gerado por ChatGPT ou similar',
              '✏️  Lista manual de exercícios',
            ].map((h, i) => (
              <View key={i} style={s.hintRow}>
                <Text style={s.hintText}>{h}</Text>
              </View>
            ))}
          </View>

          {/* Text area with clear button */}
          <View style={s.textAreaWrap}>
            <TextInput
              style={s.textArea}
              placeholder={
                'Exemplo:\n\n' +
                'Segunda – Peito e Tríceps\n' +
                '• Supino Reto: 4x10 (90s)\n' +
                '• Crucifixo Inclinado: 3x12\n' +
                '• Tríceps Pulley: 4x12 (60s)\n\n' +
                'Terça – Costas e Bíceps\n' +
                '• Puxada Frontal: 4x10\n' +
                '• Remada Curvada: 4x10\n' +
                '• Rosca Direta: 3x12\n...'
              }
              placeholderTextColor={C.text3}
              multiline
              numberOfLines={14}
              value={planText}
              onChangeText={setPlanText}
              editable={!loading}
              textAlignVertical="top"
            />
            {/* Character count + clear */}
            <View style={s.textAreaFooter}>
              <Text style={s.charCount}>{wordCount} palavras · {charCount} caracteres</Text>
              {hasContent && !loading && (
                <TouchableOpacity onPress={() => setPlanText('')} style={s.clearBtn}>
                  <Text style={s.clearBtnText}>✕ Limpar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Preview snippet */}
          {hasContent && (
            <View style={s.previewCard}>
              <Text style={s.previewLabel}>PRÉVIA DO TEXTO</Text>
              <Text style={s.previewText} numberOfLines={4}>{planText.trim().slice(0, 200)}{planText.length > 200 ? '…' : ''}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[s.importBtn, (loading || !hasContent) && s.importBtnDisabled]}
            onPress={handleImportText}
            disabled={loading || !hasContent}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.importBtnText}>🤖  Importar Plano com IA</Text>}
          </TouchableOpacity>

          {loading && (
            <View style={s.loadingCard}>
              <ActivityIndicator color={C.primaryLight} size="small" />
              <View>
                <Text style={s.loadingHint}>Analisando seu plano…</Text>
                <Text style={s.loadingHintSub}>Isso pode levar 10–30 segundos.</Text>
              </View>
            </View>
          )}
        </ScrollView>
        <Modal visible={showImportForm} transparent animationType="slide">
          <View style={s.modalOverlay}>
            <View style={s.modalSheet}>
              <Text style={s.modalTitle}>Dados para importar plano</Text>
              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Text style={s.fieldLabel}>Nome</Text>
                <TextInput style={s.input} value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="Nome" placeholderTextColor={C.text3} editable={!loading} />
                <View style={s.row}>
                  <Text style={[s.fieldLabel, s.half]}>Idade</Text>
                  <Text style={[s.fieldLabel, s.half]}>Peso (kg)</Text>
                </View>
                <View style={s.row}>
                  <TextInput style={[s.input, s.half]} value={form.age} onChangeText={(v) => setForm((f) => ({ ...f, age: v }))} placeholder="Idade" keyboardType="numeric" placeholderTextColor={C.text3} editable={!loading} />
                  <TextInput style={[s.input, s.half]} value={form.weight} onChangeText={(v) => setForm((f) => ({ ...f, weight: v }))} placeholder="Peso (kg)" keyboardType="decimal-pad" placeholderTextColor={C.text3} editable={!loading} />
                </View>
                <Text style={s.fieldLabel}>Altura (cm)</Text>
                <TextInput style={s.input} value={form.height} onChangeText={(v) => setForm((f) => ({ ...f, height: v }))} placeholder="Altura (cm)" keyboardType="numeric" placeholderTextColor={C.text3} editable={!loading} />
                <Text style={s.fieldLabel}>Sexo</Text>
                <View style={s.optionRow}>
                  {([
                    ['male', 'Masculino'],
                    ['female', 'Feminino'],
                    ['other', 'Outro'],
                  ] as [Gender, string][]).map(([value, label]) => (
                    <TouchableOpacity key={value} style={[s.pill, form.gender === value && s.pillActive]} onPress={() => setForm((f) => ({ ...f, gender: value }))}>
                      <Text style={[s.pillText, form.gender === value && s.pillTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={s.fieldLabel}>Nível de treino</Text>
                <View style={s.optionRow}>
                  {([
                    ['beginner', 'Iniciante'],
                    ['intermediate', 'Intermediário'],
                    ['advanced', 'Avançado'],
                  ] as [FitnessLevel, string][]).map(([value, label]) => (
                    <TouchableOpacity key={value} style={[s.pill, form.fitnessLevel === value && s.pillActive]} onPress={() => setForm((f) => ({ ...f, fitnessLevel: value }))}>
                      <Text style={[s.pillText, form.fitnessLevel === value && s.pillTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={s.fieldLabel}>Objetivo</Text>
                <View style={s.optionRow}>
                  {([
                    ['lose_weight', 'Perder peso'],
                    ['gain_muscle', 'Ganhar massa'],
                    ['general_fitness', 'Condicionamento'],
                    ['increase_strength', 'Força'],
                  ] as [FitnessGoal, string][]).map(([value, label]) => (
                    <TouchableOpacity key={value} style={[s.pill, form.goal === value && s.pillActive]} onPress={() => setForm((f) => ({ ...f, goal: value }))}>
                      <Text style={[s.pillText, form.goal === value && s.pillTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={s.row}>
                  <Text style={[s.fieldLabel, s.half]}>Dias por semana</Text>
                  <Text style={[s.fieldLabel, s.half]}>Duração por treino (min)</Text>
                </View>
                <View style={s.row}>
                  <TextInput style={[s.input, s.half]} value={form.daysPerWeek} onChangeText={(v) => setForm((f) => ({ ...f, daysPerWeek: v }))} placeholder="Dias/sem" keyboardType="numeric" placeholderTextColor={C.text3} editable={!loading} />
                  <TextInput style={[s.input, s.half]} value={form.workoutDuration} onChangeText={(v) => setForm((f) => ({ ...f, workoutDuration: v }))} placeholder="Duração (min)" keyboardType="numeric" placeholderTextColor={C.text3} editable={!loading} />
                </View>
                <Text style={s.fieldLabel}>Cardio por treino (min)</Text>
                <TextInput style={s.input} value={form.cardioMinutes} onChangeText={(v) => setForm((f) => ({ ...f, cardioMinutes: v }))} placeholder="Cardio (min)" keyboardType="numeric" placeholderTextColor={C.text3} editable={!loading} />
                <Text style={s.monthsLabel}>Por quantos meses é este plano?</Text>
                <View style={s.optionRow}>
                  {[1, 3, 6, 12].map((m) => (
                    <TouchableOpacity key={m} style={[s.pill, form.durationMonths === m && s.pillActive]} onPress={() => setForm((f) => ({ ...f, durationMonths: m as 1 | 3 | 6 | 12 }))}>
                      <Text style={[s.pillText, form.durationMonths === m && s.pillTextActive]}>{m} mês{m > 1 ? 'es' : ''}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={s.modalActions}>
                  <TouchableOpacity style={s.modalCancel} onPress={() => setShowImportForm(false)} disabled={loading}>
                    <Text style={s.modalCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.modalConfirm, loading && s.importBtnDisabled]} onPress={runImport} disabled={loading}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.modalConfirmText}>Importar</Text>}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // mode === 'images'
  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={s.backRow} onPress={() => setMode('choose')} disabled={loading}>
          <Text style={s.backText}>‹ Voltar</Text>
        </TouchableOpacity>

        <View style={s.sectionHeader}>
          <Text style={s.sectionEmoji}>🖼️</Text>
          <Text style={s.sectionTitle}>Importar via Imagem</Text>
        </View>
        <Text style={s.sectionDesc}>
          Adicione prints ou fotos do seu plano de treino. Você pode adicionar várias imagens — a IA lê e combina todas.
        </Text>

        {/* Image grid */}
        {images.length > 0 && (
          <View style={s.imageGrid}>
            {images.map((img, i) => (
              <View key={i} style={s.imageWrapper}>
                <Image source={{ uri: img.uri }} style={s.imageThumb} resizeMode="cover" />
                <TouchableOpacity style={s.imageRemove} onPress={() => removeImage(i)} disabled={loading}>
                  <Text style={s.imageRemoveText}>✕</Text>
                </TouchableOpacity>
                <View style={s.imageIndex}>
                  <Text style={s.imageIndexText}>{i + 1}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Add images button */}
        <TouchableOpacity style={s.addImgBtn} onPress={pickImages} disabled={loading} activeOpacity={0.85}>
          <Text style={s.addImgText}>＋  {images.length === 0 ? 'Selecionar Imagens' : 'Adicionar mais imagens'}</Text>
        </TouchableOpacity>

        {images.length > 0 && (
          <Text style={s.imageCount}>{images.length} imagem{images.length !== 1 ? 's' : ''} selecionada{images.length !== 1 ? 's' : ''}</Text>
        )}

        <TouchableOpacity
          style={[s.importBtn, (loading || images.length === 0) && s.importBtnDisabled]}
          onPress={handleImportImages}
          disabled={loading || images.length === 0}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.importBtnText}>🤖  Importar Plano</Text>}
        </TouchableOpacity>

        {loading && (
          <Text style={s.loadingHint}>Analisando as imagens… isso pode levar alguns segundos.</Text>
        )}
      </ScrollView>
      <Modal visible={showImportForm} transparent animationType="slide">
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>Dados para importar plano</Text>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={s.fieldLabel}>Nome</Text>
              <TextInput style={s.input} value={form.name} onChangeText={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="Nome" placeholderTextColor={C.text3} editable={!loading} />
              <View style={s.row}>
                <Text style={[s.fieldLabel, s.half]}>Idade</Text>
                <Text style={[s.fieldLabel, s.half]}>Peso (kg)</Text>
              </View>
              <View style={s.row}>
                <TextInput style={[s.input, s.half]} value={form.age} onChangeText={(v) => setForm((f) => ({ ...f, age: v }))} placeholder="Idade" keyboardType="numeric" placeholderTextColor={C.text3} editable={!loading} />
                <TextInput style={[s.input, s.half]} value={form.weight} onChangeText={(v) => setForm((f) => ({ ...f, weight: v }))} placeholder="Peso (kg)" keyboardType="decimal-pad" placeholderTextColor={C.text3} editable={!loading} />
              </View>
              <Text style={s.fieldLabel}>Altura (cm)</Text>
              <TextInput style={s.input} value={form.height} onChangeText={(v) => setForm((f) => ({ ...f, height: v }))} placeholder="Altura (cm)" keyboardType="numeric" placeholderTextColor={C.text3} editable={!loading} />
              <Text style={s.fieldLabel}>Sexo</Text>
              <View style={s.optionRow}>
                {([
                  ['male', 'Masculino'],
                  ['female', 'Feminino'],
                  ['other', 'Outro'],
                ] as [Gender, string][]).map(([value, label]) => (
                  <TouchableOpacity key={value} style={[s.pill, form.gender === value && s.pillActive]} onPress={() => setForm((f) => ({ ...f, gender: value }))}>
                    <Text style={[s.pillText, form.gender === value && s.pillTextActive]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={s.fieldLabel}>Nível de treino</Text>
              <View style={s.optionRow}>
                {([
                  ['beginner', 'Iniciante'],
                  ['intermediate', 'Intermediário'],
                  ['advanced', 'Avançado'],
                ] as [FitnessLevel, string][]).map(([value, label]) => (
                  <TouchableOpacity key={value} style={[s.pill, form.fitnessLevel === value && s.pillActive]} onPress={() => setForm((f) => ({ ...f, fitnessLevel: value }))}>
                    <Text style={[s.pillText, form.fitnessLevel === value && s.pillTextActive]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={s.fieldLabel}>Objetivo</Text>
              <View style={s.optionRow}>
                {([
                  ['lose_weight', 'Perder peso'],
                  ['gain_muscle', 'Ganhar massa'],
                  ['general_fitness', 'Condicionamento'],
                  ['increase_strength', 'Força'],
                ] as [FitnessGoal, string][]).map(([value, label]) => (
                  <TouchableOpacity key={value} style={[s.pill, form.goal === value && s.pillActive]} onPress={() => setForm((f) => ({ ...f, goal: value }))}>
                    <Text style={[s.pillText, form.goal === value && s.pillTextActive]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={s.row}>
                <Text style={[s.fieldLabel, s.half]}>Dias por semana</Text>
                <Text style={[s.fieldLabel, s.half]}>Duração por treino (min)</Text>
              </View>
              <View style={s.row}>
                <TextInput style={[s.input, s.half]} value={form.daysPerWeek} onChangeText={(v) => setForm((f) => ({ ...f, daysPerWeek: v }))} placeholder="Dias/sem" keyboardType="numeric" placeholderTextColor={C.text3} editable={!loading} />
                <TextInput style={[s.input, s.half]} value={form.workoutDuration} onChangeText={(v) => setForm((f) => ({ ...f, workoutDuration: v }))} placeholder="Duração (min)" keyboardType="numeric" placeholderTextColor={C.text3} editable={!loading} />
              </View>
              <Text style={s.fieldLabel}>Cardio por treino (min)</Text>
              <TextInput style={s.input} value={form.cardioMinutes} onChangeText={(v) => setForm((f) => ({ ...f, cardioMinutes: v }))} placeholder="Cardio (min)" keyboardType="numeric" placeholderTextColor={C.text3} editable={!loading} />
              <Text style={s.monthsLabel}>Por quantos meses é este plano?</Text>
              <View style={s.optionRow}>
                {[1, 3, 6, 12].map((m) => (
                  <TouchableOpacity key={m} style={[s.pill, form.durationMonths === m && s.pillActive]} onPress={() => setForm((f) => ({ ...f, durationMonths: m as 1 | 3 | 6 | 12 }))}>
                    <Text style={[s.pillText, form.durationMonths === m && s.pillTextActive]}>{m} mês{m > 1 ? 'es' : ''}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={s.modalActions}>
                <TouchableOpacity style={s.modalCancel} onPress={() => setShowImportForm(false)} disabled={loading}>
                  <Text style={s.modalCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[s.modalConfirm, loading && s.importBtnDisabled]} onPress={runImport} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.modalConfirmText}>Importar</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 40 },

  hero: {
    backgroundColor: C.surface, borderRadius: 20, padding: 24, marginBottom: 20,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)',
  },
  heroEmoji: { fontSize: 48, marginBottom: 10 },
  heroTitle: { color: C.text1, fontSize: 22, fontWeight: '800', marginBottom: 6 },
  heroDesc: { color: C.text2, fontSize: 14, textAlign: 'center' },

  optionCard: {
    backgroundColor: C.surface, borderRadius: 16, padding: 18, marginBottom: 12,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1, borderColor: C.border,
  },
  optionIcon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  optionEmoji: { fontSize: 26 },
  optionInfo: { flex: 1 },
  optionTitle: { color: C.text1, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  optionDesc: { color: C.text2, fontSize: 13, lineHeight: 19 },
  optionArrow: { color: C.text3, fontSize: 22, fontWeight: '300' },

  backRow: { marginBottom: 16 },
  backText: { color: C.primaryLight, fontSize: 16, fontWeight: '600' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  sectionEmoji: { fontSize: 24 },
  sectionTitle: { color: C.text1, fontSize: 18, fontWeight: '800' },
  sectionDesc: { color: C.text2, fontSize: 14, lineHeight: 21, marginBottom: 18 },

  textArea: {
    padding: 14, color: C.text1, fontSize: 14,
    minHeight: 220,
  },
  textAreaWrap: {
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 14, marginBottom: 14, overflow: 'hidden',
  },
  textAreaFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  charCount: { color: C.text3, fontSize: 11 },
  clearBtn: {
    backgroundColor: C.elevated, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: C.border,
  },
  clearBtnText: { color: C.text2, fontSize: 11, fontWeight: '700' },

  hintCard: {
    backgroundColor: C.elevated, borderRadius: 12, padding: 14, marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)', gap: 6,
  },
  hintTitle: { color: C.primaryLight, fontSize: 12, fontWeight: '800', letterSpacing: 0.5, marginBottom: 4 },
  hintRow: {},
  hintText: { color: C.text2, fontSize: 13 },

  previewCard: {
    backgroundColor: C.elevated, borderRadius: 12, padding: 12, marginBottom: 14,
    borderWidth: 1, borderColor: C.border,
  },
  previewLabel: { color: C.text3, fontSize: 10, fontWeight: '800', letterSpacing: 1, marginBottom: 6 },
  previewText: { color: C.text2, fontSize: 12, lineHeight: 18 },

  loadingCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: C.elevated, borderRadius: 12, padding: 14, marginTop: 8,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)',
  },
  loadingHint: { color: C.primaryLight, fontSize: 13, fontWeight: '700' },
  loadingHintSub: { color: C.text3, fontSize: 12, marginTop: 2 },

  importBtn: {
    backgroundColor: C.primary, borderRadius: 14, padding: 16, alignItems: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  importBtnDisabled: { opacity: 0.45 },
  importBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  imageWrapper: { position: 'relative', width: 100, height: 100 },
  imageThumb: { width: 100, height: 100, borderRadius: 10, borderWidth: 1, borderColor: C.border },
  imageRemove: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: 'rgba(239,68,68,0.85)', borderRadius: 10, width: 20, height: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  imageRemoveText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  imageIndex: {
    position: 'absolute', bottom: 4, left: 4,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1,
  },
  imageIndexText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  addImgBtn: {
    backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border,
    borderRadius: 14, padding: 14, alignItems: 'center', marginBottom: 10,
    borderStyle: 'dashed',
  },
  addImgText: { color: C.primaryLight, fontSize: 15, fontWeight: '700' },
  imageCount: { color: C.text3, fontSize: 12, textAlign: 'center', marginBottom: 16 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '88%',
    borderWidth: 1,
    borderColor: C.border,
  },
  modalTitle: { color: C.text1, fontSize: 17, fontWeight: '800', marginBottom: 12 },
  input: {
    backgroundColor: C.elevated,
    borderWidth: 1,
    borderColor: C.border,
    color: C.text1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  fieldLabel: { color: C.text2, fontSize: 12, fontWeight: '700', marginBottom: 6, marginTop: 2 },
  row: { flexDirection: 'row', gap: 8 },
  half: { flex: 1 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  pill: {
    backgroundColor: C.elevated,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillActive: { backgroundColor: C.primaryGlow, borderColor: C.primary },
  pillText: { color: C.text2, fontSize: 12, fontWeight: '600' },
  pillTextActive: { color: C.primaryLight },
  monthsLabel: { color: C.text2, marginBottom: 8, marginTop: 4, fontSize: 13, fontWeight: '700' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 6, marginBottom: Platform.OS === 'ios' ? 20 : 8 },
  modalCancel: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  modalCancelText: { color: C.text2, fontWeight: '700' },
  modalConfirm: {
    flex: 1,
    backgroundColor: C.primary,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  modalConfirmText: { color: '#fff', fontWeight: '800' },
});
