import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { setRuntimeApiKey, setProvider, setGeminiApiKey } from '../services/aiService';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Settings'> };

const C = {
  bg: '#07070F', surface: '#0F0F1A', elevated: '#161625', border: '#1E1E30',
  primary: '#7C3AED', primaryLight: '#A78BFA', primaryGlow: 'rgba(124,58,237,0.15)',
  success: '#10B981', successBg: 'rgba(16,185,129,0.1)',
  text1: '#F1F5F9', text2: '#94A3B8', text3: '#475569',
};

const CUSTOM_KEY_STORAGE = '@gymapp_custom_apikey';
const PROVIDER_STORAGE = '@gymapp_provider';
const GEMINI_KEY_STORAGE = '@gymapp_gemini_apikey';

type ProviderType = 'groq' | 'gemini';

export function SettingsScreen({ navigation }: Props) {
  const [keyInput, setKeyInput] = useState('');
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [activeProvider, setActiveProvider] = useState<ProviderType>('gemini');
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [savedGeminiKey, setSavedGeminiKey] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    AsyncStorage.getItem(CUSTOM_KEY_STORAGE).then((stored) => {
      if (stored) { setSavedKey(stored); setKeyInput(stored); setRuntimeApiKey(stored); }
    });
    AsyncStorage.getItem(PROVIDER_STORAGE).then((stored) => {
      if (stored === 'groq' || stored === 'gemini') {
        setActiveProvider(stored);
        setProvider(stored);
      }
    });
    AsyncStorage.getItem(GEMINI_KEY_STORAGE).then((stored) => {
      if (stored) { setSavedGeminiKey(stored); setGeminiKeyInput(stored); setGeminiApiKey(stored); }
    });
  }, []);

  const handleProviderSelect = async (p: ProviderType) => {
    setActiveProvider(p);
    setProvider(p);
    await AsyncStorage.setItem(PROVIDER_STORAGE, p);
  };

  const handleSave = async () => {
    const trimmed = keyInput.trim();
    if (!trimmed) { Alert.alert('Atenção', 'Cole sua API Key do Groq.'); return; }
    await AsyncStorage.setItem(CUSTOM_KEY_STORAGE, trimmed);
    setSavedKey(trimmed);
    setRuntimeApiKey(trimmed);
    Alert.alert('✅ Salvo!', 'Chave configurada! Volte e gere seu plano.', [
      { text: 'OK', onPress: () => navigation.goBack() }
    ]);
  };

  const handleRemove = async () => {
    await AsyncStorage.removeItem(CUSTOM_KEY_STORAGE);
    setSavedKey(null);
    setKeyInput('');
    setRuntimeApiKey(null);
  };

  const handleSaveGemini = async () => {
    const trimmed = geminiKeyInput.trim();
    if (!trimmed) { Alert.alert('Atenção', 'Cole sua API Key do Gemini.'); return; }
    await AsyncStorage.setItem(GEMINI_KEY_STORAGE, trimmed);
    setSavedGeminiKey(trimmed);
    setGeminiApiKey(trimmed);
    Alert.alert('✅ Salvo!', 'Chave Gemini configurada! Volte e gere seu plano.', [
      { text: 'OK', onPress: () => navigation.goBack() }
    ]);
  };

  const handleRemoveGemini = async () => {
    await AsyncStorage.removeItem(GEMINI_KEY_STORAGE);
    setSavedGeminiKey(null);
    setGeminiKeyInput('');
    setGeminiApiKey(null);
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={[s.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]} showsVerticalScrollIndicator={false}>

      {/* ── Hero ── */}
      <View style={s.hero}>
        <View style={s.heroIconWrap}>
          <Text style={s.heroIcon}>⚡</Text>
        </View>
        <Text style={s.heroTitle}>Configurações de IA</Text>
        <Text style={s.heroDesc}>
          Escolha o provedor de IA e configure sua chave de API.
        </Text>
      </View>

      {/* ── Provider selector ── */}
      <View style={s.card}>
        <Text style={s.cardTitle}>Provedor de IA</Text>
        <View style={s.providerRow}>
          <TouchableOpacity
            style={[s.providerBtn, activeProvider === 'groq' && s.providerBtnActive]}
            onPress={() => handleProviderSelect('groq')}
            testID="btn-provider-groq"
            activeOpacity={0.85}
          >
            <Text style={[s.providerBtnText, activeProvider === 'groq' && s.providerBtnTextActive]}>⚡ Groq</Text>
            <Text style={[s.providerBtnSub, activeProvider === 'groq' && s.providerBtnSubActive]}>Llama 3.3 · Rápido</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.providerBtn, activeProvider === 'gemini' && s.providerBtnActive]}
            onPress={() => handleProviderSelect('gemini')}
            testID="btn-provider-gemini"
            activeOpacity={0.85}
          >
            <Text style={[s.providerBtnText, activeProvider === 'gemini' && s.providerBtnTextActive]}>✨ Gemini</Text>
            <Text style={[s.providerBtnSub, activeProvider === 'gemini' && s.providerBtnSubActive]}>Flash 2.0 · Google</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Status card ── */}
      <View style={s.whyCard}>
        {[
          { icon: '✅', label: 'Pronto', desc: 'Chave já configurada' },
          { icon: '⚡', label: 'Rápido', desc: 'Respostas em segundos' },
          { icon: '🧠', label: activeProvider === 'gemini' ? 'Gemini' : 'Llama 3.3', desc: 'Modelo de alta qualidade' },
        ].map((item, i) => (
          <View key={i} style={s.whyItem}>
            <Text style={s.whyEmoji}>{item.icon}</Text>
            <Text style={s.whyLabel}>{item.label}</Text>
            <Text style={s.whyDesc}>{item.desc}</Text>
          </View>
        ))}
      </View>

      {/* ── Groq section ── */}
      {activeProvider === 'groq' && (
        <>
          <View style={s.card}>
            <Text style={s.cardTitle}>Usar sua própria chave Groq (opcional)</Text>
            <Text style={[s.stepText, { marginBottom: 12 }]}>
              Quer usar sua conta pessoal Groq? Obtenha uma chave gratuita em console.groq.com e cole abaixo.
            </Text>
            <TouchableOpacity
              style={s.openBtn}
              onPress={() => Linking.openURL('https://console.groq.com/keys')}
              testID="btn-open-groq"
              activeOpacity={0.85}
            >
              <Text style={s.openBtnText}>Abrir console.groq.com →</Text>
            </TouchableOpacity>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Sua API Key Groq</Text>

            {savedKey && (
              <View style={s.savedBadge}>
                <Text style={s.savedIcon}>✓</Text>
                <Text style={s.savedText}>Chave configurada e ativa</Text>
              </View>
            )}

            <Text style={s.inputLabel}>Cole sua chave Groq abaixo:</Text>
            <TextInput
              style={s.input}
              placeholder="gsk_xxxxxxxxxxxx..."
              value={keyInput}
              onChangeText={setKeyInput}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor={C.text3}
              testID="input-apikey"
            />

            <TouchableOpacity style={s.saveBtn} onPress={handleSave} testID="btn-save-key" activeOpacity={0.85}>
              <Text style={s.saveBtnText}>💾  Salvar e Continuar</Text>
            </TouchableOpacity>

            {savedKey && (
              <TouchableOpacity style={s.removeBtn} onPress={handleRemove} testID="btn-remove-key">
                <Text style={s.removeBtnText}>Remover chave</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}

      {/* ── Gemini section ── */}
      {activeProvider === 'gemini' && (
        <>
          <View style={s.card}>
            <Text style={s.cardTitle}>Configurar chave Gemini</Text>
            <Text style={[s.stepText, { marginBottom: 12 }]}>
              Obtenha uma chave gratuita no Google AI Studio e cole abaixo.
            </Text>
            <TouchableOpacity
              style={s.openBtn}
              onPress={() => Linking.openURL('https://aistudio.google.com/app/apikey')}
              testID="btn-open-gemini"
              activeOpacity={0.85}
            >
              <Text style={s.openBtnText}>Abrir Google AI Studio →</Text>
            </TouchableOpacity>
          </View>

          <View style={s.card}>
            <Text style={s.cardTitle}>Sua API Key Gemini</Text>

            {savedGeminiKey && (
              <View style={s.savedBadge}>
                <Text style={s.savedIcon}>✓</Text>
                <Text style={s.savedText}>Chave Gemini configurada e ativa</Text>
              </View>
            )}

            <Text style={s.inputLabel}>Cole sua chave Gemini abaixo:</Text>
            <TextInput
              style={s.input}
              placeholder="AIzaXXXXXXXXXXXXXXXX..."
              value={geminiKeyInput}
              onChangeText={setGeminiKeyInput}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor={C.text3}
              testID="input-gemini-apikey"
            />

            <TouchableOpacity style={s.saveBtn} onPress={handleSaveGemini} testID="btn-save-gemini-key" activeOpacity={0.85}>
              <Text style={s.saveBtnText}>💾  Salvar e Continuar</Text>
            </TouchableOpacity>

            {savedGeminiKey && (
              <TouchableOpacity style={s.removeBtn} onPress={handleRemoveGemini} testID="btn-remove-gemini-key">
                <Text style={s.removeBtnText}>Remover chave</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}

      {/* ── Token info ── */}
      <View style={s.tokenCard}>
        <Text style={s.tokenTitle}>📊 Uso eficiente de tokens</Text>
        <Text style={s.tokenText}>
          Este app foi otimizado para usar o mínimo de tokens possível:{'\n'}
          • Geração do plano: ~600 tokens{'\n'}
          • Treinos por mês: ~700 tokens{'\n'}
          • Chat: ~512 tokens por resposta{'\n\n'}
          {activeProvider === 'groq'
            ? 'O plano free do Groq oferece 14.400 requisições/dia — mais do que suficiente!'
            : 'O plano free do Gemini oferece generosas cotas diárias — mais do que suficiente!'}
        </Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 50 },

  hero: {
    backgroundColor: C.surface, borderRadius: 20, padding: 24, marginBottom: 14,
    alignItems: 'center', borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)',
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2, shadowRadius: 16, elevation: 6,
  },
  heroIconWrap: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: C.primaryGlow,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(124,58,237,0.3)',
  },
  heroIcon: { fontSize: 32 },
  heroTitle: { color: C.text1, fontSize: 22, fontWeight: '800', marginBottom: 8 },
  heroDesc: { color: C.text2, fontSize: 14, lineHeight: 22, textAlign: 'center' },

  whyCard: {
    backgroundColor: C.surface, borderRadius: 16, padding: 20, marginBottom: 14,
    flexDirection: 'row', borderWidth: 1, borderColor: C.border,
  },
  whyItem: { flex: 1, alignItems: 'center', gap: 4 },
  whyEmoji: { fontSize: 28 },
  whyLabel: { color: C.text1, fontSize: 13, fontWeight: '700' },
  whyDesc: { color: C.text3, fontSize: 11, textAlign: 'center' },

  card: { backgroundColor: C.surface, borderRadius: 16, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: C.border },
  cardTitle: { color: C.text1, fontSize: 15, fontWeight: '700', marginBottom: 16 },

  providerRow: { flexDirection: 'row', gap: 10 },
  providerBtn: {
    flex: 1, borderRadius: 12, padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: C.border, backgroundColor: C.elevated,
  },
  providerBtnActive: { borderColor: C.primary, backgroundColor: C.primaryGlow },
  providerBtnText: { color: C.text2, fontSize: 15, fontWeight: '700' },
  providerBtnTextActive: { color: C.primaryLight },
  providerBtnSub: { color: C.text3, fontSize: 11, marginTop: 3 },
  providerBtnSubActive: { color: C.primaryLight },

  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  stepNumWrap: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  stepNum: { color: '#fff', fontSize: 11, fontWeight: '800' },
  stepIcon: { fontSize: 16, marginTop: 1 },
  stepText: { color: C.text2, fontSize: 14, lineHeight: 22, flex: 1 },
  openBtn: { backgroundColor: C.primary, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 4 },
  openBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  savedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.successBg, borderRadius: 10, padding: 12, marginBottom: 14,
    borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)',
  },
  savedIcon: { color: C.success, fontSize: 16, fontWeight: '800' },
  savedText: { color: C.success, fontSize: 13, fontWeight: '600' },

  inputLabel: { color: C.text3, fontSize: 12, fontWeight: '600', marginBottom: 8 },
  input: {
    backgroundColor: '#0A0A14', borderWidth: 1, borderColor: C.border,
    borderRadius: 12, padding: 14, color: C.text1, fontSize: 15, marginBottom: 12,
  },
  saveBtn: {
    backgroundColor: C.primary, borderRadius: 12, padding: 15, alignItems: 'center', marginBottom: 8,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6,
  },
  saveBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  removeBtn: { borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  removeBtnText: { color: C.text3, fontSize: 14 },

  tokenCard: { backgroundColor: C.surface, borderRadius: 14, padding: 18, borderWidth: 1, borderColor: C.border },
  tokenTitle: { color: C.text1, fontSize: 14, fontWeight: '700', marginBottom: 10 },
  tokenText: { color: C.text2, fontSize: 13, lineHeight: 22 },
});
