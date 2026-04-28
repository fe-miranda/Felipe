import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, ScrollView,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList, AnnualPlan, CompletedWorkout } from '../types';
import { chatAboutPlan, ChatMessage } from '../services/aiService';
import { loadHistory } from '../services/workoutHistoryService';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Chat'> };

const C = {
  bg: '#07070F', surface: '#0F0F1A', elevated: '#161625', border: '#1E1E30',
  primary: '#7C3AED', primaryLight: '#A78BFA', primaryGlow: 'rgba(124,58,237,0.15)',
  userBubble: '#7C3AED', aiBubble: '#0F0F1A',
  text1: '#F1F5F9', text2: '#94A3B8', text3: '#475569',
};

const PLAN_KEY = '@gymapp_plan';

const SUGGESTIONS = [
  { icon: '📊', text: 'Como está meu progresso?' },
  { icon: '🔄', text: 'Sugira variação para hoje' },
  { icon: '🥗', text: 'Dicas de alimentação' },
  { icon: '🩹', text: 'Adaptar por uma dor' },
  { icon: '⚡', text: 'Treino extra esta semana' },
];

function friendlyAiError(err: any): string {
  const msg: string = err?.message || '';
  if (msg.includes('inválida') || msg.includes('expirada') || msg.includes('401') || msg.includes('403'))
    return '🔑 Chave de API inválida ou expirada. Vá em Configurações para atualizar sua chave Groq.';
  if (msg.includes('Limite') || msg.includes('429'))
    return '⏳ Limite de uso atingido. Aguarde alguns minutos ou configure sua própria chave Groq.';
  if (msg.includes('esgotado') || msg.includes('Sem conexão'))
    return '🌐 ' + msg;
  if (msg.includes('indisponível'))
    return '⚠️ ' + msg;
  return `❌ ${msg || 'Erro desconhecido. Tente novamente.'}`;
}

