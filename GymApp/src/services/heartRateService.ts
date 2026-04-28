/**
 * HeartRateService — BLE heart-rate abstraction for Samsung Watch (and others).
 *
 * Architecture:
 *   IHeartRateProvider     → interface that any provider must implement
 *   SimulatedProvider      → fallback used in Expo Go / when BLE is unavailable
 *   BleHeartRateProvider   → real BLE implementation (Galaxy Watch 3 / standard GATT HR profile)
 *   HeartRateService       → singleton orchestrator; auto-selects BLE, falls back to simulated
 *
 * Galaxy Watch 3 exposes the standard Bluetooth GATT Heart Rate Service (0x180D).
 * Galaxy Fit 3 may only expose HR via Samsung Health; if standard BLE HR is not
 * advertised the service will fall back to the simulated provider automatically.
 *
 * Requirements for real BLE (both devices):
 *   • Custom dev build — NOT available in Expo Go:  npx expo run:android  /  eas build
 *   • BLE permissions already declared in app.json
 *   • User must grant Bluetooth + Location permissions at runtime
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BleManager as BleManagerType } from 'react-native-ble-plx';
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

// ─── BLE provider ──────────────────────────────────────────────────────────
//
// Connects to any BLE device advertising the standard Heart Rate GATT service.
// Works with Galaxy Watch 3 (and any device that exposes the standard HR profile).
//
// Requires a custom dev build — not available in Expo Go.
// Run: npx expo run:android  (or eas build)

const HR_SERVICE_UUID = '0000180d-0000-1000-8000-00805f9b34fb';
const HR_CHAR_UUID    = '00002a37-0000-1000-8000-00805f9b34fb';

let _BleManager: typeof import('react-native-ble-plx').BleManager | null = null;
let _BleState: typeof import('react-native-ble-plx').State | null = null;

try {
  // Dynamic require so the module is optional: the app still runs in Expo Go
  // (via SimulatedProvider) and only activates BLE in a real dev/prod build.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const ble = require('react-native-ble-plx');
  _BleManager = ble.BleManager;
  _BleState   = ble.State;
} catch {
  // react-native-ble-plx not available (Expo Go)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Decode a base64 string to a byte array without relying on the global Buffer. */
function _base64ToBytes(base64: string): Uint8Array {
  // atob is available in React Native (Hermes) and modern environments.
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export class BleHeartRateProvider implements IHeartRateProvider {
  readonly providerName = 'BLE';

  private _manager: BleManagerType | null = null;
  private _connectedDeviceId: string | null = null;
  private _subscription: { remove(): void } | null = null;
  private _connecting = false;
  private _onStatus: ((status: HeartRateStatus, deviceName: string | null, err: string | null) => void) | null = null;
  private _onSample: ((s: HeartRateSample) => void) | null = null;

  async isAvailable(): Promise<boolean> {
    if (!_BleManager || !_BleState) return false;
    try {
      const mgr = new _BleManager();
      const state = await mgr.state();
      mgr.destroy();
      return state === _BleState.PoweredOn;
    } catch {
      return false;
    }
  }

  async connect(
    onStatusChange: (status: HeartRateStatus, deviceName: string | null, error: string | null) => void,
    onSample: (sample: HeartRateSample) => void,
  ): Promise<void> {
    if (!_BleManager) {
      onStatusChange('unavailable', null, 'BLE não disponível neste dispositivo.');
      return;
    }

    this._onStatus = onStatusChange;
    this._onSample = onSample;
    this._connecting = false;
    this._manager = new _BleManager();

    onStatusChange('scanning', null, null);

    this._manager.startDeviceScan(
      [HR_SERVICE_UUID],
      { allowDuplicates: false },
      async (error, device) => {
        if (error) {
          onStatusChange('error', null, error.message);
          return;
        }
        // Ignore duplicate callbacks after we've already started connecting
        if (!device || !this._manager || this._connecting) return;
        this._connecting = true;

        // Stop scan and connect to the first device found
        this._manager.stopDeviceScan();
        onStatusChange('connecting', device.name ?? device.id, null);

        try {
          const connected = await this._manager.connectToDevice(device.id);
          this._connectedDeviceId = connected.id;
          await connected.discoverAllServicesAndCharacteristics();
          onStatusChange('connected', connected.name ?? connected.id, null);

          // Subscribe to heart rate measurement notifications
          this._subscription = connected.monitorCharacteristicForService(
            HR_SERVICE_UUID,
            HR_CHAR_UUID,
            (charError, characteristic) => {
              if (charError) {
                onStatusChange('error', connected.name ?? connected.id, charError.message);
                return;
              }
              if (!characteristic?.value) return;

              try {
                // Decode base64 → bytes (HR Measurement characteristic, BT spec §3.113)
                const bytes = _base64ToBytes(characteristic.value);
                const flags = bytes[0];
                // bit 0 of flags: 0 = 8-bit HR value, 1 = 16-bit HR value
                const bpm = (flags & 0x01) === 0
                  ? bytes[1]
                  : bytes[1] | (bytes[2] << 8);

                const sample: HeartRateSample = {
                  bpm,
                  timestamp: new Date().toISOString(),
                };
                this._onSample?.(sample);
              } catch {
                // Malformed characteristic — ignore
              }
            },
          );
        } catch (connectError: unknown) {
          this._connecting = false;
          const msg = connectError instanceof Error ? connectError.message : 'Falha ao conectar';
          onStatusChange('error', null, msg);
        }
      },
    );
  }

  async disconnect(): Promise<void> {
    this._subscription?.remove();
    this._subscription = null;
    this._manager?.stopDeviceScan();
    // Gracefully cancel any active device connection before destroying the manager
    if (this._manager && this._connectedDeviceId) {
      try {
        await this._manager.cancelDeviceConnection(this._connectedDeviceId);
      } catch {
        // Ignore errors during cleanup
      }
    }
    this._connectedDeviceId = null;
    this._connecting = false;
    this._manager?.destroy();
    this._manager = null;
    this._onStatus?.('disconnected', null, null);
    this._onStatus = null;
    this._onSample = null;
  }
}

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

    // Try BLE first; fall back to simulated if Bluetooth is off or unavailable.
    const bleProvider = new BleHeartRateProvider();
    if (await bleProvider.isAvailable()) {
      this._provider = bleProvider;
    } else {
      this._provider = new SimulatedHeartRateProvider();
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
