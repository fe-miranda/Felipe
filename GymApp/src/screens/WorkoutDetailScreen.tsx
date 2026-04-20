import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Exercise, RootStackParamList } from '../types';
import { usePlan } from '../hooks/usePlan';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'WorkoutDetail'>;
  route: RouteProp<RootStackParamList, 'WorkoutDetail'>;
};

const C = {
  bg: '#07070F', surface: '#0F0F1A', elevated: '#161625', border: '#1E1E30',
  primary: '#7C3AED', primaryLight: '#A78BFA',
  text1: '#F1F5F9', text2: '#94A3B8', text3: '#475569',
};

const PHASE_COLOR = (mi: number) => {
  if (mi < 3) return '#10B981';
  if (mi < 6) return '#3B82F6';
  if (mi < 9) return '#F59E0B';
  return '#EF4444';
};

export function WorkoutDetailScreen({ navigation, route }: Props) {
  const { monthIndex, weekIndex, dayIndex } = route.params;
  const { plan, loadStoredPlan } = usePlan();
  const insets = useSafeAreaInsets();
  const [editableExercises, setEditableExercises] = useState<Exercise[]>([]);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editSets, setEditSets] = useState('');
  const [editReps, setEditReps] = useState('');
  const [editRest, setEditRest] = useState('');
  const [editNotes, setEditNotes] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSets, setNewSets] = useState('3');
  const [newReps, setNewReps] = useState('10-12');
  const [newRest, setNewRest] = useState('90s');
  const [newNotes, setNewNotes] = useState('');

  const [planLoading, setPlanLoading] = useState(true);

  useEffect(() => {
    loadStoredPlan().finally(() => setPlanLoading(false));
  }, []);
  useEffect(() => {
    if (!plan) return;
    const day = plan.monthlyBlocks?.[monthIndex]?.weeks?.[weekIndex]?.days?.[dayIndex];
    if (!day) return;
    setEditableExercises(day.exercises.map((ex) => ({ ...ex })));
  }, [plan, monthIndex, weekIndex, dayIndex]);

  if (planLoading) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center', flex: 1 }]}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }
  if (!plan) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center', flex: 1 }]}>
        <Text style={{ color: C.text2, fontSize: 16, textAlign: 'center', marginBottom: 16 }}>
          Não foi possível carregar o plano.
        </Text>
        <TouchableOpacity style={[s.startBtn, { backgroundColor: C.primary, paddingHorizontal: 32 }]} onPress={() => navigation.goBack()}>
          <Text style={s.startBtnText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const month = plan.monthlyBlocks?.[monthIndex];
  const week = month?.weeks?.[weekIndex];
  const day = week?.days?.[dayIndex];
  if (!month || !week || !day) {
    return (
      <ScrollView style={s.container} contentContainerStyle={[s.content, { justifyContent: 'center', flexGrow: 1 }]}>
        <Text style={[s.sectionTitle, { textAlign: 'center' }]}>Treino não encontrado</Text>
        <TouchableOpacity style={[s.startBtn, { backgroundColor: C.primary }]} onPress={() => navigation.goBack()}>
          <Text style={s.startBtnText}>Voltar</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }
  const phaseColor = PHASE_COLOR(monthIndex);
  const currentExercises = editableExercises.length ? editableExercises : day.exercises;

  const totalSets = currentExercises.reduce((a, e) => a + e.sets, 0);
  const workoutToStart = useMemo(() => ({
    ...day,
    exercises: currentExercises,
  }), [day, currentExercises]);

  const openEditExercise = (idx: number) => {
    const ex = currentExercises[idx];
    setEditIndex(idx);
    setEditName(ex.name);
    setEditSets(String(ex.sets));
    setEditReps(ex.reps);
    setEditRest(ex.rest);
    setEditNotes(ex.notes ?? '');
    setShowEditModal(true);
  };

  const saveEditedExercise = () => {
    if (editIndex === null) return;
    const parsedSets = parseInt(editSets, 10);
    if (!editName.trim() || Number.isNaN(parsedSets) || parsedSets < 1 || !editReps.trim() || !editRest.trim()) {
      Alert.alert('Atenção', 'Preencha nome, séries, reps e descanso corretamente.');
      return;
    }
    setEditableExercises((prev) => prev.map((item, idx) => idx === editIndex ? ({
      ...item,
      name: editName.trim(),
      sets: parsedSets,
      reps: editReps.trim(),
      rest: editRest.trim(),
      notes: editNotes.trim() || undefined,
    }) : item));
    setShowEditModal(false);
  };

  const addExercise = () => {
    const parsedSets = parseInt(newSets, 10);
    if (!newName.trim() || Number.isNaN(parsedSets) || parsedSets < 1 || !newReps.trim() || !newRest.trim()) {
      Alert.alert('Atenção', 'Preencha nome, séries, reps e descanso corretamente.');
      return;
    }
    setEditableExercises((prev) => ([
      ...prev,
      {
        name: newName.trim(),
        sets: parsedSets,
        reps: newReps.trim(),
        rest: newRest.trim(),
        notes: newNotes.trim() || undefined,
      },
    ]));
    setNewName('');
    setNewSets('3');
    setNewReps('10-12');
    setNewRest('90s');
    setNewNotes('');
    setShowAddModal(false);
  };

  return (
    <>
      <ScrollView style={s.container} contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 16 }]} showsVerticalScrollIndicator={false}>
        <View style={[s.header, { borderColor: `${phaseColor}40` }]}>
          <Text style={[s.breadcrumb, { color: phaseColor }]}>
            {month.monthName} · Sem {week.week}
          </Text>
          <Text style={s.dayName}>{day.dayOfWeek}</Text>
          <View style={[s.focusPill, { backgroundColor: `${phaseColor}20` }]}>
            <Text style={[s.focusText, { color: phaseColor }]}>{day.focus}</Text>
          </View>

          <View style={s.headerStats}>
            {[
              { icon: '⏱', label: 'duração', value: `${day.duration} min` },
              { icon: '💪', label: 'exercícios', value: String(currentExercises.length) },
              { icon: '🔁', label: 'séries', value: String(totalSets) },
            ].map((stat, i) => (
              <View key={i} style={s.statItem}>
                <Text style={s.statIcon}>{stat.icon}</Text>
                <Text style={[s.statValue, { color: phaseColor }]}>{stat.value}</Text>
                <Text style={s.statLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {day.notes && (
          <View style={s.notesCard}>
            <Text style={s.notesTitle}>📝 Observações</Text>
            <Text style={s.notesText}>{day.notes}</Text>
          </View>
        )}

        <Text style={s.sectionTitle}>Exercícios</Text>

        {currentExercises.map((ex, idx) => (
          <View key={idx} style={s.exCard}>
            <View style={s.exHeader}>
              <View style={[s.exNumBadge, { backgroundColor: phaseColor }]}>
                <Text style={s.exNumText}>{idx + 1}</Text>
              </View>
              <Text style={s.exName}>{ex.name}</Text>
              <TouchableOpacity style={s.editExBtn} onPress={() => openEditExercise(idx)}>
                <Text style={s.editExBtnText}>✎</Text>
              </TouchableOpacity>
            </View>

            <View style={[s.statsBar, { backgroundColor: C.elevated }]}>
              <View style={s.barStat}>
                <Text style={[s.barValue, { color: phaseColor }]}>{ex.sets}</Text>
                <Text style={s.barLabel}>Séries</Text>
              </View>
              <View style={s.barDiv} />
              <View style={s.barStat}>
                <Text style={[s.barValue, { color: phaseColor }]}>{ex.reps}</Text>
                <Text style={s.barLabel}>Reps</Text>
              </View>
              <View style={s.barDiv} />
              <View style={s.barStat}>
                <Text style={[s.barValue, { color: phaseColor }]}>{ex.rest}</Text>
                <Text style={s.barLabel}>Descanso</Text>
              </View>
            </View>

            {ex.notes && (
              <View style={s.exNote}>
                <Text style={s.exNoteText}>💡 {ex.notes}</Text>
              </View>
            )}
          </View>
        ))}

        <TouchableOpacity style={[s.addBtn, { borderColor: `${phaseColor}50` }]} activeOpacity={0.85} onPress={() => setShowAddModal(true)}>
          <Text style={[s.addBtnText, { color: phaseColor }]}>＋ Adicionar exercício</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.startBtn, { backgroundColor: phaseColor }]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('ActiveWorkout', {
            workout: workoutToStart,
            context: { monthIndex, weekIndex, dayIndex },
          })}
        >
          <Text style={s.startBtnText}>▶  Iniciar Treino</Text>
        </TouchableOpacity>

        <View style={[s.summaryCard, { borderColor: `${phaseColor}30` }]}>
          <Text style={[s.summaryTitle, { color: phaseColor }]}>📊 Resumo do Treino</Text>
          {[
            { label: 'Duração estimada', value: `${day.duration} min` },
            { label: 'Total exercícios', value: String(currentExercises.length) },
            { label: 'Total de séries', value: String(totalSets) },
            { label: 'Foco muscular', value: day.focus },
          ].map((row, i, arr) => (
            <View key={i} style={[s.summaryRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
              <Text style={s.summaryLabel}>{row.label}</Text>
              <Text style={s.summaryValue}>{row.value}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal visible={showEditModal} transparent animationType="fade">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowEditModal(false)}>
          <View style={s.modalCard} onStartShouldSetResponder={() => true}>
            <Text style={s.modalTitle}>Editar exercício</Text>
            <TextInput style={s.modalInput} value={editName} onChangeText={setEditName} placeholder="Nome" placeholderTextColor={C.text3} />
            <View style={s.modalRow}>
              <TextInput style={[s.modalInput, s.modalHalf]} value={editSets} onChangeText={setEditSets} placeholder="Séries" placeholderTextColor={C.text3} keyboardType="numeric" />
              <TextInput style={[s.modalInput, s.modalHalf]} value={editReps} onChangeText={setEditReps} placeholder="Reps" placeholderTextColor={C.text3} />
            </View>
            <TextInput style={s.modalInput} value={editRest} onChangeText={setEditRest} placeholder="Descanso (ex: 90s)" placeholderTextColor={C.text3} />
            <TextInput style={s.modalInput} value={editNotes} onChangeText={setEditNotes} placeholder="Observações (opcional)" placeholderTextColor={C.text3} />
            <TouchableOpacity style={s.modalBtn} onPress={saveEditedExercise}>
              <Text style={s.modalBtnText}>Salvar alterações</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={showAddModal} transparent animationType="fade">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowAddModal(false)}>
          <View style={s.modalCard} onStartShouldSetResponder={() => true}>
            <Text style={s.modalTitle}>Adicionar exercício</Text>
            <TextInput style={s.modalInput} value={newName} onChangeText={setNewName} placeholder="Nome" placeholderTextColor={C.text3} />
            <View style={s.modalRow}>
              <TextInput style={[s.modalInput, s.modalHalf]} value={newSets} onChangeText={setNewSets} placeholder="Séries" placeholderTextColor={C.text3} keyboardType="numeric" />
              <TextInput style={[s.modalInput, s.modalHalf]} value={newReps} onChangeText={setNewReps} placeholder="Reps" placeholderTextColor={C.text3} />
            </View>
            <TextInput style={s.modalInput} value={newRest} onChangeText={setNewRest} placeholder="Descanso (ex: 90s)" placeholderTextColor={C.text3} />
            <TextInput style={s.modalInput} value={newNotes} onChangeText={setNewNotes} placeholder="Observações (opcional)" placeholderTextColor={C.text3} />
            <TouchableOpacity style={s.modalBtn} onPress={addExercise}>
              <Text style={s.modalBtnText}>Adicionar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 50 },

  header: {
    backgroundColor: C.surface, borderRadius: 20, padding: 22, marginBottom: 14,
    borderWidth: 1, alignItems: 'center',
  },
  breadcrumb: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5, marginBottom: 6 },
  dayName: { color: C.text1, fontSize: 32, fontWeight: '900' },
  focusPill: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginTop: 10, marginBottom: 16 },
  focusText: { fontSize: 13, fontWeight: '700' },
  headerStats: { flexDirection: 'row', gap: 20 },
  statItem: { alignItems: 'center', gap: 2 },
  statIcon: { fontSize: 18 },
  statValue: { fontSize: 18, fontWeight: '900' },
  statLabel: { color: C.text3, fontSize: 10 },

  notesCard: { backgroundColor: C.surface, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: C.border },
  notesTitle: { color: C.text1, fontWeight: '700', fontSize: 14, marginBottom: 8 },
  notesText: { color: C.text2, lineHeight: 20 },

  sectionTitle: { color: C.text1, fontSize: 16, fontWeight: '700', marginBottom: 12 },

  exCard: { backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  exHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  exNumBadge: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  exNumText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  exName: { color: C.text1, fontWeight: '700', fontSize: 16, flex: 1 },
  editExBtn: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border },
  editExBtnText: { color: C.primaryLight, fontWeight: '800', fontSize: 14 },
  statsBar: { flexDirection: 'row', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 10 },
  barStat: { flex: 1, alignItems: 'center' },
  barValue: { fontSize: 22, fontWeight: '900' },
  barLabel: { color: C.text3, fontSize: 11, marginTop: 2 },
  barDiv: { width: 1, height: 36, backgroundColor: C.border },
  exNote: { backgroundColor: C.elevated, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: C.border },
  exNoteText: { color: C.primaryLight, fontSize: 13, lineHeight: 18 },

  addBtn: {
    borderRadius: 12, borderWidth: 1, borderStyle: 'dashed',
    paddingVertical: 12, alignItems: 'center', marginBottom: 14,
    backgroundColor: C.surface,
  },
  addBtnText: { fontSize: 14, fontWeight: '800' },
  startBtn: {
    borderRadius: 16, paddingVertical: 16, alignItems: 'center',
    marginBottom: 16, marginTop: 4,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
  },
  startBtnText: { color: '#fff', fontSize: 17, fontWeight: '800', letterSpacing: 0.3 },

  summaryCard: { backgroundColor: C.surface, borderRadius: 16, padding: 18, marginTop: 8, borderWidth: 1 },
  summaryTitle: { fontWeight: '700', fontSize: 15, marginBottom: 14 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  summaryLabel: { color: C.text2, fontSize: 14 },
  summaryValue: { color: C.text1, fontWeight: '700', fontSize: 14 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { width: '84%', backgroundColor: C.surface, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: C.border },
  modalTitle: { color: C.text1, fontSize: 17, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
  modalInput: {
    backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border,
    borderRadius: 10, padding: 12, color: C.text1, marginBottom: 10,
  },
  modalRow: { flexDirection: 'row', gap: 8 },
  modalHalf: { flex: 1 },
  modalBtn: { backgroundColor: C.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  modalBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
});
