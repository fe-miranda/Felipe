import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
  TextInput, Alert, ActivityIndicator, Image, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { RootStackParamList } from '../types';
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

export function NewPlanScreen({ navigation }: Props) {
  const [mode, setMode] = useState<Mode>('choose');
  const [planText, setPlanText] = useState('');
  const [images, setImages] = useState<PickedImage[]>([]);
  const [loading, setLoading] = useState(false);

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
    setLoading(true);
    try {
      const plan = await importPlanFromText(planText.trim());
      await AsyncStorage.setItem(PLAN_KEY, JSON.stringify(plan));
      navigation.replace('Home');
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Não foi possível importar o plano. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleImportImages = async () => {
    if (images.length === 0) {
      Alert.alert('Atenção', 'Adicione pelo menos uma imagem do seu treino.');
      return;
    }
    setLoading(true);
    try {
      const plan = await importPlanFromImages(
        images.map((img) => ({ data: img.base64, mimeType: img.mimeType })),
      );
      await AsyncStorage.setItem(PLAN_KEY, JSON.stringify(plan));
      navigation.replace('Home');
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
            Cole abaixo o texto do seu plano de treino (de qualquer formato). A IA irá interpretar e converter para o app.
          </Text>

          <TextInput
            style={s.textArea}
            placeholder={'Exemplo:\nSegunda – Peito e Tríceps\n• Supino Reto: 4x10\n• Crucifixo: 3x12\n...'}
            placeholderTextColor={C.text3}
            multiline
            numberOfLines={12}
            value={planText}
            onChangeText={setPlanText}
            editable={!loading}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[s.importBtn, loading && s.importBtnDisabled]}
            onPress={handleImportText}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.importBtnText}>🤖  Importar Plano</Text>}
          </TouchableOpacity>

          {loading && (
            <Text style={s.loadingHint}>Analisando seu plano… isso pode levar alguns segundos.</Text>
          )}
        </ScrollView>
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
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.border,
    borderRadius: 14, padding: 14, color: C.text1, fontSize: 14,
    minHeight: 200, marginBottom: 16,
  },

  importBtn: {
    backgroundColor: C.primary, borderRadius: 14, padding: 16, alignItems: 'center',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  importBtnDisabled: { opacity: 0.5 },
  importBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },

  loadingHint: { color: C.text3, fontSize: 13, textAlign: 'center', marginTop: 12 },

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
});
