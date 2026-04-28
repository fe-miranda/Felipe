import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Exercise, RootStackParamList, CompletedWorkout, WorkoutDay } from '../types';
import { usePlan } from '../hooks/usePlan';
import { loadHistory } from '../services/workoutHistoryService';
import { ExerciseHistoryModal } from '../components/ExerciseHistoryModal';
import { resolveTemplatesById, resolveDayExercises, isOnOrAfterToday } from '../utils/planResolve';

const ACTIVE_WORKOUT_SESSION_KEY = '@gymapp_active_workout_session';

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

/** Normalise a blockType value from the AI or legacy data to a lowercase canonical form. */
function normalizeBlockType(bt?: string): string | undefined {
  if (!bt) return undefined;
  const lower = bt.toLowerCase();
  // Map Portuguese variant to canonical English key used in logic
  if (lower === 'pirâmide') return 'pyramid';
  return lower;
}

/** Display label and icon for a normalised blockType. */
const BLOCK_TYPE_DISPLAY: Record<string, { label: string; icon: string }> = {
  pyramid:  { label: 'Pirâmide', icon: '📈' },
  dropset:  { label: 'Dropset',  icon: '📉' },
  biset:    { label: 'Biset',    icon: '🔗' },
  triset:   { label: 'Triset',   icon: '🔗' },
  superset: { label: 'Superset', icon: '🔗' },
};

