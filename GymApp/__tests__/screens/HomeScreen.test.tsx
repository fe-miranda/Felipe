import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { HomeScreen } from '../../src/screens/HomeScreen';
import { usePlan } from '../../src/hooks/usePlan';
import * as workoutHistoryService from '../../src/services/workoutHistoryService';

// ─── Mocks ─────────────────────────────────────────────────────────────────

jest.mock('../../src/hooks/usePlan');
jest.mock('../../src/services/workoutHistoryService');
jest.mock('../../src/services/aiService', () => ({
  getDailySuggestion: jest.fn().mockResolvedValue(null),
  generateCustomWorkout: jest.fn(),
  setRuntimeApiKey: jest.fn(),
}));

// useFocusEffect requires a NavigationContainer; stub it to just run the callback once
jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  const mockReact = require('react');
  return {
    ...actual,
    useFocusEffect: (cb: () => void) => {
      mockReact.useEffect(() => { cb(); }, []);
    },
  };
});

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  replace: mockReplace,
  goBack: jest.fn(),
};

const mockLoadStoredPlan = jest.fn().mockResolvedValue(false);
const mockClearPlan = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert');
  (AsyncStorage.clear as jest.Mock)();
  (workoutHistoryService.loadHistory as jest.Mock).mockResolvedValue([]);
});

// ─── Empty state (no plan) ──────────────────────────────────────────────────

describe('HomeScreen — empty state (no plan)', () => {
  beforeEach(() => {
    (usePlan as jest.Mock).mockReturnValue({
      plan: null,
      loadStoredPlan: mockLoadStoredPlan,
      clearPlan: mockClearPlan,
      loading: false,
      error: null,
    });
  });

  it('shows "Nenhum plano encontrado" message when there is no plan', async () => {
    const { findByText } = render(
      <HomeScreen navigation={mockNavigation as any} />
    );
    expect(await findByText('Nenhum plano encontrado')).toBeTruthy();
  });

  it('shows "Criar Plano Agora" button when there is no plan', async () => {
    const { findByText } = render(
      <HomeScreen navigation={mockNavigation as any} />
    );
    expect(await findByText('Criar Plano Agora')).toBeTruthy();
  });

  it('navigates to NewPlan when "Criar Plano Agora" is pressed', async () => {
    const { findByText } = render(
      <HomeScreen navigation={mockNavigation as any} />
    );

    const btn = await findByText('Criar Plano Agora');
    await act(async () => {
      fireEvent.press(btn);
    });

    expect(mockReplace).toHaveBeenCalledWith('NewPlan');
  });

  it('calls loadStoredPlan on mount', async () => {
    render(<HomeScreen navigation={mockNavigation as any} />);
    await waitFor(() => {
      expect(mockLoadStoredPlan).toHaveBeenCalledTimes(1);
    });
  });
});

// ─── With plan ──────────────────────────────────────────────────────────────

const mockPlan = {
  userId: 'Test',
  createdAt: new Date().toISOString(),
  userProfile: {
    name: 'Test User',
    age: 25,
    weight: 70,
    height: 170,
    gender: 'male',
    goal: 'gain_muscle',
    fitnessLevel: 'intermediate',
    daysPerWeek: 3,
    workoutDuration: 60,
    cardioMinutes: 10,
  },
  totalMonths: 3,
  overallGoal: 'Ganhar músculo em 3 meses',
  monthlyBlocks: [
    {
      month: 1, monthName: 'Janeiro', focus: 'Base', description: 'Fase de base',
      weeks: [], progressIndicators: [],
    },
    {
      month: 2, monthName: 'Fevereiro', focus: 'Evolução', description: 'Fase de evolução',
      weeks: [], progressIndicators: [],
    },
    {
      month: 3, monthName: 'Março', focus: 'Intensidade', description: 'Fase de intensidade',
      weeks: [], progressIndicators: [],
    },
  ],
  nutritionTips: ['Comer proteína suficiente'],
  recoveryTips: ['Dormir 8 horas'],
};

