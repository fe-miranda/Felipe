/**
 * HeartRateService — BLE heart-rate abstraction for Samsung Watch (and others).
 *
 * Architecture:
 *   IHeartRateProvider  → interface that any provider must implement
 *   SimulatedProvider   → fallback used in Expo Go / when BLE is unavailable
 *   BleProvider (stub)  → placeholder showing where react-native-ble-plx would plug in
 *   HeartRateService    → singleton orchestrator exposed to the rest of the app
 *
 * For production Samsung BLE support you would:
 *   1. `expo install react-native-ble-plx`  (requires custom dev client / bare workflow)
 *   2. Add BLE permissions to app.json plugins
 *   3. Implement BleProvider using BleManager from react-native-ble-plx
 *      scanning for HR Service UUID 0x180D, characteristic 0x2A37.
 *
 * This file works in Expo Go / managed workflow via the SimulatedProvider.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { HeartRateSample, HeartRateState, HeartRateStatus } from '../types';

// ─── Storage ─────────────────────────────────────────────────────────────────

const HR_SAMPLES_KEY = '@gymapp_hr_samples';
const MAX_STORED_SAMPLES = 200;

export async function saveHrSamples(samples: HeartRateSample[]): Promise<void> {
  try {
    await AsyncStorage.setItem(HR_SAMPLES_KEY, JSON.stringify(samples));
  } catch {
    // silently ignore storage errors
  }
}

export async function loadHrSamples(): Promise<HeartRateSample[]> {
  try {
    const raw = await AsyncStorage.getItem(HR_SAMPLES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HeartRateSample[];
  } catch {
    return [];
  }
}

// ─── Provider interface ───────────────────────────────────────────────────────

export interface IHeartRateProvider {
  /** Human-readable name for this provider, e.g. "BLE" or "Simulated". */
  readonly providerName: string;

  /** Whether this provider can operate in the current environment. */
  isAvailable(): Promise<boolean>;

  /**
   * Start scanning for heart-rate devices.
   * @param onStatusChange  called whenever provider status changes
   * @param onSample        called when a new BPM reading arrives
   */
  connect(
    onStatusChange: (status: HeartRateStatus, deviceName: string | null, error: string | null) => void,
    onSample: (sample: HeartRateSample) => void,
  ): Promise<void>;

  /** Disconnect / stop scanning / clean up. */
  disconnect(): Promise<void>;
}

// ─── Simulated provider ───────────────────────────────────────────────────────

/**
 * Generates realistic-looking synthetic heart-rate readings.
 * Used when BLE is unavailable (Expo Go, simulator, no watch paired).
 */
export class SimulatedHeartRateProvider implements IHeartRateProvider {
  readonly providerName = 'Simulated';

  private _intervalId: ReturnType<typeof setInterval> | null = null;
  private _baseBpm = 72;
  private _onStatus: ((status: HeartRateStatus, deviceName: string | null, err: string | null) => void) | null = null;
  private _onSample: ((s: HeartRateSample) => void) | null = null;

  async isAvailable(): Promise<boolean> {
    return true; // always available as fallback
  }

  async connect(
    onStatusChange: (status: HeartRateStatus, deviceName: string | null, error: string | null) => void,
    onSample: (sample: HeartRateSample) => void,
  ): Promise<void> {
    this._onStatus = onStatusChange;
    this._onSample = onSample;

    onStatusChange('scanning', null, null);

    await _delay(800);
    onStatusChange('connecting', 'Galaxy Watch (sim)', null);

    await _delay(600);
    onStatusChange('connected', 'Galaxy Watch (sim)', null);

    // Emit readings every 3 s with ±5 bpm random walk
    this._intervalId = setInterval(() => {
      this._baseBpm = Math.max(55, Math.min(185, this._baseBpm + (Math.random() * 10 - 5)));
      const sample: HeartRateSample = {
        bpm: Math.round(this._baseBpm),
        timestamp: new Date().toISOString(),
      };
      this._onSample?.(sample);
    }, 3000);
  }

  async disconnect(): Promise<void> {
    if (this._intervalId !== null) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
    this._onStatus?.('disconnected', null, null);
    this._onStatus = null;
    this._onSample = null;
  }
}

// ─── BLE provider stub ─────────────────────────────────────────────────────
//
// To enable real BLE:
//   1. Run: npx expo install react-native-ble-plx
//   2. Add to app.json plugins: ["react-native-ble-plx"]
//   3. Implement this class using BleManager:
//
//   import { BleManager, Device } from 'react-native-ble-plx';
//   const HR_SERVICE_UUID   = '0000180d-0000-1000-8000-00805f9b34fb';
//   const HR_CHAR_UUID      = '00002a37-0000-1000-8000-00805f9b34fb';
//
//   connect(): scan for devices advertising HR_SERVICE_UUID,
//              connect to first found (or remembered device),
//              subscribe to HR_CHAR_UUID notifications,
//              parse the Heart Rate Measurement characteristic (spec §3.113).

// ─── Service singleton ────────────────────────────────────────────────────────

type Listener = (state: HeartRateState) => void;

class HeartRateServiceClass {
  private _provider: IHeartRateProvider = new SimulatedHeartRateProvider();
  private _state: HeartRateState = {
    status: 'idle',
    bpm: null,
    deviceName: null,
    error: null,
    samples: [],
  };
  private _listeners = new Set<Listener>();

  /** Override the provider (useful for testing or enabling BLE in production). */
  setProvider(provider: IHeartRateProvider): void {
    this._provider = provider;
  }

  getState(): HeartRateState {
    return { ...this._state };
  }

  subscribe(listener: Listener): () => void {
    this._listeners.add(listener);
    listener(this.getState());
    return () => this._listeners.delete(listener);
  }

  async connect(): Promise<void> {
    if (this._state.status === 'connected' || this._state.status === 'connecting' || this._state.status === 'scanning') {
      return;
    }

    const available = await this._provider.isAvailable();
    if (!available) {
      this._setState({ status: 'unavailable', error: 'BLE não disponível neste dispositivo.', bpm: null, deviceName: null });
      return;
    }

    // Reload previous samples
    const stored = await loadHrSamples();
    this._setState({ samples: stored });

    await this._provider.connect(
      (status, deviceName, error) => {
        this._setState({ status, deviceName: deviceName ?? null, error, bpm: status === 'disconnected' ? null : this._state.bpm });
      },
      (sample) => {
        const samples = [sample, ...this._state.samples].slice(0, MAX_STORED_SAMPLES);
        this._setState({ bpm: sample.bpm, samples });
        saveHrSamples(samples); // async, fire-and-forget
      },
    );
  }

  async disconnect(): Promise<void> {
    await this._provider.disconnect();
  }

  private _setState(partial: Partial<HeartRateState>): void {
    this._state = { ...this._state, ...partial };
    const snap = this.getState();
    this._listeners.forEach(l => l(snap));
  }
}

export const HeartRateService = new HeartRateServiceClass();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function hrZoneLabel(bpm: number | null): string {
  if (bpm === null) return '';
  if (bpm < 60)  return 'Repouso';
  if (bpm < 100) return 'Leve';
  if (bpm < 140) return 'Moderado';
  if (bpm < 170) return 'Intenso';
  return 'Máximo';
}

export function hrZoneColor(bpm: number | null): string {
  if (bpm === null) return '#475569';
  if (bpm < 60)  return '#94A3B8';
  if (bpm < 100) return '#10B981';
  if (bpm < 140) return '#3B82F6';
  if (bpm < 170) return '#F59E0B';
  return '#EF4444';
}
