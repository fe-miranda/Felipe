const AndroidImportance = { HIGH: 5, DEFAULT: 3, LOW: 2, MIN: 1, MAX: 5 };
const SchedulableTriggerInputTypes = { TIME_INTERVAL: 'timeInterval', DATE: 'date' };

module.exports = {
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(null),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('mock-notification-id'),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  AndroidImportance,
  SchedulableTriggerInputTypes,
};