export function WorkoutDetailScreen({ navigation, route }: Props) {
  const { monthIndex, weekIndex, dayIndex } = route.params;
  const { plan, loadStoredPlan, updateExercisesInPlan, updateTemplateExercisesFromToday, setDayOverrideExercises } = usePlan();
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
  const [newBlockType, setNewBlockType] = useState('Normal');
  const [newName2, setNewName2] = useState('');
  const [newName3, setNewName3] = useState('');
  const [newName4, setNewName4] = useState('');

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyExerciseName, setHistoryExerciseName] = useState('');
  const [workoutHistory, setWorkoutHistory] = useState<CompletedWorkout[]>([]);

  const [planLoading, setPlanLoading] = useState(true);

  const navigateToWorkout = useCallback(async (
    workout: WorkoutDay,
    context?: { monthIndex: number; weekIndex: number; dayIndex: number },
  ) => {
    const raw = await AsyncStorage.getItem(ACTIVE_WORKOUT_SESSION_KEY);
    if (!raw) {
      navigation.navigate('ActiveWorkout', { workout, context });
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (!parsed?.workout?.focus) {
        navigation.navigate('ActiveWorkout', { workout, context });
        return;
      }
      if (parsed.workout.focus === workout.focus) {
        navigation.navigate('ActiveWorkout', { workout, context });
        return;
      }
      Alert.alert(
        'Treino em Andamento',
        `Você tem um treino em andamento: "${parsed.workout.focus}". O que deseja fazer?`,
        [
          {
            text: 'Cancelar treino anterior',
            style: 'destructive',
            onPress: async () => {
              await AsyncStorage.removeItem(ACTIVE_WORKOUT_SESSION_KEY);
              navigation.navigate('ActiveWorkout', { workout, context });
            },
          },
          {
            text: 'Retomar treino anterior',
            onPress: () => {
              navigation.navigate('ActiveWorkout', { workout: parsed.workout, context: parsed.context });
            },
          },
          { text: 'Voltar', style: 'cancel' },
        ],
      );
    } catch {
      navigation.navigate('ActiveWorkout', { workout, context });
    }
  }, [navigation]);

  useEffect(() => {
    loadStoredPlan().finally(() => setPlanLoading(false));
    loadHistory().then(setWorkoutHistory).catch(() => {});
  }, []);
  useEffect(() => {
    if (!plan) return;
    const day = plan.monthlyBlocks?.[monthIndex]?.weeks?.[weekIndex]?.days?.[dayIndex];
    if (!day) return;
    const templatesById = resolveTemplatesById(plan);
    setEditableExercises(resolveDayExercises(day, templatesById).map((ex) => ({ ...ex })));
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
  const templatesById = resolveTemplatesById(plan);
  const resolvedBase = resolveDayExercises(day, templatesById);
  const currentExercises = editableExercises.length ? editableExercises : resolvedBase;

  const totalSets = currentExercises.reduce((a, e) => a + e.sets, 0);
  const workoutToStart = {
    ...day,
    exercises: currentExercises,
  };

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

  const saveEditedExercise = async () => {
    if (editIndex === null) return;
    const parsedSets = parseInt(editSets, 10);
    if (!editName.trim() || Number.isNaN(parsedSets) || parsedSets < 1 || !editReps.trim() || !editRest.trim()) {
      Alert.alert('Atenção', 'Preencha nome, séries, reps e descanso corretamente.');
      return;
    }
    const newExercises = editableExercises.map((item, idx) => idx === editIndex ? ({
      ...item,
      name: editName.trim(),
      sets: parsedSets,
      reps: editReps.trim(),
      rest: editRest.trim(),
      notes: editNotes.trim() || undefined,
    }) : item);
    setEditableExercises(newExercises);
    setShowEditModal(false);

    const hasTemplate = !!(day.templateId && plan.templates?.some((t) => t.id === day.templateId));
    const isFuture = day.instanceDate ? isOnOrAfterToday(day.instanceDate) : false;

    if (hasTemplate && isFuture) {
      Alert.alert(
        'Salvar alteração',
        'Como deseja aplicar esta edição?',
        [
          {
            text: 'Aplicar ao Treino Base (de hoje em diante)',
            onPress: async () => {
              try {
                await updateTemplateExercisesFromToday(day.templateId!, newExercises);
              } catch (error) { console.error(error); Alert.alert('Erro', 'Não foi possível salvar as alterações.'); }
            },
          },
          {
            text: 'Somente este dia',
            onPress: async () => {
              try {
                await setDayOverrideExercises(monthIndex, weekIndex, dayIndex, newExercises);
              } catch (error) { console.error(error); Alert.alert('Erro', 'Não foi possível salvar as alterações.'); }
            },
          },
          { text: 'Cancelar', style: 'cancel' },
        ],
      );
    } else {
      Alert.alert(
        'Salvar alteração',
        'Deseja aplicar esta edição a todas as semanas com o mesmo foco muscular?',
        [
          {
            text: 'Todas as semanas',
            onPress: async () => {
              try { await updateExercisesInPlan(monthIndex, weekIndex, dayIndex, newExercises, true); }
              catch (error) { console.error(error); Alert.alert('Erro', 'Não foi possível salvar as alterações.'); }
            },
          },
          {
            text: 'Somente esta semana',
            onPress: async () => {
              try { await updateExercisesInPlan(monthIndex, weekIndex, dayIndex, newExercises, false); }
              catch (error) { console.error(error); Alert.alert('Erro', 'Não foi possível salvar as alterações.'); }
            },
          },
          { text: 'Não salvar', style: 'cancel' },
        ],
      );
    }
  };

  const addExercise = () => {
    const parsedSets = parseInt(newSets, 10);
    if (!newName.trim() || Number.isNaN(parsedSets) || parsedSets < 1 || !newReps.trim() || !newRest.trim()) {
      Alert.alert('Atenção', 'Preencha nome, séries, reps e descanso corretamente.');
      return;
    }
    // Pirâmide and Dropset are single-exercise block types
    const isSingleBlock = newBlockType === 'Pirâmide' || newBlockType === 'Dropset';
    const extraCount = isSingleBlock ? 0 : newBlockType === 'Biset' ? 1 : newBlockType === 'Triset' ? 2 : newBlockType === 'Superset' ? 3 : 0;
    const names = [newName.trim(), newName2.trim(), newName3.trim(), newName4.trim()].slice(0, extraCount + 1);
    if (extraCount > 0 && names.some((n, i) => i > 0 && !n)) {
      Alert.alert('Atenção', 'Preencha os nomes de todos os exercícios do bloco.');
      return;
    }
    const total = names.length;
    const newExercises: Exercise[] = names.map((n, i) => ({
      name: n,
      sets: parsedSets,
      reps: newReps.trim(),
      rest: total > 1 && i < total - 1 ? '0s' : newRest.trim(),
      notes: total > 1 ? `${newBlockType} ${i + 1}/${total}` : newNotes.trim() || undefined,
      blockType: newBlockType !== 'Normal' ? newBlockType : undefined,
    }));
    setEditableExercises((prev) => ([...prev, ...newExercises]));
    setNewName(''); setNewName2(''); setNewName3(''); setNewName4('');
    setNewSets('3'); setNewReps('10-12'); setNewRest('90s'); setNewNotes('');
    setNewBlockType('Normal');
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

        {/* Template badge */}
        {day.templateId && (
          <View style={[s.tplInfoBar, { borderColor: `${phaseColor}30` }]}>
            <Text style={[s.tplInfoText, { color: phaseColor }]}>
              🔗 Treino {day.templateId} — edite para aplicar a todas as ocorrências
            </Text>
          </View>
        )}

        <Text style={s.sectionTitle}>Exercícios</Text>

        {(() => {
          // Group consecutive exercises with the same blockType (biset/triset/superset) into shared cards
          const groups: Array<{ indices: number[]; blockType?: string }> = [];
          let i = 0;
          while (i < currentExercises.length) {
            const bt = normalizeBlockType(currentExercises[i].blockType);
            if (bt === 'biset' || bt === 'triset' || bt === 'superset') {
              const group: number[] = [i];
              i++;
              while (i < currentExercises.length && normalizeBlockType(currentExercises[i].blockType) === bt) {
                group.push(i);
                i++;
              }
              groups.push({ indices: group, blockType: bt });
            } else {
              // pyramid/dropset and normal are single-exercise cards
              groups.push({ indices: [i], blockType: bt });
              i++;
            }
          }

          return groups.map((group, gIdx) => {
            const isMultiBlock = group.indices.length > 1 && group.blockType;
            const isSingleSpecial = group.indices.length === 1 && (group.blockType === 'pyramid' || group.blockType === 'dropset');
            const showBadge = isMultiBlock || isSingleSpecial;
            const blockDisplay = group.blockType ? BLOCK_TYPE_DISPLAY[group.blockType] : undefined;
            const displayLabel = blockDisplay?.label ?? (group.blockType ?? '');
            const blockIcon = blockDisplay?.icon ?? '🔗';

            return (
              <View
                key={gIdx}
                style={[
                  s.exCard,
                  showBadge && { borderColor: `${phaseColor}60`, borderWidth: 1.5 },
                ]}
              >
                {showBadge && (
                  <View style={[s.blockBadge, { backgroundColor: `${phaseColor}20` }]}>
                  <Text style={[s.blockBadgeText, { color: phaseColor }]}>{blockIcon} {displayLabel}</Text>
                  </View>
                )}

                {group.indices.map((idx, posInGroup) => {
                  const ex = currentExercises[idx];
                  return (
                    <View key={idx}>
                      {isMultiBlock && posInGroup > 0 && <View style={s.blockDivider} />}
                      <View style={s.exHeader}>
                        <View style={[s.exNumBadge, { backgroundColor: phaseColor }]}>
                          <Text style={s.exNumText}>{idx + 1}</Text>
                        </View>
                        <Text style={s.exName}>{ex.name}</Text>
                        <TouchableOpacity style={s.editExBtn} onPress={() => openEditExercise(idx)}>
                          <Text style={s.editExBtnText}>✎</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[s.editExBtn, { marginLeft: 4 }]}
                          onPress={() => {
                            setHistoryExerciseName(ex.name);
                            setShowHistoryModal(true);
                          }}
                        >
                          <Text style={s.editExBtnText}>📊</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[s.editExBtn, { marginLeft: 4, borderColor: '#EF444440' }]}
                          onPress={() => {
                            Alert.alert('Excluir exercício', 'Deseja remover este exercício?', [
                              { text: 'Cancelar', style: 'cancel' },
                              {
                                text: 'Remover',
                                style: 'destructive',
                                onPress: () => setEditableExercises((prev) => prev.filter((_, i) => i !== idx)),
                              },
                            ]);
                          }}
                        >
                          <Text style={[s.editExBtnText, { color: '#EF4444' }]}>🗑</Text>
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
                  );
                })}
              </View>
            );
          });
        })()}

        <TouchableOpacity style={[s.addBtn, { borderColor: `${phaseColor}50` }]} activeOpacity={0.85} onPress={() => setShowAddModal(true)}>
          <Text style={[s.addBtnText, { color: phaseColor }]}>＋ Adicionar exercício</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.startBtn, { backgroundColor: phaseColor }]}
          activeOpacity={0.85}
          onPress={() => navigateToWorkout(workoutToStart, { monthIndex, weekIndex, dayIndex })}
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

            {/* Block type selector */}
            <Text style={{ color: C.text3, fontSize: 11, fontWeight: '700', marginBottom: 6 }}>TIPO DE BLOCO</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              {['Normal', 'Biset', 'Triset', 'Superset', 'Pirâmide', 'Dropset'].map((bt) => (
                <TouchableOpacity
                  key={bt}
                  style={{
                    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
                    backgroundColor: newBlockType === bt ? C.primary : C.elevated,
                    borderWidth: 1, borderColor: newBlockType === bt ? C.primary : C.border,
                  }}
                  onPress={() => setNewBlockType(bt)}
                >
                  <Text style={{ color: newBlockType === bt ? '#fff' : C.text2, fontSize: 12, fontWeight: '700' }}>{bt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput style={s.modalInput} value={newName} onChangeText={setNewName}
              placeholder={newBlockType !== 'Normal' && newBlockType !== 'Pirâmide' && newBlockType !== 'Dropset' ? 'Nome exercício 1' : 'Nome'} placeholderTextColor={C.text3} />
            {(newBlockType === 'Biset' || newBlockType === 'Triset' || newBlockType === 'Superset') && (
              <TextInput style={s.modalInput} value={newName2} onChangeText={setNewName2}
                placeholder="Nome exercício 2" placeholderTextColor={C.text3} />
            )}
            {(newBlockType === 'Triset' || newBlockType === 'Superset') && (
              <TextInput style={s.modalInput} value={newName3} onChangeText={setNewName3}
                placeholder="Nome exercício 3" placeholderTextColor={C.text3} />
            )}
            {newBlockType === 'Superset' && (
              <TextInput style={s.modalInput} value={newName4} onChangeText={setNewName4}
                placeholder="Nome exercício 4" placeholderTextColor={C.text3} />
            )}

            <View style={s.modalRow}>
              <TextInput style={[s.modalInput, s.modalHalf]} value={newSets} onChangeText={setNewSets} placeholder="Séries" placeholderTextColor={C.text3} keyboardType="numeric" />
              <TextInput style={[s.modalInput, s.modalHalf]} value={newReps} onChangeText={setNewReps}
                placeholder={newBlockType === 'Pirâmide' ? 'Ex: 15/12/10/8' : newBlockType === 'Dropset' ? 'Ex: 12+drop' : 'Reps'} placeholderTextColor={C.text3} />
            </View>
            <TextInput style={s.modalInput} value={newRest} onChangeText={setNewRest} placeholder="Descanso (ex: 90s)" placeholderTextColor={C.text3} />
            {(newBlockType === 'Normal' || newBlockType === 'Pirâmide' || newBlockType === 'Dropset') && (
              <TextInput style={s.modalInput} value={newNotes} onChangeText={setNewNotes} placeholder="Observações (opcional)" placeholderTextColor={C.text3} />
            )}
            <TouchableOpacity style={s.modalBtn} onPress={addExercise}>
              <Text style={s.modalBtnText}>Adicionar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <ExerciseHistoryModal
        visible={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        exerciseName={historyExerciseName}
        history={workoutHistory}
      />
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

  tplInfoBar: {
    borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8,
    marginBottom: 12, backgroundColor: C.elevated,
  },
  tplInfoText: { fontSize: 12, fontWeight: '700' },

  sectionTitle: { color: C.text1, fontSize: 16, fontWeight: '700', marginBottom: 12 },

  exCard: { backgroundColor: C.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  blockBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginBottom: 10 },
  blockBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  blockDivider: { height: 1, backgroundColor: C.border, marginVertical: 12 },
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
