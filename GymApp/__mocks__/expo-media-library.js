module.exports = {
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  saveToLibraryAsync: jest.fn(() => Promise.resolve()),
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied', UNDETERMINED: 'undetermined' },
};
