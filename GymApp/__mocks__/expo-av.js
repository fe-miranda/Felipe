const Sound = {
  createAsync: jest.fn().mockResolvedValue({
    sound: {
      setOnPlaybackStatusUpdate: jest.fn(),
      unloadAsync: jest.fn().mockResolvedValue(undefined),
    },
  }),
};

const Audio = {
  Sound,
  setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
};

module.exports = { Audio };
