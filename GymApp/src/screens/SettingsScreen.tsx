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
      Alert.alert('Atenção', 'Cole sua API Key do Gemini.');
      return;
    }
    await AsyncStorage.setItem(CUSTOM_KEY_STORAGE, trimmed);
    setSavedKey(trimmed);
    setRuntimeApiKey(trimmed);
    Alert.alert('Salvo!', 'Sua API Key foi salva. Ela será usada a partir de agora.');
  };

  const handleRemove = async () => {
    await AsyncStorage.removeItem(CUSTOM_KEY_STORAGE);
    setSavedKey(null);
    setKeyInput('');
    setRuntimeApiKey(null);
    Alert.alert('Removida', 'A chave customizada foi removida. Usando chave padrão do app.');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔑 API Key Gemini (opcional)</Text>
        <Text style={styles.desc}>
          Por padrão o app usa uma chave compartilhada. Se ela estiver com quota esgotada,
          crie a sua gratuitamente em{' '}
          <Text
            style={styles.link}
            onPress={() => Linking.openURL('https://aistudio.google.com/app/apikey')}
          >
            aistudio.google.com
          </Text>{' '}
          e cole abaixo.
        </Text>

        {savedKey && (
          <View style={styles.savedBadge}>
            <Text style={styles.savedText}>✓ Chave personalizada ativa</Text>
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder="AIza..."
          value={keyInput}
          onChangeText={setKeyInput}
          secureTextEntry
          autoCapitalize="none"
          placeholderTextColor="#555"
          testID="input-apikey"
        />

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} testID="btn-save-key">
          <Text style={styles.saveBtnText}>Salvar minha chave</Text>
        </TouchableOpacity>

        {savedKey && (
          <TouchableOpacity style={styles.removeBtn} onPress={handleRemove} testID="btn-remove-key">
            <Text style={styles.removeBtnText}>Remover e usar chave padrão</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ℹ️ Como obter sua chave gratuita</Text>
        <View style={styles.steps}>
          {[
            'Acesse aistudio.google.com',
            'Faça login com sua conta Google',
            'Clique em "Get API key" → "Create API key"',
            'Copie a chave gerada e cole no campo acima',
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
          onPress={() => Linking.openURL('https://aistudio.google.com/app/apikey')}
        >
          <Text style={styles.openBtnText}>Abrir AI Studio →</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f14' },
  content: { padding: 20, paddingBottom: 40 },
  section: {
    backgroundColor: '#1a1a24',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 12 },
  desc: { color: '#888', fontSize: 14, lineHeight: 22, marginBottom: 16 },
  link: { color: '#6c47ff', textDecorationLine: 'underline' },
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
    borderColor: '#444',
  },
  removeBtnText: { color: '#888', fontSize: 14 },
  steps: { gap: 12, marginBottom: 16 },
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
    backgroundColor: '#1a0f3a',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#6c47ff',
  },
  openBtnText: { color: '#a78bfa', fontWeight: '700', fontSize: 15 },
});
