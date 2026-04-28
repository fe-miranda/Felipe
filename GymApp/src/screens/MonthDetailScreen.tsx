import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { usePlan } from '../hooks/usePlan';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'MonthDetail'>;
  route: RouteProp<RootStackParamList, 'MonthDetail'>;
};

const C = {
  bg: '#07070F', surface: '#0F0F1A', elevated: '#161625', border: '#1E1E30',
  primary: '#7C3AED', primaryLight: '#A78BFA', primaryGlow: 'rgba(124,58,237,0.15)',
  success: '#10B981', text1: '#F1F5F9', text2: '#94A3B8', text3: '#475569',
};

const PHASE_META = (monthIdx: number) => {
  if (monthIdx < 3)  return { color: '#10B981', icon: '🌱', label: 'Fase Base' };
  if (monthIdx < 6)  return { color: '#3B82F6', icon: '📈', label: 'Fase Evolução' };
  if (monthIdx < 9)  return { color: '#F59E0B', icon: '🔥', label: 'Fase Intensidade' };
  return               { color: '#EF4444', icon: '🏆', label: 'Fase Pico' };
};

const WEEK_THEMES = ['Base', 'Volume', 'Intensidade', 'Recuperação'];
const WEEK_ICONS  = ['🎯', '📈', '⚡', '🌿'];

