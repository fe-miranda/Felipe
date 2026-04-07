import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, AnnualPlan } from '../types';
import { chatAboutPlan, ChatMessage } from '../services/aiService';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Chat'>;
};

const PLAN_KEY = '@gymapp_plan';
const APIKEY_KEY = '@gymapp_apikey';

const QUICK_SUGGESTIONS = [
  'Como está meu progresso?',
  'Sugira uma variação para o treino de hoje',
  'Dicas de alimentação para meu objetivo',
  'Preciso adaptar o treino por uma dor',
  'Gere um treino extra para esta semana',
];

export function ChatScreen({ navigation }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<AnnualPlan | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    (async () => {
      const [storedPlan, storedKey] = await Promise.all([
        AsyncStorage.getItem(PLAN_KEY),
        AsyncStorage.getItem(APIKEY_KEY),
      ]);
      if (storedPlan) setPlan(JSON.parse(storedPlan));
      if (storedKey) setApiKey(storedKey);
    })();
  }, []);

  const sendMessage = async (text?: string) => {
    const messageText = (text || input).trim();
    if (!messageText || loading) return;
    if (!plan || !apiKey) return;

    setInput('');
    const userMsg: ChatMessage = { role: 'user', text: messageText };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    try {
      const reply = await chatAboutPlan(messageText, plan, messages, apiKey);
      setMessages([...newMessages, { role: 'model', text: reply }]);
    } catch (err: any) {
      setMessages([
        ...newMessages,
        { role: 'model', text: `Erro: ${err.message || 'Tente novamente.'}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
        {!isUser && (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>AI</Text>
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
          <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  if (!plan || !apiKey) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>Nenhum plano encontrado.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={90}
    >
      {messages.length === 0 && (
        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeTitle}>Olá, {plan.userProfile.name}! 👋</Text>
          <Text style={styles.welcomeSubtitle}>
            Pergunte qualquer coisa sobre seu treino, nutrição ou peça ajustes no plano.
          </Text>
          <View style={styles.suggestions}>
            {QUICK_SUGGESTIONS.map((s, i) => (
              <TouchableOpacity
                key={i}
                style={styles.suggestionBtn}
                onPress={() => sendMessage(s)}
              >
                <Text style={styles.suggestionText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
      />

      {loading && (
        <View style={styles.typingRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>AI</Text>
          </View>
          <View style={styles.typingBubble}>
            <ActivityIndicator size="small" color="#6c47ff" />
            <Text style={styles.typingText}>Digitando...</Text>
          </View>
        </View>
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Pergunte sobre seu treino..."
          placeholderTextColor="#555"
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={() => sendMessage()}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={() => sendMessage()}
          disabled={!input.trim() || loading}
        >
          <Text style={styles.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f14' },
  errorContainer: {
    flex: 1,
    backgroundColor: '#0f0f14',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  errorIcon: { fontSize: 48 },
  errorText: { color: '#888', fontSize: 16 },
  backLink: { color: '#6c47ff', fontSize: 15, fontWeight: '600' },
  welcomeContainer: { padding: 20, paddingBottom: 0 },
  welcomeTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 6 },
  welcomeSubtitle: { color: '#888', fontSize: 14, lineHeight: 20, marginBottom: 16 },
  suggestions: { gap: 8 },
  suggestionBtn: {
    backgroundColor: '#1a1a24',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  suggestionText: { color: '#a78bfa', fontSize: 14 },
  messageList: { padding: 16, paddingBottom: 8 },
  msgRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  msgRowUser: { justifyContent: 'flex-end' },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6c47ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    flexShrink: 0,
  },
  avatarText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  bubble: {
    maxWidth: '78%',
    borderRadius: 16,
    padding: 12,
  },
  bubbleAI: {
    backgroundColor: '#1a1a24',
    borderWidth: 1,
    borderColor: '#2a2a3a',
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: '#6c47ff',
    borderBottomRightRadius: 4,
  },
  bubbleText: { color: '#ddd', fontSize: 15, lineHeight: 22 },
  bubbleTextUser: { color: '#fff' },
  typingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a24',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  typingText: { color: '#666', fontSize: 13 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1a1a24',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#1a1a24',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 15,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6c47ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#3d2b99', opacity: 0.5 },
  sendIcon: { color: '#fff', fontSize: 16 },
});
