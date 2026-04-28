const State = {
  Unknown: 'Unknown',
  Resetting: 'Resetting',
  Unsupported: 'Unsupported',
  Unauthorized: 'Unauthorized',
  PoweredOff: 'PoweredOff',
  PoweredOn: 'PoweredOn',
};

class BleManager {
  startDeviceScan = jest.fn();
  stopDeviceScan = jest.fn();
  connectToDevice = jest.fn().mockResolvedValue({
    discoverAllServicesAndCharacteristics: jest.fn().mockResolvedValue({}),
    monitorCharacteristicForService: jest.fn().mockReturnValue({ remove: jest.fn() }),
    cancelConnection: jest.fn().mockResolvedValue({}),
    id: 'mock-device-id',
    name: 'Mock HR Monitor',
  });
  state = jest.fn().mockResolvedValue(State.PoweredOn);
  destroy = jest.fn();
}

module.exports = { BleManager, State };
