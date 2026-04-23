import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { OnboardingScreen } from '../../src/screens/OnboardingScreen';
import { usePlan } from '../../src/hooks/usePlan';

// ─── Mocks ─────────────────────────────────────────────────────────────────

jest.mock('../../src/hooks/usePlan');
jest.mock('@react-navigation/native-stack');

const mockNavigate = jest.fn();
const mockReplace = jest.fn();

const mockNavigation = {
  navigate: mockNavigate,
  replace: mockReplace,
  goBack: jest.fn(),
};

const mockGenerate = jest.fn();
const mockLoadStoredPlan = jest.fn().mockResolvedValue(false);

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert');

  (usePlan as jest.Mock).mockReturnValue({
    generate: mockGenerate,
    loadStoredPlan: mockLoadStoredPlan,
    plan: null,
  });
});

// ─── Render ────────────────────────────────────────────────────────────────

describe('OnboardingScreen — rendering', () => {
  it('renders all required input fields', () => {
    const { getByTestId } = render(
      <OnboardingScreen navigation={mockNavigation as any} />
    );

    expect(getByTestId('input-name')).toBeTruthy();
    expect(getByTestId('input-age')).toBeTruthy();
    expect(getByTestId('input-weight')).toBeTruthy();
    expect(getByTestId('input-height')).toBeTruthy();
    expect(getByTestId('btn-generate')).toBeTruthy();
  });

  it('renders all goal options', () => {
    const { getByTestId } = render(
      <OnboardingScreen navigation={mockNavigation as any} />
    );

    expect(getByTestId('goal-lose_weight')).toBeTruthy();
    expect(getByTestId('goal-gain_muscle')).toBeTruthy();
    expect(getByTestId('goal-improve_endurance')).toBeTruthy();
    expect(getByTestId('goal-increase_strength')).toBeTruthy();
    expect(getByTestId('goal-general_fitness')).toBeTruthy();
  });

  it('renders all fitness level options', () => {
    const { getByTestId } = render(
      <OnboardingScreen navigation={mockNavigation as any} />
    );

    expect(getByTestId('level-beginner')).toBeTruthy();
    expect(getByTestId('level-intermediate')).toBeTruthy();
    expect(getByTestId('level-advanced')).toBeTruthy();
  });

  it('renders days per week options', () => {
    const { getByTestId } = render(
      <OnboardingScreen navigation={mockNavigation as any} />
    );

    [2, 3, 4, 5, 6].forEach((d) => {
      expect(getByTestId(`days-${d}`)).toBeTruthy();
    });
  });

  it('does NOT render an API key input', () => {
    const { queryByPlaceholderText } = render(
      <OnboardingScreen navigation={mockNavigation as any} />
    );

    expect(queryByPlaceholderText(/api key/i)).toBeNull();
    expect(queryByPlaceholderText(/AIza/i)).toBeNull();
  });
});

// ─── Auto-redirect ─────────────────────────────────────────────────────────

describe('OnboardingScreen — auto-redirect', () => {
  it('redirects to Main when stored plan exists', async () => {
    mockLoadStoredPlan.mockResolvedValueOnce(true);

    render(<OnboardingScreen navigation={mockNavigation as any} />);

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('Main');
    });
  });

  it('stays on Onboarding when no stored plan', async () => {
    mockLoadStoredPlan.mockResolvedValueOnce(false);

    render(<OnboardingScreen navigation={mockNavigation as any} />);

    await waitFor(() => {
      expect(mockReplace).not.toHaveBeenCalled();
    });
  });
});

// ─── Validation ────────────────────────────────────────────────────────────

