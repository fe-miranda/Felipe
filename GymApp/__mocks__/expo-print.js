// Mock for expo-print
module.exports = {
  printToFileAsync: jest.fn().mockResolvedValue({ uri: '/tmp/test.pdf' }),
  printAsync: jest.fn().mockResolvedValue(undefined),
};
