import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../types';
import { usePlan } from '../hooks/usePlan';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'MonthDetail'>;
  route: RouteProp<RootStackParamList, 'MonthDetail'>;
};

export function MonthDetailScreen({ navigation, route }: Props) {
  const { monthIndex } = route.params;
  const { plan, loadStoredPlan } = usePlan();

  useEffect(() => {
    loadStoredPlan();
  }, []);

  if (!plan) return null;

  const month = plan.monthlyBlocks[monthIndex];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Month Header */}
      <View style={styles.header}>
        <Text style={styles.monthNumber}>Mês {month.month}</Text>
        <Text style={styles.monthName}>{month.monthName}</Text>
        <View style={styles.focusBadge}>
          <Text style={styles.focusText}>{month.focus}</Text>
        </View>
        <Text style={styles.description}>{month.description}</Text>
      </View>

      {/* Progress Indicators */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🎯 Metas do Mês</Text>
        {month.progressIndicators.map((indicator, i) => (
          <View key={i} style={styles.indicatorRow}>
            <View style={styles.indicatorDot} />
            <Text style={styles.indicatorText}>{indicator}</Text>
          </View>
        ))}
      </View>

      {/* Weeks */}
      <Text style={styles.sectionTitle}>Semanas</Text>
      {month.weeks.map((week, weekIdx) => (
        <TouchableOpacity
          key={weekIdx}
          style={styles.weekCard}
          onPress={() =>
            navigation.navigate('WeekDetail', {
              monthIndex,
              weekIndex: weekIdx,
            })
          }
        >
          <View style={styles.weekHeader}>
            <View style={styles.weekBadge}>
              <Text style={styles.weekBadgeText}>{week.week}</Text>
            </View>
            <View style={styles.weekInfo}>
              <Text style={styles.weekTitle}>Semana {week.week}</Text>
              <Text style={styles.weekTheme}>{week.theme}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </View>

          <View style={styles.weekGoals}>
            {week.weeklyGoals.slice(0, 2).map((goal, i) => (
              <View key={i} style={styles.goalChip}>
                <Text style={styles.goalChipText} numberOfLines={1}>
                  {goal}
                </Text>
              </View>
            ))}
          </View>

          <View style={styles.daysPreview}>
            {week.days.map((day, i) => (
              <View key={i} style={styles.dayChip}>
                <Text style={styles.dayChipText}>{day.dayOfWeek.slice(0, 3)}</Text>
              </View>
            ))}
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f14' },
  content: { padding: 20, paddingBottom: 40 },
  header: {
    backgroundColor: '#1a0f3a',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#6c47ff44',
    alignItems: 'center',
  },
  monthNumber: { color: '#a78bfa', fontSize: 13, fontWeight: '600', letterSpacing: 1 },
  monthName: { color: '#fff', fontSize: 32, fontWeight: '900', marginTop: 4 },
  focusBadge: {
    backgroundColor: '#6c47ff',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 12,
    marginBottom: 12,
  },
  focusText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  description: { color: '#bbb', textAlign: 'center', lineHeight: 22 },
  card: {
    backgroundColor: '#1a1a24',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  cardTitle: { color: '#fff', fontWeight: '700', fontSize: 15, marginBottom: 14 },
  indicatorRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 10 },
  indicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6c47ff',
    marginTop: 5,
  },
  indicatorText: { color: '#bbb', flex: 1, lineHeight: 20 },
  sectionTitle: { color: '#fff', fontSize: 17, fontWeight: '700', marginBottom: 12 },
  weekCard: {
    backgroundColor: '#1a1a24',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a3a',
  },
  weekHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  weekBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#6c47ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  weekBadgeText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  weekInfo: { flex: 1 },
  weekTitle: { color: '#fff', fontWeight: '700', fontSize: 15 },
  weekTheme: { color: '#a78bfa', fontSize: 13, marginTop: 2 },
  arrow: { color: '#444', fontSize: 22 },
  weekGoals: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  goalChip: {
    backgroundColor: '#1a0f3a',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#6c47ff44',
    maxWidth: '48%',
  },
  goalChipText: { color: '#a78bfa', fontSize: 12 },
  daysPreview: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  dayChip: {
    backgroundColor: '#0f0f14',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  dayChipText: { color: '#888', fontSize: 12 },
});
