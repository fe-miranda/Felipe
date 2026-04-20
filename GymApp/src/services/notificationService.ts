import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const type = notification.request.content.data?.type;
    if (type === 'workout-active') {
      return {
        shouldShowAlert: false,
        shouldPlaySound: false,
        shouldSetBadge: false,
        shouldShowBanner: false,
        shouldShowList: true,
      };
    }
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

const WORKOUT_NOTIF_ID = 'gymapp-workout-active';
const REST_CATEGORY_ID = 'workout-active';
let _lastWorkoutMinuteNotified = -1;

let _restNotifId: string | null = null;
let _restActionStartCb: (() => void) | null = null;
let _restActionPauseCb: (() => void) | null = null;
let _responseListener: Notifications.EventSubscription | null = null;

function fmtElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function setRestActionCallback(cb: (() => void) | null): void {
  _restActionStartCb = cb;
}

export function setRestPauseActionCallback(cb: (() => void) | null): void {
  _restActionPauseCb = cb;
}

export async function setupNotifications(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('rest-timer', {
      name: 'Timer de Descanso',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync('workout-active', {
      name: 'Treino Ativo',
      importance: Notifications.AndroidImportance.LOW,
      sound: null,
      vibrationPattern: [0],
    });
  }

  await Notifications.requestPermissionsAsync();

  await Notifications.setNotificationCategoryAsync(REST_CATEGORY_ID, [
    {
      identifier: 'START_REST',
      buttonTitle: '▶ Iniciar Descanso',
      options: { opensAppToForeground: true },
    },
    {
      identifier: 'PAUSE_REST',
      buttonTitle: '⏸ Pausar Descanso',
      options: { opensAppToForeground: true },
    },
  ]);

  if (!_responseListener) {
    _responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      if (response.actionIdentifier === 'START_REST' && _restActionStartCb) _restActionStartCb();
      if (response.actionIdentifier === 'PAUSE_REST' && _restActionPauseCb) _restActionPauseCb();
    });
  }
}

export async function startWorkoutNotification(elapsedSeconds: number = 0): Promise<void> {
  try {
    const startedAt = new Date(Date.now() - elapsedSeconds * 1000);
    const startedAtLabel = startedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    await Notifications.scheduleNotificationAsync({
      identifier: WORKOUT_NOTIF_ID,
      content: {
        title: '💪 Treino em andamento',
        body: `Iniciado às ${startedAtLabel} · Timer ativo`,
        sound: undefined,
        categoryIdentifier: REST_CATEGORY_ID,
        data: { type: 'workout-active' },
        sticky: true,
        autoDismiss: false,
      },
      trigger: null,
    });
  } catch {
    // Notifications not available — fail silently
  }
}

export async function updateWorkoutNotification(elapsedSeconds: number): Promise<void> {
  const minute = Math.floor(elapsedSeconds / 60);
  if (minute === _lastWorkoutMinuteNotified) return;
  _lastWorkoutMinuteNotified = minute;
  await startWorkoutNotification(elapsedSeconds);
}

export async function stopWorkoutNotification(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(WORKOUT_NOTIF_ID);
    await Notifications.dismissNotificationAsync(WORKOUT_NOTIF_ID);
  } catch {}
  _lastWorkoutMinuteNotified = -1;
}

export async function scheduleRestEndNotification(seconds: number): Promise<void> {
  await cancelRestNotification();
  try {
    _restNotifId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Descansou!',
        body: 'Hora de voltar ao treino 💪',
        sound: 'default',
        data: { type: 'rest-end' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(seconds)),
        repeats: false,
      },
    });
  } catch {
    // Notifications not available — fail silently
  }
}

export async function cancelRestNotification(): Promise<void> {
  if (_restNotifId) {
    try { await Notifications.cancelScheduledNotificationAsync(_restNotifId); } catch {}
    _restNotifId = null;
  }
}

export async function triggerRestEndAlert(): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Descanso finalizado',
        body: 'Hora de voltar ao treino 💪',
        sound: 'default',
        data: { type: 'rest-end' },
      },
      trigger: null,
    });
  } catch {
    // Notifications not available — fail silently
  }
}
