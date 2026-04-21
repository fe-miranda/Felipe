module.exports = {
  Audio: {
    Sound: {
      createAsync: jest.fn(() => Promise.resolve({ sound: { playAsync: jest.fn(), unloadAsync: jest.fn() } })),
    },
    setAudioModeAsync: jest.fn(() => Promise.resolve()),
    RECORDING_OPTIONS_PRESET_HIGH_QUALITY: {},
  },
  Video: {},
};
