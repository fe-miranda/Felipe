import { renderHook, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { usePlan } from '../src/hooks/usePlan';
import * as aiService from '../src/services/aiService';
import type { UserProfile, AnnualPlan } from '../src/types';

// ─── Mocks ─────────────────────────────────────────────────────────────────

jest.mock('../src/services/aiService');

const mockProfile: UserProfile = {
  name: 'Ana',
  age: 25,
  weight: 60,
  height: 165,
  gender: 'female',
  goal: 'lose_weight',
  fitnessLevel: 'beginner',
  daysPerWeek: 3,
};

const mockPlan: AnnualPlan = {
  userId: 'Ana',
  createdAt: '2026-01-01T00:00:00.000Z',
  userProfile: mockProfile,
  totalMonths: 12,
  overallGoal: 'Perder 5kg em 12 meses',
  monthlyBlocks: [],
  nutritionTips: ['Comer menos calorias'],
  recoveryTips: ['Descansar bem'],
};

// ─── Setup ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage.clear as jest.Mock)();
});

// ─── loadStoredPlan ────────────────────────────────────────────────────────

describe('usePlan — loadStoredPlan', () => {
  it('returns false when no plan is stored', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

    const { result } = renderHook(() => usePlan());

    let found: boolean | undefined;
    await act(async () => {
      found = await result.current.loadStoredPlan();
    });

    expect(found).toBe(false);
    expect(result.current.plan).toBeNull();
  });

  it('returns true and sets plan when stored plan exists', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockPlan));

    const { result } = renderHook(() => usePlan());

    let found: boolean | undefined;
    await act(async () => {
      found = await result.current.loadStoredPlan();
    });

    expect(found).toBe(true);
    expect(result.current.plan?.userId).toBe('Ana');
    expect(result.current.plan?.overallGoal).toBe(mockPlan.overallGoal);
  });

  it('returns false on AsyncStorage error', async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

    const { result } = renderHook(() => usePlan());

    let found: boolean | undefined;
    await act(async () => {
      found = await result.current.loadStoredPlan();
    });

    expect(found).toBe(false);
  });
});

// ─── generate ─────────────────────────────────────────────────────────────

describe('usePlan — generate', () => {
  it('generates plan, saves to AsyncStorage, updates state', async () => {
    (aiService.generateAnnualPlan as jest.Mock).mockResolvedValueOnce(mockPlan);

    const { result } = renderHook(() => usePlan());

    let generatedPlan: AnnualPlan | undefined;
    await act(async () => {
      generatedPlan = await result.current.generate(mockProfile);
    });

    expect(generatedPlan?.userId).toBe('Ana');
    expect(result.current.plan?.userId).toBe('Ana');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@gymapp_plan',
      JSON.stringify(mockPlan)
    );
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@gymapp_profile',
      JSON.stringify(mockProfile)
    );
  });

  it('sets loading=true during generation', async () => {
    let resolveGenerate!: (v: AnnualPlan) => void;
    const generatePromise = new Promise<AnnualPlan>((res) => { resolveGenerate = res; });
    (aiService.generateAnnualPlan as jest.Mock).mockReturnValueOnce(generatePromise);

    const { result } = renderHook(() => usePlan());

    act(() => { result.current.generate(mockProfile); });

    // loading should be true while promise is pending
    expect(result.current.loading).toBe(true);

    await act(async () => { resolveGenerate(mockPlan); });

    expect(result.current.loading).toBe(false);
  });

  it('sets error state and rethrows on failure', async () => {
    (aiService.generateAnnualPlan as jest.Mock).mockRejectedValueOnce(
      new Error('Erro de conexão')
    );

    const { result } = renderHook(() => usePlan());

    await act(async () => {
      await expect(result.current.generate(mockProfile)).rejects.toThrow('Erro de conexão');
    });

    expect(result.current.error).toBe('Erro de conexão');
    expect(result.current.loading).toBe(false);
    expect(result.current.plan).toBeNull();
  });

  it('calls onProgress callback via generateAnnualPlan', async () => {
    (aiService.generateAnnualPlan as jest.Mock).mockImplementationOnce(
      async (_profile: UserProfile, onProgress?: (s: string) => void) => {
        onProgress?.('Gerando...');
        return mockPlan;
      }
    );

    const { result } = renderHook(() => usePlan());

    await act(async () => {
      await result.current.generate(mockProfile);
    });

    expect(result.current.progress).toBe('Gerando...');
  });
});

// ─── clearPlan ─────────────────────────────────────────────────────────────

describe('usePlan — clearPlan', () => {
  it('removes plan from AsyncStorage and resets state', async () => {
    (aiService.generateAnnualPlan as jest.Mock).mockResolvedValueOnce(mockPlan);

    const { result } = renderHook(() => usePlan());

    await act(async () => {
      await result.current.generate(mockProfile);
    });

    expect(result.current.plan).not.toBeNull();

    await act(async () => {
      await result.current.clearPlan();
    });

    expect(result.current.plan).toBeNull();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@gymapp_plan');
  });
});

// ─── saveProfile / loadProfile ────────────────────────────────────────────

describe('usePlan — saveProfile / loadProfile', () => {
  it('saves and loads profile correctly', async () => {
    const { result } = renderHook(() => usePlan());

    await act(async () => {
      await result.current.saveProfile(mockProfile);
    });

    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockProfile));

    let loadedProfile;
    await act(async () => {
      loadedProfile = await result.current.loadProfile();
    });

    expect(loadedProfile).toEqual(mockProfile);
  });

  it('returns null when no profile is stored', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

    const { result } = renderHook(() => usePlan());

    let loadedProfile;
    await act(async () => {
      loadedProfile = await result.current.loadProfile();
    });

    expect(loadedProfile).toBeNull();
  });
});
