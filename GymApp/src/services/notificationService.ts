import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let _restNotifId: string | null = null;

export async function setupNotifications(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('rest-timer', {
      name: 'Timer de Descanso',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });
  }
  await Notifications.requestPermissionsAsync();
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

// Workout progress notifications removed — timer runs in-app via AppState
export async function startWorkoutNotification(_elapsed: number = 0): Promise<void> {}
export async function updateWorkoutNotification(_elapsed: number): Promise<void> {}
export async function stopWorkoutNotification(): Promise<void> {}
export function setRestActionCallback(_cb: (() => void) | null): void {}
export function setRestPauseActionCallback(_cb: (() => void) | null): void {}

export async function triggerRestEndAlert(): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Descanso finalizado!',
        body: 'Hora de voltar ao treino 💪',
        sound: 'default',
        data: { type: 'rest-end' },
      },
      trigger: null,
    });
  } catch {}
}
