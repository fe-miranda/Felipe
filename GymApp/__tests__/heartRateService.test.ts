import {
  SimulatedHeartRateProvider,
  HeartRateService,
  hrZoneColor,
  hrZoneLabel,
  saveHrSamples,
  loadHrSamples,
} from '../src/services/heartRateService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HeartRateSample, HeartRateStatus } from '../src/types';

// ─── hrZoneColor / hrZoneLabel ─────────────────────────────────────────────

describe('hrZoneColor', () => {
  it('returns grey for null', () => {
    expect(hrZoneColor(null)).toBe('#475569');
  });

  it('returns rest color for bpm < 60', () => {
    expect(hrZoneColor(55)).toBe('#94A3B8');
  });

  it('returns green for light zone', () => {
    expect(hrZoneColor(80)).toBe('#10B981');
  });

  it('returns blue for moderate zone', () => {
    expect(hrZoneColor(120)).toBe('#3B82F6');
  });

  it('returns amber for intense zone', () => {
    expect(hrZoneColor(155)).toBe('#F59E0B');
  });

  it('returns red for max zone', () => {
    expect(hrZoneColor(175)).toBe('#EF4444');
  });
});

describe('hrZoneLabel', () => {
  it('returns empty string for null', () => {
    expect(hrZoneLabel(null)).toBe('');
  });

  it('returns correct labels', () => {
    expect(hrZoneLabel(50)).toBe('Repouso');
    expect(hrZoneLabel(80)).toBe('Leve');
    expect(hrZoneLabel(120)).toBe('Moderado');
    expect(hrZoneLabel(155)).toBe('Intenso');
    expect(hrZoneLabel(180)).toBe('Máximo');
  });
});

// ─── Storage helpers ──────────────────────────────────────────────────────

describe('saveHrSamples / loadHrSamples', () => {
  const samples: HeartRateSample[] = [
    { bpm: 72, timestamp: '2026-01-01T00:00:00.000Z' },
    { bpm: 80, timestamp: '2026-01-01T00:00:03.000Z' },
  ];

  it('saves and loads samples correctly', async () => {
    (AsyncStorage.setItem as jest.Mock).mockResolvedValueOnce(undefined);
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(samples));

    await saveHrSamples(samples);
    const loaded = await loadHrSamples();
    expect(loaded).toEqual(samples);
  });

  it('returns empty array when nothing stored', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
    const loaded = await loadHrSamples();
    expect(loaded).toEqual([]);
  });

  it('returns empty array on storage error', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('fail'));
    const loaded = await loadHrSamples();
    expect(loaded).toEqual([]);
  });
});

// ─── SimulatedHeartRateProvider ───────────────────────────────────────────

describe('SimulatedHeartRateProvider', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(async () => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('is always available', async () => {
    const provider = new SimulatedHeartRateProvider();
    await expect(provider.isAvailable()).resolves.toBe(true);
  });

  it('has correct providerName', () => {
    const provider = new SimulatedHeartRateProvider();
    expect(provider.providerName).toBe('Simulated');
  });

  it('emits scanning status before any delays', async () => {
    const provider = new SimulatedHeartRateProvider();
    const statuses: HeartRateStatus[] = [];

    // Start connecting (not awaited yet)
    const connectPromise = provider.connect(
      (status) => statuses.push(status),
      () => {},
    );

    // scanning is emitted synchronously before first delay
    expect(statuses).toContain('scanning');

    // Advance past both delays and clean up
    await jest.advanceTimersByTimeAsync(1500);
    await connectPromise;
    await provider.disconnect();
  });

  it('emits connecting and connected after delays', async () => {
    const provider = new SimulatedHeartRateProvider();
    const statuses: HeartRateStatus[] = [];

    const connectPromise = provider.connect(
      (status) => statuses.push(status),
      () => {},
    );
    await jest.advanceTimersByTimeAsync(1500);
    await connectPromise;

    expect(statuses).toContain('connecting');
    expect(statuses).toContain('connected');

    await provider.disconnect();
  });

  it('emits BPM samples after connecting', async () => {
    const provider = new SimulatedHeartRateProvider();
    const samples: HeartRateSample[] = [];

    const connectPromise = provider.connect(
      () => {},
      (s) => samples.push(s),
    );
    await jest.advanceTimersByTimeAsync(1500);
    await connectPromise;

    // Advance 3 intervals (each 3 s)
    jest.advanceTimersByTime(9000);
    expect(samples.length).toBeGreaterThanOrEqual(3);
    samples.forEach(s => {
      expect(s.bpm).toBeGreaterThanOrEqual(55);
      expect(s.bpm).toBeLessThanOrEqual(185);
    });

    await provider.disconnect();
  });

  it('disconnects cleanly and emits disconnected', async () => {
    const provider = new SimulatedHeartRateProvider();
    const statuses: HeartRateStatus[] = [];

    const connectPromise = provider.connect(
      (status) => statuses.push(status),
      () => {},
    );
    await jest.advanceTimersByTimeAsync(1500);
    await connectPromise;

    await provider.disconnect();
    expect(statuses[statuses.length - 1]).toBe('disconnected');
  });
});

// ─── HeartRateService ─────────────────────────────────────────────────────

describe('HeartRateService', () => {
  it('getState returns an object with required fields', () => {
    const state = HeartRateService.getState();
    expect(state).toHaveProperty('status');
    expect(state).toHaveProperty('bpm');
    expect(state).toHaveProperty('deviceName');
    expect(state).toHaveProperty('error');
    expect(state).toHaveProperty('samples');
  });

  it('subscribe returns an unsubscribe function', () => {
    const listener = jest.fn();
    const unsub = HeartRateService.subscribe(listener);
    expect(typeof unsub).toBe('function');
    unsub();
  });

  it('calls listener immediately with current state on subscribe', () => {
    const listener = jest.fn();
    const unsub = HeartRateService.subscribe(listener);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0]).toHaveProperty('status');
    unsub();
  });

  it('does not call listener after unsubscribe', () => {
    const listener = jest.fn();
    const unsub = HeartRateService.subscribe(listener);
    const callCountBefore = listener.mock.calls.length;
    unsub();

    // Directly access private _setState to trigger notifications
    (HeartRateService as any)._setState({ bpm: 99 });

    expect(listener.mock.calls.length).toBe(callCountBefore);
  });
});