export function MonthDetailScreen({ navigation, route }: Props) {
  const { monthIndex } = route.params;
  const { plan, loadStoredPlan, generateMonth } = usePlan();
  const [generating, setGenerating] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => { loadStoredPlan(); }, []);

  if (!plan) return null;

  const month = plan.monthlyBlocks[monthIndex];
  if (!month) {
    return (
      <ScrollView style={s.container} contentContainerStyle={[s.content, { justifyContent: 'center', flexGrow: 1 }]}>
        <Text style={[s.sectionTitle, { textAlign: 'center' }]}>Mês não encontrado</Text>
        <TouchableOpacity style={[s.generateBtn, { backgroundColor: C.primary, alignSelf: 'center' }]} onPress={() => navigation.goBack()}>
          <Text style={s.generateBtnText}>Voltar</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }
  const phase = PHASE_META(monthIndex);
  const hasWeeks = month.weeks && month.weeks.length > 0;

  const handleGenerateWeeks = async () => {
    setGenerating(true);
    try {
      await generateMonth(monthIndex);
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Não foi possível gerar os treinos. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 16 }]} showsVerticalScrollIndicator={false}>

      {/* ── Phase badge ── */}
      <View style={[s.phaseBadge, { borderColor: phase.color }]}>
        <Text style={s.phaseIcon}>{phase.icon}</Text>
        <Text style={[s.phaseLabel, { color: phase.color }]}>{phase.label}</Text>
      </View>

      {/* ── Month header ── */}
      <View style={[s.header, { borderColor: `${phase.color}40` }]}>
        <View style={[s.monthNumBadge, { backgroundColor: phase.color }]}>
          <Text style={s.monthNumText}>#{month.month}</Text>
        </View>
        <Text style={s.monthName}>{month.monthName}</Text>
        <View style={[s.focusPill, { backgroundColor: `${phase.color}20` }]}>
          <Text style={[s.focusPillText, { color: phase.color }]}>{month.focus}</Text>
        </View>
        <Text style={s.description}>{month.description}</Text>
      </View>

      {/* ── Goals card ── */}
      <View style={s.card}>
        <Text style={s.cardTitle}>🎯 Metas do Mês</Text>
        {(month.progressIndicators ?? []).map((ind, i) => (
          <View key={i} style={s.indRow}>
            <View style={[s.indDot, { backgroundColor: phase.color }]} />
            <Text style={s.indText}>{ind}</Text>
          </View>
        ))}
      </View>

      {/* ── Weeks section ── */}
      <Text style={s.sectionTitle}>Semanas de Treino</Text>

      {!hasWeeks ? (
        <View style={s.generateCard}>
          <Text style={s.generateEmoji}>{phase.icon}</Text>
          <Text style={s.generateTitle}>Treinos ainda não gerados</Text>
          <Text style={s.generateDesc}>
            Gere os treinos de {month.monthName} com 1 clique. A IA cria os exercícios e o sistema aplica progressão automática nas 4 semanas.
          </Text>

          {generating ? (
            <View style={s.loadingRow}>
              <ActivityIndicator size="large" color={phase.color} />
              <Text style={[s.loadingText, { color: phase.color }]}>
                Gerando treinos de {month.monthName}...
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[s.generateBtn, { backgroundColor: phase.color }]}
              onPress={handleGenerateWeeks}
              testID="btn-generate-weeks"
              activeOpacity={0.85}
            >
              <Text style={s.generateBtnText}>⚡ Gerar Treinos de {month.monthName}</Text>
            </TouchableOpacity>
          )}

          <View style={s.tokenNote}>
            <Text style={s.tokenNoteText}>
              💡 Geração eficiente: apenas 1 requisição IA + expansão automática de 4 semanas progressivas
            </Text>
          </View>
        </View>
      ) : (
        month.weeks.map((week, wi) => (
          <TouchableOpacity
            key={wi}
            style={s.weekCard}
            onPress={() => navigation.navigate('WeekDetail', { monthIndex, weekIndex: wi })}
            activeOpacity={0.8}
          >
            {/* Top accent line */}
            <View style={[s.weekAccent, { backgroundColor: phase.color }]} />

            <View style={s.weekTop}>
              <View style={[s.weekIconWrap, { backgroundColor: `${phase.color}20` }]}>
                <Text style={s.weekIcon}>{WEEK_ICONS[wi] ?? '📅'}</Text>
              </View>
              <View style={s.weekInfo}>
                <Text style={s.weekLabel}>SEMANA {week.week}</Text>
                <Text style={s.weekTheme}>{WEEK_THEMES[wi] ?? week.theme}</Text>
                <Text style={s.weekThemeSub} numberOfLines={1}>{week.theme}</Text>
              </View>
              <View style={s.weekArrowWrap}>
                <Text style={s.weekArrow}>›</Text>
              </View>
            </View>

            <View style={s.weekGoals}>
              {week.weeklyGoals.slice(0, 2).map((g, i) => (
                <View key={i} style={s.goalChip}>
                  <Text style={s.goalChipText} numberOfLines={1}>{g}</Text>
                </View>
              ))}
            </View>

            <View style={s.daysPreview}>
              {week.days.map((day, i) => (
                <View key={i} style={[s.dayChip, { borderColor: `${phase.color}50` }]}>
                  <Text style={[s.dayChipText, { color: phase.color }]}>{day.dayOfWeek.slice(0, 3)}</Text>
                </View>
              ))}
              <Text style={s.exerciseCount}>
                {week.days.reduce((acc, d) => acc + d.exercises.length, 0)} exercícios
              </Text>
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 50 },

  phaseBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, backgroundColor: C.surface, marginBottom: 12 },
  phaseIcon: { fontSize: 14 },
  phaseLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },

  header: {
    backgroundColor: C.surface, borderRadius: 20, padding: 22, marginBottom: 14,
    borderWidth: 1, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  monthNumBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8, marginBottom: 8 },
  monthNumText: { color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  monthName: { color: C.text1, fontSize: 34, fontWeight: '900', marginBottom: 10 },
  focusPill: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginBottom: 10 },
  focusPillText: { fontSize: 13, fontWeight: '700' },
  description: { color: C.text2, textAlign: 'center', lineHeight: 22, fontSize: 14 },

  card: { backgroundColor: C.surface, borderRadius: 16, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: C.border },
  cardTitle: { color: C.text1, fontWeight: '700', fontSize: 15, marginBottom: 14 },
  indRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 10 },
  indDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5, flexShrink: 0 },
  indText: { color: C.text2, flex: 1, lineHeight: 20 },

  sectionTitle: { color: C.text1, fontSize: 17, fontWeight: '700', marginBottom: 12 },

  // Generate CTA
  generateCard: { backgroundColor: C.surface, borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  generateEmoji: { fontSize: 52, marginBottom: 12 },
  generateTitle: { color: C.text1, fontSize: 18, fontWeight: '800', marginBottom: 8 },
  generateDesc: { color: C.text2, fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  loadingRow: { alignItems: 'center', gap: 12, marginBottom: 16 },
  loadingText: { fontWeight: '600', fontSize: 14 },
  generateBtn: { paddingHorizontal: 28, paddingVertical: 15, borderRadius: 14, marginBottom: 16 },
  generateBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  tokenNote: { backgroundColor: C.elevated, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: C.border },
  tokenNoteText: { color: C.text3, fontSize: 12, textAlign: 'center', lineHeight: 18 },

  // Week cards
  weekCard: {
    backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  weekAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  weekTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginTop: 4 },
  weekIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  weekIcon: { fontSize: 22 },
  weekInfo: { flex: 1 },
  weekLabel: { color: C.text3, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  weekTheme: { color: C.text1, fontWeight: '800', fontSize: 15, marginTop: 1 },
  weekThemeSub: { color: C.text2, fontSize: 12, marginTop: 2 },
  weekArrowWrap: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.elevated, alignItems: 'center', justifyContent: 'center' },
  weekArrow: { color: C.text2, fontSize: 18 },
  weekGoals: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  goalChip: { backgroundColor: C.elevated, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, maxWidth: '48%' },
  goalChipText: { color: C.text2, fontSize: 11 },
  daysPreview: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center' },
  dayChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, backgroundColor: C.elevated },
  dayChipText: { fontSize: 11, fontWeight: '700' },
  exerciseCount: { color: C.text3, fontSize: 11, marginLeft: 4 },
});