describe('OnboardingScreen — validation', () => {
  function fillForm(getByTestId: any) {
    fireEvent.changeText(getByTestId('input-name'), 'Carlos');
    fireEvent.changeText(getByTestId('input-age'), '30');
    fireEvent.changeText(getByTestId('input-weight'), '75');
    fireEvent.changeText(getByTestId('input-height'), '175');
  }

  it('shows alert when name is empty', async () => {
    const { getByTestId } = render(
      <OnboardingScreen navigation={mockNavigation as any} />
    );

    fireEvent.press(getByTestId('btn-generate'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Atenção',
      expect.stringContaining('campos obrigatórios')
    );
  });

  it('shows alert when age is invalid (too low)', async () => {
    const { getByTestId } = render(
      <OnboardingScreen navigation={mockNavigation as any} />
    );

    fireEvent.changeText(getByTestId('input-name'), 'Carlos');
    fireEvent.changeText(getByTestId('input-age'), '5');
    fireEvent.changeText(getByTestId('input-weight'), '75');
    fireEvent.changeText(getByTestId('input-height'), '175');
    fireEvent.press(getByTestId('btn-generate'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Atenção',
      expect.stringContaining('idade válida')
    );
  });

  it('shows alert when weight is invalid', async () => {
    const { getByTestId } = render(
      <OnboardingScreen navigation={mockNavigation as any} />
    );

    fireEvent.changeText(getByTestId('input-name'), 'Carlos');
    fireEvent.changeText(getByTestId('input-age'), '30');
    fireEvent.changeText(getByTestId('input-weight'), '10');
    fireEvent.changeText(getByTestId('input-height'), '175');
    fireEvent.press(getByTestId('btn-generate'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Atenção',
      expect.stringContaining('peso válido')
    );
  });

  it('shows alert when height is invalid', async () => {
    const { getByTestId } = render(
      <OnboardingScreen navigation={mockNavigation as any} />
    );

    fireEvent.changeText(getByTestId('input-name'), 'Carlos');
    fireEvent.changeText(getByTestId('input-age'), '30');
    fireEvent.changeText(getByTestId('input-weight'), '75');
    fireEvent.changeText(getByTestId('input-height'), '50');
    fireEvent.press(getByTestId('btn-generate'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Atenção',
      expect.stringContaining('altura válida')
    );
  });

  it('calls generate with correct profile when form is valid', async () => {
    mockGenerate.mockResolvedValueOnce({});

    const { getByTestId } = render(
      <OnboardingScreen navigation={mockNavigation as any} />
    );

    fillForm(getByTestId);
    fireEvent.press(getByTestId('goal-lose_weight'));
    fireEvent.press(getByTestId('level-intermediate'));
    fireEvent.press(getByTestId('days-4'));

    await act(async () => {
      fireEvent.press(getByTestId('btn-generate'));
    });

    await waitFor(() => {
      expect(mockGenerate).toHaveBeenCalledWith({
        name: 'Carlos',
        age: 30,
        weight: 75,
        height: 175,
        gender: 'male',
        goal: 'lose_weight',
        fitnessLevel: 'intermediate',
        daysPerWeek: 4,
        workoutDuration: 60,
        cardioMinutes: 10,
        injuries: undefined,
        planDuration: 'annual',
      });
    });
  });

  it('navigates to Main after successful generation', async () => {
    mockGenerate.mockResolvedValueOnce({});

    const { getByTestId } = render(
      <OnboardingScreen navigation={mockNavigation as any} />
    );

    fireEvent.changeText(getByTestId('input-name'), 'Carlos');
    fireEvent.changeText(getByTestId('input-age'), '30');
    fireEvent.changeText(getByTestId('input-weight'), '75');
    fireEvent.changeText(getByTestId('input-height'), '175');

    await act(async () => {
      fireEvent.press(getByTestId('btn-generate'));
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('Main');
    });
  });

  it('shows error alert when generation fails', async () => {
    mockGenerate.mockRejectedValueOnce(new Error('Sem conexão'));

    const { getByTestId } = render(
      <OnboardingScreen navigation={mockNavigation as any} />
    );

    fireEvent.changeText(getByTestId('input-name'), 'Carlos');
    fireEvent.changeText(getByTestId('input-age'), '30');
    fireEvent.changeText(getByTestId('input-weight'), '75');
    fireEvent.changeText(getByTestId('input-height'), '175');

    await act(async () => {
      fireEvent.press(getByTestId('btn-generate'));
    });

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Erro', 'Sem conexão');
    });
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

// ─── Interactivity ─────────────────────────────────────────────────────────

describe('OnboardingScreen — interactivity', () => {
  it('selects goal when pressed', () => {
    const { getByTestId } = render(
      <OnboardingScreen navigation={mockNavigation as any} />
    );

    fireEvent.press(getByTestId('goal-increase_strength'));
    // Component should not crash and goal changes internally
  });

  it('selects gender when pressed', () => {
    const { getByTestId } = render(
      <OnboardingScreen navigation={mockNavigation as any} />
    );

    fireEvent.press(getByTestId('gender-female'));
    // Component should not crash
  });

  it('updates days per week when pressed', () => {
    const { getByTestId } = render(
      <OnboardingScreen navigation={mockNavigation as any} />
    );

    fireEvent.press(getByTestId('days-5'));
    // Component should not crash
  });
});
