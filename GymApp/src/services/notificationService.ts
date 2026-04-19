import * as Notifications from 'expo-notifications';

const WORKOUT_CHANNEL_ID = 'workout';
const WORKOUT_NOTIF_ID = 'workout-active';
const REST_NOTIF_ID = 'rest-countdown';

// Configure how notifications are presented when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** Request notification permissions. Returns true if granted. */
export async function requestNotificationPermissions(): Promise<boolean> {
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/** Create Android notification channel for workout alerts. */
async function ensureWorkoutChannel(): Promise<void> {
  try {
    await Notifications.setNotificationChannelAsync(WORKOUT_CHANNEL_ID, {
      name: 'Treino',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });
  } catch {
    // not on Android or channel already exists — ignore
  }
}

/**
 * Show a persistent "workout in progress" notification.
 * Call this when the user starts a workout session.
 */
export async function showWorkoutStartedNotification(workoutFocus: string): Promise<void> {
  try {
    const granted = await requestNotificationPermissions();
    if (!granted) return;
    await ensureWorkoutChannel();
    await Notifications.scheduleNotificationAsync({
      identifier: WORKOUT_NOTIF_ID,
      content: {
        title: '💪 Treino em andamento',
        body: workoutFocus,
        sticky: false,
        data: { type: 'workout_active' },
      },
      trigger: null, // immediate
    });
  } catch {
    // fail silently — notifications are a UX enhancement, not critical
  }
}

/**
 * Schedule a notification that fires when the rest period ends.
 * Also shows an immediate "resting" notification so the user can
 * see the countdown on the lock screen.
 *
 * @param restSeconds  Duration of the rest period in seconds.
 * @param workoutFocus Name of the current workout focus (used for context).
 */
export async function scheduleRestEndNotification(
  restSeconds: number,
  workoutFocus: string,
): Promise<void> {
  try {
    const granted = await requestNotificationPermissions();
    if (!granted) return;
    await ensureWorkoutChannel();

    // Cancel any previous rest notification first
    await Notifications.cancelScheduledNotificationAsync(REST_NOTIF_ID).catch(() => {});

    // Schedule the "rest over" alert to fire when the countdown hits zero
    await Notifications.scheduleNotificationAsync({
      identifier: REST_NOTIF_ID,
      content: {
        title: '⏰ Descanso terminado!',
        body: `Hora da próxima série — ${workoutFocus}`,
        sound: 'default',
        data: { type: 'rest_end' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: restSeconds,
      },
    });
  } catch {
    // fail silently
  }
}

/**
 * Cancel the pending rest-end notification (e.g. user ended rest early).
 */
export async function cancelRestNotification(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(REST_NOTIF_ID);
    await Notifications.dismissNotificationAsync(REST_NOTIF_ID);
  } catch {
    // ignore if notification doesn't exist
  }
}

/**
 * Cancel all workout-related notifications.
 * Call this when the workout is finished or abandoned.
 */
export async function cancelAllWorkoutNotifications(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(REST_NOTIF_ID).catch(() => {});
    await Notifications.cancelScheduledNotificationAsync(WORKOUT_NOTIF_ID).catch(() => {});
    await Notifications.dismissAllNotificationsAsync();
  } catch {
    // fail silently
  }
}
