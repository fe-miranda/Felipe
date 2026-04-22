import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';
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
    if (type === 'rest-end') {
      return {
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
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

// Play a short beep through the active audio output (headphones / Bluetooth).
// Falls back silently if expo-av is unavailable.
async function playRestEndSound(): Promise<void> {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: false,
    });
    const { sound } = await Audio.Sound.createAsync(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('../../assets/rest_end_beep.wav'),
      { shouldPlay: true, volume: 1.0 },
    );
    sound.setOnPlaybackStatusUpdate((status) => {
      if (!status.isLoaded) return;
      if (status.didJustFinish) sound.unloadAsync().catch(() => {});
    });
  } catch {
    // Fail silently – notification sound will still fire for background case
  }
}

export function setRestActionCallback(cb: (() => void) | null): void {
  _restActionStartCb = cb;
}

export function setRestPauseActionCallback(cb: (() => void) | null): void {
  _restActionPauseCb = cb;
}

export async function setupNotifications(): Promise<void> {
  if (Platform.OS === 'android') {
    // Use ALARM audio usage (usage=4) so the sound plays even when the phone
    // is on silent or vibrate mode — same behaviour as media/music playback.
    await Notifications.setNotificationChannelAsync('rest-timer', {
      name: 'Alarme de Descanso',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
      bypassDnd: true,
      // audioAttributes.usage=4 → USAGE_ALARM (bypasses ringer/silent/vibrate)
      audioAttributes: {
        usage: (Notifications as any).AndroidAudioUsage?.ALARM ?? 4,
        contentType: (Notifications as any).AndroidAudioContentType?.SONIFICATION ?? 4,
      },
      lockscreenVisibility: (Notifications as any).AndroidNotificationVisibility?.PUBLIC ?? 1,
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

export async function startWorkoutNotification(_elapsedSeconds: number = 0): Promise<void> {
  // no-op
}

export async function updateWorkoutNotification(_elapsedSeconds: number): Promise<void> {
  // no-op
}

export async function stopWorkoutNotification(): Promise<void> {
  // no-op
}

export async function scheduleRestEndNotification(seconds: number): Promise<void> {
  await cancelRestNotification();
  try {
    _restNotifId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Descansou!',
        body: 'Hora de voltar ao treino 💪',
        sound: 'default',
        // iOS: request sound even in "Do Not Disturb" (requires entitlement for
        // truly critical alerts, but this maximises chances of audible playback)
        ...(Platform.OS === 'ios' ? { interruptionLevel: 'timeSensitive' } : {}),
        data: { type: 'rest-end' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(seconds)),
        repeats: false,
        // Android: use the ALARM channel so it rings even in silent/vibrate mode
        ...(Platform.OS === 'android' ? { channelId: 'rest-timer' } : {}),
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
  // Play sound directly through the active audio output (headphones / Bluetooth).
  await playRestEndSound();
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Descanso finalizado',
        body: 'Hora de voltar ao treino 💪',
        sound: 'default',
        ...(Platform.OS === 'ios' ? { interruptionLevel: 'timeSensitive' } : {}),
        data: { type: 'rest-end' },
      },
      trigger: Platform.OS === 'android'
        ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 1, repeats: false, channelId: 'rest-timer' }
        : null,
    });
  } catch {
    // Notifications not available — fail silently
  }
}
