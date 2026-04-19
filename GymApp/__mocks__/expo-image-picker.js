module.exports = {
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({ canceled: true, assets: [] })),
  launchCameraAsync: jest.fn(() => Promise.resolve({ canceled: true, assets: [] })),
  MediaTypeOptions: { Images: 'Images', Videos: 'Videos', All: 'All' },
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied', UNDETERMINED: 'undetermined' },
};
