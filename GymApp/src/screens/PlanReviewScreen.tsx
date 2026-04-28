import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, AnnualPlan, WorkoutTemplate, Exercise } from '../types';
import { usePlan } from '../hooks/usePlan';
import { resolveTemplatesById, resolveDayExercises, toLocalDateString } from '../utils/planResolve';
import { LoadingOverlay } from '../components/LoadingOverlay';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'PlanReview'> };

const C = {
  bg: '#07070F', surface: '#0F0F1A', elevated: '#161625', border: '#1E1E30',
  primary: '#7C3AED', primaryLight: '#A78BFA', primaryGlow: 'rgba(124,58,237,0.15)',
  success: '#10B981', text1: '#F1F5F9', text2: '#94A3B8', text3: '#475569',
};

const GOAL_LABELS: Record<string, string> = {
  lose_weight: 'Perda de Peso', gain_muscle: 'Ganho de Massa',
  improve_endurance: 'Resistência', increase_strength: 'Força', general_fitness: 'Condicionamento',
};
const LEVEL_LABELS: Record<string, string> = {
  beginner: 'Iniciante', intermediate: 'Intermediário', advanced: 'Avançado',
};

export function PlanReviewScreen({ navigation }: Props) {
  const {
    loadDraft, generateMonth, confirmDraft,
    saveDraft, progress,
  } = usePlan();

  const [draft, setDraft] = useState<AnnualPlan | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(true);
  const [generatingMonth, setGeneratingMonth] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Template edit state
  const [editingTemplate, setEditingTemplate] = useState<WorkoutTemplate | null>(null);
  const [editExercises, setEditExercises] = useState<Exercise[]>([]);
  const [showTemplateEdit, setShowTemplateEdit] = useState(false);

  // Single exercise edit
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editSets, setEditSets] = useState('');
  const [editReps, setEditReps] = useState('');
  const [editRest, setEditRest] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editBlockType, setEditBlockType] = useState('Normal');
  const [showExerciseEdit, setShowExerciseEdit] = useState(false);

  const reload = useCallback(async () => {
    const d = await loadDraft();
    setDraft(d);
    setLoadingDraft(false);
  }, [loadDraft]);

  useEffect(() => { reload(); }, [reload]);

  // Once draft is loaded, ensure Month 1 is generated
  const month0WeeksLength = draft?.monthlyBlocks[0]?.weeks?.length ?? -1;
  useEffect(() => {
    if (!draft) return;
    const month0 = draft.monthlyBlocks[0];
    if (!month0 || (month0.weeks ?? []).length > 0) return;

    setGeneratingMonth(true);
    generateMonth(0, true)
      .then(() => loadDraft())
      .then((d) => { if (d) setDraft(d); })
      .catch((err: any) => Alert.alert('Erro', err.message || 'Não foi possível gerar o Mês 1.'))
      .finally(() => setGeneratingMonth(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month0WeeksLength]);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await confirmDraft();
      navigation.replace('Main');
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Não foi possível ativar o plano.');
    } finally {
      setConfirming(false);
    }
  };

  const openTemplateEdit = (tpl: WorkoutTemplate) => {
    setEditingTemplate(tpl);
    setEditExercises(tpl.exercises.map((e) => ({ ...e })));
    setShowTemplateEdit(true);
  };

  const openExerciseEdit = (idx: number) => {
    const ex = editExercises[idx];
    setEditIdx(idx);
    setEditName(ex.name);
    setEditSets(String(ex.sets));
    setEditReps(ex.reps);
    setEditRest(ex.rest);
    setEditNotes(ex.notes ?? '');
    setEditBlockType(ex.blockType ?? 'Normal');
    setShowExerciseEdit(true);
  };

  const saveExerciseEdit = () => {
    if (editIdx === null) return;
    const parsedSets = parseInt(editSets, 10);
    if (!editName.trim() || isNaN(parsedSets) || parsedSets < 1 || !editReps.trim() || !editRest.trim()) {
      Alert.alert('Atenção', 'Preencha nome, séries, reps e descanso.');
      return;
    }
    setEditExercises((prev) =>
      prev.map((ex, i) =>
        i === editIdx
          ? {
              ...ex,
              name: editName.trim(),
              sets: parsedSets,
              reps: editReps.trim(),
              rest: editRest.trim(),
              notes: editNotes.trim() || undefined,
              blockType: editBlockType !== 'Normal' ? editBlockType : undefined,
            }
          : ex,
      ),
    );
    setShowExerciseEdit(false);
  };

  const removeExercise = (idx: number) => {
    Alert.alert('Remover', 'Remover este exercício do template?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => setEditExercises((p) => p.filter((_, i) => i !== idx)) },
    ]);
  };

  const saveTemplateEdit = async () => {
    if (!editingTemplate || !draft) return;
    // Update template in draft
    const updatedTemplates = (draft.templates ?? []).map((t) =>
      t.id === editingTemplate.id ? { ...t, exercises: editExercises } : t,
    );
    const updatedDraft: AnnualPlan = { ...draft, templates: updatedTemplates };
    setDraft(updatedDraft);
    await saveDraft(updatedDraft);
    setShowTemplateEdit(false);
  };

  // ─── Next 7 days preview ─────────────────────────────────────────────────────
  const next7Days = (() => {
    if (!draft) return [];
    const templatesById = resolveTemplatesById(draft);
    const today = toLocalDateString(new Date());
    const result: Array<{ date: string; label: string; focus: string; templateId?: string }> = [];

    for (const block of draft.monthlyBlocks) {
      for (const week of (block.weeks ?? [])) {
        for (const day of week.days) {
          if (!day.instanceDate) continue;
          if (day.instanceDate >= today) {
            const exercises = resolveDayExercises(day, templatesById);
            result.push({
              date: day.instanceDate,
              label: day.dayOfWeek,
              focus: day.focus,
              templateId: day.templateId,
            });
          }
          if (result.length >= 7) break;
        }
        if (result.length >= 7) break;
      }
      if (result.length >= 7) break;
    }
    return result;
  })();

  if (loadingDraft) {
    return (
      <View style={[s.container, { justifyContent: 'center', alignItems: 'center', flex: 1 }]}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  if (!draft) {
    return (
      <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
        <View style={[s.container, { justifyContent: 'center', alignItems: 'center', flex: 1, padding: 24 }]}>
          <Text style={s.emptyTitle}>Nenhum plano para revisar</Text>
          <TouchableOpacity style={s.confirmBtn} onPress={() => navigation.replace('Onboarding')}>
            <Text style={s.confirmBtnText}>Criar Plano</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const p = draft.userProfile;
  const templates = draft.templates ?? [];
  const month0 = draft.monthlyBlocks[0];
  const hasMonth1 = (month0?.weeks ?? []).length > 0;

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <LoadingOverlay
        visible={generatingMonth || confirming}
        title={confirming ? 'Ativando plano…' : 'Gerando Mês 1…'}
        message={progress || undefined}
      />

      <ScrollView style={s.container} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>Revisar Plano</Text>
          <Text style={s.headerSub}>Confirme e edite antes de ativar</Text>
        </View>

        {/* Profile summary */}
        <View style={s.card}>
          <Text style={s.cardTitle}>👤 Perfil</Text>
          {[
            ['Nome', p.name],
            ['Objetivo', GOAL_LABELS[p.goal] ?? p.goal],
            ['Nível', LEVEL_LABELS[p.fitnessLevel] ?? p.fitnessLevel],
            ['Dias/semana', String(p.daysPerWeek)],
            ['Duração', `${p.workoutDuration} min`],
          ].map(([label, value]) => (
            <View key={label} style={s.profileRow}>
              <Text style={s.profileLabel}>{label}</Text>
              <Text style={s.profileValue}>{value}</Text>
            </View>
          ))}
        </View>

        {/* Templates A/B/C */}
        {templates.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>📋 Treinos Base</Text>
            <Text style={s.cardSub}>Toque para editar os exercícios de cada treino base.</Text>
            {templates.map((tpl) => (
              <TouchableOpacity
                key={tpl.id}
                style={s.templateRow}
                onPress={() => openTemplateEdit(tpl)}
                activeOpacity={0.75}
              >
                <View style={s.templateBadge}>
                  <Text style={s.templateBadgeText}>{tpl.id}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.templateLabel}>{tpl.label}</Text>
                  <Text style={s.templateFocus}>{tpl.focus} · {tpl.exercises.length} exercícios</Text>
                </View>
                <Text style={{ color: C.primaryLight, fontSize: 18 }}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Next 7 days */}
        {hasMonth1 && next7Days.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>📅 Próximos 7 Dias</Text>
            {next7Days.map((item, i) => (
              <View key={i} style={s.dayRow}>
                <Text style={s.dayDate}>{item.date}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.dayDow}>{item.label}</Text>
                  <Text style={s.dayFocus}>{item.focus}</Text>
                </View>
                {item.templateId && (
                  <View style={s.tplPill}>
                    <Text style={s.tplPillText}>Treino {item.templateId}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {!hasMonth1 && !generatingMonth && (
          <View style={s.card}>
            <Text style={[s.cardSub, { textAlign: 'center', color: C.text2 }]}>
              Aguarde a geração do Mês 1…
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[s.confirmBtn, (generatingMonth || confirming) && s.confirmBtnDisabled]}
          onPress={handleConfirm}
          disabled={generatingMonth || confirming}
          activeOpacity={0.85}
        >
          <Text style={s.confirmBtnText}>✅  Confirmar e Ativar Plano</Text>
        </TouchableOpacity>
        <Text style={s.footer}>Seu histórico será mantido ao criar um novo plano.</Text>
      </ScrollView>

      {/* Template edit modal */}
      <Modal visible={showTemplateEdit} transparent animationType="slide">
        <View style={s.modalBackdrop}>
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>
              Editar {editingTemplate?.label}
            </Text>
            <Text style={s.modalSub}>{editingTemplate?.focus}</Text>

            <ScrollView style={{ maxHeight: 340 }} showsVerticalScrollIndicator={false}>
              {editExercises.map((ex, idx) => (
                <View key={idx} style={s.exRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.exName}>{ex.name}</Text>
                    <Text style={s.exMeta}>{ex.sets}×{ex.reps} · {ex.rest}</Text>
                    {ex.blockType && <Text style={[s.blockBadge]}>{ex.blockType}</Text>}
                  </View>
                  <TouchableOpacity style={s.exBtn} onPress={() => openExerciseEdit(idx)}>
                    <Text style={s.exBtnText}>✎</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.exBtn, { borderColor: '#EF444440', marginLeft: 4 }]} onPress={() => removeExercise(idx)}>
                    <Text style={[s.exBtnText, { color: '#EF4444' }]}>🗑</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setShowTemplateEdit(false)}>
                <Text style={s.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={saveTemplateEdit}>
                <Text style={s.saveBtnText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Exercise edit modal */}
      <Modal visible={showExerciseEdit} transparent animationType="fade">
        <TouchableOpacity style={s.exModalBackdrop} activeOpacity={1} onPress={() => setShowExerciseEdit(false)}>
          <View style={s.exModalCard} onStartShouldSetResponder={() => true}>
            <Text style={s.modalTitle}>Editar exercício</Text>

            <Text style={s.inputLabel}>TIPO DE BLOCO</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              {['Normal', 'Biset', 'Triset', 'Superset', 'Pirâmide', 'Dropset'].map((bt) => (
                <TouchableOpacity
                  key={bt}
                  style={[s.blockTypeBtn, editBlockType === bt && s.blockTypeBtnActive]}
                  onPress={() => setEditBlockType(bt)}
                >
                  <Text style={[s.blockTypeBtnText, editBlockType === bt && s.blockTypeBtnTextActive]}>{bt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput style={s.input} value={editName} onChangeText={setEditName} placeholder="Nome" placeholderTextColor={C.text3} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput style={[s.input, { flex: 1 }]} value={editSets} onChangeText={setEditSets} placeholder="Séries" placeholderTextColor={C.text3} keyboardType="numeric" />
              <TextInput style={[s.input, { flex: 1 }]} value={editReps} onChangeText={setEditReps} placeholder="Reps" placeholderTextColor={C.text3} />
            </View>
            <TextInput style={s.input} value={editRest} onChangeText={setEditRest} placeholder="Descanso" placeholderTextColor={C.text3} />
            <TextInput style={s.input} value={editNotes} onChangeText={setEditNotes} placeholder="Observações (opcional)" placeholderTextColor={C.text3} />

            <TouchableOpacity style={s.saveBtn} onPress={saveExerciseEdit}>
              <Text style={s.saveBtnText}>Salvar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 40 },

  header: { alignItems: 'center', paddingVertical: 20 },
  headerTitle: { color: C.text1, fontSize: 26, fontWeight: '900' },
  headerSub: { color: C.text2, fontSize: 14, marginTop: 4 },

  card: { backgroundColor: C.surface, borderRadius: 18, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: C.border },
  cardTitle: { color: C.text1, fontSize: 15, fontWeight: '800', marginBottom: 12 },
  cardSub: { color: C.text3, fontSize: 13, marginBottom: 12 },

  profileRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  profileLabel: { color: C.text2, fontSize: 14 },
  profileValue: { color: C.text1, fontWeight: '700', fontSize: 14 },

  templateRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  templateBadge: { width: 36, height: 36, borderRadius: 12, backgroundColor: C.primaryGlow, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.primary },
  templateBadgeText: { color: C.primaryLight, fontWeight: '800', fontSize: 14 },
  templateLabel: { color: C.text1, fontWeight: '700', fontSize: 14 },
  templateFocus: { color: C.text2, fontSize: 12, marginTop: 2 },

  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: C.border },
  dayDate: { color: C.text3, fontSize: 11, width: 80 },
  dayDow: { color: C.text1, fontWeight: '700', fontSize: 14 },
  dayFocus: { color: C.text2, fontSize: 12 },
  tplPill: { backgroundColor: C.primaryGlow, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: C.primary },
  tplPillText: { color: C.primaryLight, fontSize: 11, fontWeight: '700' },

  confirmBtn: {
    backgroundColor: C.success, borderRadius: 16, paddingVertical: 16,
    alignItems: 'center', marginBottom: 12,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 8,
    shadowColor: C.success,
  },
  confirmBtnDisabled: { opacity: 0.5 },
  confirmBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  footer: { color: C.text3, fontSize: 12, textAlign: 'center', marginBottom: 8 },
  emptyTitle: { color: C.text1, fontSize: 18, fontWeight: '700', marginBottom: 20 },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, borderWidth: 1, borderColor: C.border,
  },
  modalTitle: { color: C.text1, fontSize: 18, fontWeight: '800', marginBottom: 4 },
  modalSub: { color: C.text2, fontSize: 13, marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: C.elevated, alignItems: 'center', borderWidth: 1, borderColor: C.border },
  cancelBtnText: { color: C.text2, fontWeight: '700' },
  saveBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: C.primary, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '800' },

  exRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  exName: { color: C.text1, fontWeight: '700', fontSize: 14 },
  exMeta: { color: C.text2, fontSize: 12 },
  blockBadge: { color: C.primaryLight, fontSize: 11, fontWeight: '700', marginTop: 2 },
  exBtn: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border },
  exBtnText: { color: C.primaryLight, fontSize: 14 },

  // Exercise edit modal
  exModalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', alignItems: 'center' },
  exModalCard: { width: '84%', backgroundColor: C.surface, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: C.border },
  inputLabel: { color: C.text3, fontSize: 11, fontWeight: '700', marginBottom: 6 },
  input: { backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 12, color: C.text1, marginBottom: 10 },
  blockTypeBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: C.elevated, borderWidth: 1, borderColor: C.border },
  blockTypeBtnActive: { backgroundColor: C.primaryGlow, borderColor: C.primary },
  blockTypeBtnText: { color: C.text2, fontSize: 12, fontWeight: '700' },
  blockTypeBtnTextActive: { color: C.primaryLight },
});
