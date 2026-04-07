import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types';
import { usePlan } from '../hooks/usePlan';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
};

const GOAL_LABELS: Record<string, string> = {
  lose_weight: '🔥 Perda de Peso',
  gain_muscle: '💪 Ganho de Massa',
  improve_endurance: '🏃 Resistência',
  increase_strength: '🏋️ Força',
  general_fitness: '⚡ Condicionamento',
};

const MONTH_COLORS = [
  '#6c47ff', '#7c3aed', '#8b5cf6', '#9333ea',
  '#a855f7', '#c026d3', '#db2777', '#e11d48',
  '#ea580c', '#d97706', '#65a30d', '#0891b2',
];

export function HomeScreen({ navigation }: Props) {
  const { plan, loadStoredPlan, clearPlan } = usePlan();

  useEffect(() => {
    loadStoredPlan();
  }, []);

  const handleClearPlan = () => {
    Alert.alert(
      'Criar Novo Plano',
      'Tem certeza? Seu plano atual será perdido.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          style: 'destructive',
          onPress: async () => {
            await clearPlan();
            navigation.replace('Onboarding');
          },
        },
      ]
    );
  };

  if (!plan) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📋</Text>
        <Text style={styles.emptyText}>Nenhum plano encontrado</Text>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => navigation.replace('Onboarding')}
        >
          <Text style={styles.createBtnText}>Criar Plano</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const currentMonth = new Date().getMonth();
  const profile = plan.userProfile;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Olá, {profile.name}! 👋</Text>
          <Text style={styles.subGreeting}>Seu plano anual está pronto</Text>
        </View>
        <TouchableOpacity onPress={handleClearPlan} style={styles.newPlanBtn}>
          <Text style={styles.newPlanText}>Novo Plano</Text>
        </TouchableOpacity>
      </View>

      {/* Goal Card */}
      <View style={styles.goalCard}>
        <Text style={styles.goalLabel}>Objetivo</Text>
        <Text style={styles.goalValue}>{GOAL_LABELS[profile.goal]}</Text>
        <Text style={styles.goalDesc}>{plan.overallGoal}</Text>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{profile.daysPerWeek}x</Text>
          <Text style={styles.statLabel}>por semana</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>12</Text>
          <Text style={styles.statLabel}>meses</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{profile.daysPerWeek * 4 * 12}</Text>
          <Text style={styles.statLabel}>treinos</Text>
        </View>
      </View>

      {/* Monthly Plan */}
      <Text style={styles.sectionTitle}>📅 Plano Mensal</Text>
      {plan.monthlyBlocks.map((month, idx) => (
        <TouchableOpacity
          key={idx}
          style={[
            styles.monthCard,
            idx === currentMonth && styles.monthCardCurrent,
          ]}
          onPress={() => navigation.navigate('MonthDetail', { monthIndex: idx })}
        >
          <View style={[styles.monthBadge, { backgroundColor: MONTH_COLORS[idx] }]}>
            <Text style={styles.monthNumber}>{month.month}</Text>
          </View>
          <View style={styles.monthInfo}>
            <Text style={styles.monthName}>{month.monthName}</Text>
            <Text style={styles.monthFocus}>{month.focus}</Text>
            <Text style={styles.monthDesc} numberOfLines={1}>
              {month.description}
            </Text>
          </View>
          {idx === currentMonth && (
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>Atual</Text>
            </View>
          )}
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      ))}

      {/* Tips */}
      <Text style={styles.sectionTitle}>🥗 Dicas de Nutrição</Text>
      <View style={styles.tipsCard}>
        {plan.nutritionTips.map((tip, i) => (
          <View key={i} style={styles.tipRow}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>😴 Recuperação</Text>
      <View style={styles.tipsCard}>
        {plan.recoveryTips.map((tip, i) => (
          <View key={i} style={styles.tipRow}>
            <Text style={styles.tipBullet}>•</Text>
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f14' },
  content: { padding: 20, paddingBottom: 40 },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#0f0f14',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  emptyIcon: { fontSize: 60 },
  emptyText: { color: '#888', fontSize: 18 },
  createBtn: {
    backgroundColor: '#6c47ff',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  createBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 10,
  },
  greeting: { fontSize: 22, fontWeight: '800', color: '#fff' },
  subGreeting: { color: '#888', fontSize: 13, marginTop: 2 },
  newPlanBtn: {
    backgroundColor: '#1a1a24',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  newPlanText: { color: '#aaa', fontSize: 13 },
  goalCard: {
    backgroundColor: '#1a0f3a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#6c47ff44',
  },
  goalLabel: { color: '#a78bfa', fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  goalValue: { color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 4 },
  goalDesc: { color: '#888', fontSize: 14, marginTop: 8, lineHeight: 20 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1,
    backgroundColor: '#1a1a24',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  statValue: { color: '#6c47ff', fontSize: 26, fontWeight: '900' },
  statLabel: { color: '#666', fontSize: 12, marginTop: 2 },
  sectionTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 8,
  },
  monthCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a24',
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  monthCardCurrent: {
    borderColor: '#6c47ff',
    backgroundColor: '#1a0f3a',
  },
  monthBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  monthNumber: { color: '#fff', fontWeight: '800', fontSize: 16 },
  monthInfo: { flex: 1 },
  monthName: { color: '#fff', fontWeight: '700', fontSize: 15 },
  monthFocus: { color: '#a78bfa', fontSize: 12, marginTop: 2 },
  monthDesc: { color: '#666', fontSize: 12, marginTop: 2 },
  currentBadge: {
    backgroundColor: '#6c47ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginRight: 8,
  },
  currentBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  arrow: { color: '#444', fontSize: 22 },
  tipsCard: {
    backgroundColor: '#1a1a24',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a3a',
    gap: 10,
  },
  tipRow: { flexDirection: 'row', gap: 8 },
  tipBullet: { color: '#6c47ff', fontSize: 16, marginTop: 1 },
  tipText: { color: '#bbb', fontSize: 14, lineHeight: 20, flex: 1 },
});
