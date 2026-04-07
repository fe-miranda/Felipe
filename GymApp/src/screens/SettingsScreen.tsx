import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { setRuntimeApiKey } from '../services/aiService';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Settings'>;
};

const CUSTOM_KEY_STORAGE = '@gymapp_custom_apikey';

export function SettingsScreen({ navigation }: Props) {
  const [keyInput, setKeyInput] = useState('');
  const [savedKey, setSavedKey] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(CUSTOM_KEY_STORAGE).then((stored) => {
      if (stored) {
        setSavedKey(stored);
        setKeyInput(stored);
        setRuntimeApiKey(stored);
      }
    });
  }, []);

  const handleSave = async () => {
    const trimmed = keyInput.trim();
    if (!trimmed) {
      Alert.alert('Atenção', 'Cole sua API Key do Groq.');
      return;
    }
    await AsyncStorage.setItem(CUSTOM_KEY_STORAGE, trimmed);
    setSavedKey(trimmed);
    setRuntimeApiKey(trimmed);
    Alert.alert('Salvo!', 'Sua API Key foi salva. Volte e gere seu plano!');
    navigation.goBack();
  };

  const handleRemove = async () => {
    await AsyncStorage.removeItem(CUSTOM_KEY_STORAGE);
    setSavedKey(null);
    setKeyInput('');
    setRuntimeApiKey(null);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      <View style={styles.heroCard}>
        <Text style={styles.heroIcon}>🔑</Text>
        <Text style={styles.heroTitle}>Configure sua chave gratuita</Text>
        <Text style={styles.heroDesc}>
          O app usa a API do Groq — 100% gratuita, sem cartão de crédito.{'\n'}
          Crie sua chave em menos de 1 minuto.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Como obter sua chave grátis</Text>
        <View style={styles.steps}>
          {[
            'Abra o site console.groq.com',
            'Crie uma conta gratuita (ou entre com Google)',
            'Clique em "API Keys" no menu lateral',
            'Clique em "Create API Key", dê um nome e copie',
            'Cole a chave no campo abaixo e salve',
          ].map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity
          style={styles.openBtn}
          onPress={() => Linking.openURL('https://console.groq.com/keys')}
          testID="btn-open-groq"
        >
          <Text style={styles.openBtnText}>Abrir console.groq.com →</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sua API Key</Text>

        {savedKey && (
          <View style={styles.savedBadge}>
            <Text style={styles.savedText}>✓ Chave configurada</Text>
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder="gsk_..."
          value={keyInput}
          onChangeText={setKeyInput}
          secureTextEntry
          autoCapitalize="none"
          placeholderTextColor="#555"
          testID="input-apikey"
        />

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} testID="btn-save-key">
          <Text style={styles.saveBtnText}>Salvar e continuar</Text>
        </TouchableOpacity>

        {savedKey && (
          <TouchableOpacity style={styles.removeBtn} onPress={handleRemove} testID="btn-remove-key">
            <Text style={styles.removeBtnText}>Remover chave</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Por que Groq?</Text>
        <Text style={styles.infoText}>
          • 100% gratuito, sem cartão de crédito{'\n'}
          • Modelo Llama 3.3 70B (alta qualidade){'\n'}
          • Muito rápido — plano gerado em segundos{'\n'}
          • 14.400 requisições por dia no plano free
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f14' },
  content: { padding: 20, paddingBottom: 40 },
  heroCard: {
    backgroundColor: '#1a0f3a',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#6c47ff44',
    alignItems: 'center',
  },
  heroIcon: { fontSize: 48, marginBottom: 12 },
  heroTitle: { color: '#fff', fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  heroDesc: { color: '#a78bfa', fontSize: 14, lineHeight: 22, textAlign: 'center' },
  section: {
    backgroundColor: '#1a1a24',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 16 },
  steps: { gap: 14, marginBottom: 16 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#6c47ff',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  stepText: { color: '#bbb', fontSize: 14, lineHeight: 22, flex: 1 },
  openBtn: {
    backgroundColor: '#6c47ff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  openBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  savedBadge: {
    backgroundColor: '#0d2b1a',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1a5c35',
  },
  savedText: { color: '#4ade80', fontSize: 13, fontWeight: '600' },
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
  saveBtn: {
    backgroundColor: '#6c47ff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  removeBtn: {
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  removeBtnText: { color: '#666', fontSize: 14 },
  infoCard: {
    backgroundColor: '#1a1a24',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  infoTitle: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 10 },
  infoText: { color: '#888', fontSize: 14, lineHeight: 24 },
});