describe('HomeScreen — with plan', () => {
  beforeEach(() => {
    (usePlan as jest.Mock).mockReturnValue({
      plan: mockPlan,
      loadStoredPlan: mockLoadStoredPlan,
      clearPlan: mockClearPlan,
      loading: false,
      error: null,
    });
  });

  it('renders the greeting with the user name', async () => {
    const { findByText } = render(
      <HomeScreen navigation={mockNavigation as any} />
    );
    expect(await findByText(/Test User/)).toBeTruthy();
  });

  it('renders the today workout button', async () => {
    const { findByText } = render(
      <HomeScreen navigation={mockNavigation as any} />
    );
    expect(await findByText(/Acessar Seu Treino de Hoje/)).toBeTruthy();
  });

  it('renders the plan access button', async () => {
    const { findByText } = render(
      <HomeScreen navigation={mockNavigation as any} />
    );
    expect(await findByText(/Acessar Seu Plano de Treinos/)).toBeTruthy();
  });

  it('renders the performance analysis button', async () => {
    const { findByText } = render(
      <HomeScreen navigation={mockNavigation as any} />
    );
    expect(await findByText(/Analisar Desempenho/)).toBeTruthy();
  });

  it('renders the Coach IA card', async () => {
    const { findByText } = render(
      <HomeScreen navigation={mockNavigation as any} />
    );
    expect(await findByText('Coach IA')).toBeTruthy();
  });

  it('renders the quick workouts section', async () => {
    const { findByText } = render(
      <HomeScreen navigation={mockNavigation as any} />
    );
    expect(await findByText(/Treinos Rápidos/)).toBeTruthy();
  });

  it('renders the recent history section', async () => {
    const { findByText } = render(
      <HomeScreen navigation={mockNavigation as any} />
    );
    expect(await findByText(/Histórico Recente/)).toBeTruthy();
  });

  it('shows the month grid with correct month count', async () => {
    const { findByText } = render(
      <HomeScreen navigation={mockNavigation as any} />
    );
    // "Plano de 3 Meses"
    expect(await findByText(/Plano de 3/)).toBeTruthy();
  });

  it('navigates to PerformanceAnalysis when analysis button is pressed', async () => {
    const { findByText } = render(
      <HomeScreen navigation={mockNavigation as any} />
    );

    const btn = await findByText(/Analisar Desempenho/);
    await act(async () => {
      fireEvent.press(btn);
    });

    expect(mockNavigate).toHaveBeenCalledWith('PerformanceAnalysis');
  });

  it('navigates to Chat when Coach IA card is pressed', async () => {
    const { findByText } = render(
      <HomeScreen navigation={mockNavigation as any} />
    );

    const chatCard = await findByText('Coach IA');
    await act(async () => {
      fireEvent.press(chatCard);
    });

    expect(mockNavigate).toHaveBeenCalledWith('Chat');
  });

  it('shows empty history message when no workouts have been done', async () => {
    const { findByText } = render(
      <HomeScreen navigation={mockNavigation as any} />
    );
    expect(await findByText(/Nenhum treino registrado ainda/)).toBeTruthy();
  });

  it('confirms before clearing plan', async () => {
    const { findByText } = render(
      <HomeScreen navigation={mockNavigation as any} />
    );

    const btn = await findByText('Novo Plano');
    await act(async () => {
      fireEvent.press(btn);
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Novo Plano',
      expect.any(String),
      expect.any(Array)
    );
  });

  it('renders muscle fatigue link card', async () => {
    const { findByText } = render(
      <HomeScreen navigation={mockNavigation as any} />
    );
    expect(await findByText('Fadiga Muscular')).toBeTruthy();
  });

  it('navigates to MuscleFatigue when fatigue card is pressed', async () => {
    const { findByText } = render(
      <HomeScreen navigation={mockNavigation as any} />
    );

    const btn = await findByText('Fadiga Muscular');
    await act(async () => {
      fireEvent.press(btn);
    });

    expect(mockNavigate).toHaveBeenCalledWith('MuscleFatigue');
  });
});