export function ChatScreen({ navigation }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<AnnualPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [workoutHistory, setWorkoutHistory] = useState<CompletedWorkout[]>([]);
  const listRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(PLAN_KEY),
      loadHistory(),
    ]).then(([stored, history]) => {
      if (stored) setPlan(JSON.parse(stored));
      setWorkoutHistory(history);
      setPlanLoading(false);
    });
  }, []);

  const sendMessage = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading || !plan) return;
    setInput('');
    const userMsg: ChatMessage = { role: 'user', text: msg };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setLoading(true);
    try {
      const reply = await chatAboutPlan(msg, plan, messages);
      setMessages([...updated, { role: 'model', text: reply }]);
    } catch (err: any) {
      setMessages([...updated, { role: 'model', text: friendlyAiError(err) }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (messages.length > 0) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[s.msgRow, isUser && s.msgRowUser]}>
        {!isUser && (
          <View style={s.aiAvatar}>
            <Text style={s.aiAvatarText}>🤖</Text>
          </View>
        )}
        <View style={[s.bubble, isUser ? s.bubbleUser : s.bubbleAI]}>
          <Text style={[s.bubbleText, isUser && s.bubbleTextUser]}>{item.text}</Text>
        </View>
      </View>
    );
  };

  if (planLoading) {
    return (
      <View style={s.emptyWrap}>
        <ActivityIndicator color="#7C3AED" size="large" />
        <Text style={s.emptyText}>Carregando plano...</Text>
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={s.emptyWrap}>
        <Text style={s.emptyIcon}>⚠️</Text>
        <Text style={s.emptyText}>Nenhum plano encontrado.</Text>
        <Text style={s.emptyHint}>Crie seu plano personalizado para usar o Coach IA.</Text>
        <TouchableOpacity style={s.ctaBtn} onPress={() => navigation.replace('Onboarding' as any)}>
          <Text style={s.ctaBtnText}>Criar meu plano</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.backLink}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const showWelcome = messages.length === 0;

  return (
    <KeyboardAvoidingView
      style={[s.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* ── Welcome + suggestions ── */}
      {showWelcome && (
        <View style={s.welcomeWrap}>
          <View style={s.welcomeAvatarWrap}>
            <Text style={s.welcomeAvatar}>🤖</Text>
          </View>
          <Text style={s.welcomeTitle}>Coach IA</Text>
          <Text style={s.welcomeDesc}>
            Olá, {plan.userProfile.name}! Sou seu personal trainer virtual. Tire dúvidas, ajuste treinos ou peça exercícios extras.
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.suggestScroll} contentContainerStyle={s.suggestContent}>
            {SUGGESTIONS.map((sug, i) => (
              <TouchableOpacity
                key={i}
                style={s.suggestBtn}
                onPress={() => sendMessage(sug.text)}
                testID={`suggestion-${i}`}
              >
                <Text style={s.suggestIcon}>{sug.icon}</Text>
                <Text style={s.suggestText}>{sug.text}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── Messages ── */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderMessage}
        contentContainerStyle={s.messageList}
        showsVerticalScrollIndicator={false}
        testID="message-list"
      />

      {/* ── Typing indicator ── */}
      {loading && (
        <View style={s.typingRow}>
          <View style={s.aiAvatar}>
            <Text style={s.aiAvatarText}>🤖</Text>
          </View>
          <View style={s.typingBubble}>
            <ActivityIndicator size="small" color={C.primary} />
            <Text style={s.typingText}>Pensando...</Text>
          </View>
        </View>
      )}

      {/* ── Input bar ── */}
      <View style={[s.inputBar, { paddingBottom: 8 }]}>
        <TextInput
          style={s.input}
          placeholder="Pergunte sobre seu treino..."
          placeholderTextColor={C.text3}
          value={input}
          onChangeText={setInput}
          multiline
          maxLength={500}
          testID="chat-input"
        />
        <TouchableOpacity
          style={[s.sendBtn, (!input.trim() || loading) && s.sendBtnOff]}
          onPress={() => sendMessage()}
          disabled={!input.trim() || loading}
          testID="btn-send"
        >
          <Text style={s.sendIcon}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  emptyWrap: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
  emptyIcon: { fontSize: 48 },
  emptyText: { color: C.text2, fontSize: 16, textAlign: 'center' },
  emptyHint: { color: C.text3, fontSize: 13, textAlign: 'center' },
  ctaBtn: { backgroundColor: C.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 12, marginTop: 4 },
  ctaBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  backLink: { color: C.primary, fontSize: 15, fontWeight: '600' },

  welcomeWrap: { padding: 20, paddingBottom: 0, alignItems: 'center' },
  welcomeAvatarWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: C.primaryGlow, alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 2, borderColor: 'rgba(124,58,237,0.3)',
  },
  welcomeAvatar: { fontSize: 32 },
  welcomeTitle: { color: C.text1, fontSize: 18, fontWeight: '800', marginBottom: 6 },
  welcomeDesc: { color: C.text2, fontSize: 14, lineHeight: 20, textAlign: 'center', marginBottom: 18 },
  suggestScroll: { marginBottom: 8 },
  suggestContent: { gap: 8, paddingHorizontal: 2 },
  suggestBtn: {
    backgroundColor: C.surface, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: C.border, alignItems: 'center', minWidth: 120, gap: 4,
  },
  suggestIcon: { fontSize: 18 },
  suggestText: { color: C.primaryLight, fontSize: 12, textAlign: 'center' },

  messageList: { padding: 16, paddingBottom: 8 },
  msgRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end' },
  msgRowUser: { justifyContent: 'flex-end' },
  aiAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: C.primaryGlow, alignItems: 'center', justifyContent: 'center',
    marginRight: 8, flexShrink: 0,
  },
  aiAvatarText: { fontSize: 18 },
  bubble: { maxWidth: '78%', borderRadius: 18, padding: 13 },
  bubbleAI: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderBottomLeftRadius: 4 },
  bubbleUser: { backgroundColor: C.primary, borderBottomRightRadius: 4 },
  bubbleText: { color: C.text2, fontSize: 15, lineHeight: 22 },
  bubbleTextUser: { color: '#fff' },

  typingRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8 },
  typingBubble: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.surface, borderRadius: 18, borderBottomLeftRadius: 4,
    padding: 12, gap: 8,
    borderWidth: 1, borderColor: C.border,
  },
  typingText: { color: C.text3, fontSize: 13 },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    padding: 12, paddingTop: 8,
    borderTopWidth: 1, borderTopColor: C.surface, gap: 8,
  },
  input: {
    flex: 1, backgroundColor: C.surface,
    borderRadius: 22, paddingHorizontal: 16, paddingVertical: 11,
    color: C.text1, fontSize: 15, maxHeight: 100,
    borderWidth: 1, borderColor: C.border,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnOff: { backgroundColor: '#2D1F6E', opacity: 0.5 },
  sendIcon: { color: '#fff', fontSize: 16 },
});
