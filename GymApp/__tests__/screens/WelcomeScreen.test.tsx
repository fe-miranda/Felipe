import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { WelcomeScreen } from '../../src/screens/WelcomeScreen';

// ─── Mocks ─────────────────────────────────────────────────────────────────

const mockReplace = jest.fn();
const mockNavigation = {
  replace: mockReplace,
  navigate: jest.fn(),
  goBack: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── Rendering ─────────────────────────────────────────────────────────────

describe('WelcomeScreen — rendering', () => {
  it('renders the app name', () => {
    const { getByText } = render(<WelcomeScreen navigation={mockNavigation as any} />);
    expect(getByText('GymApp')).toBeTruthy();
  });

  it('renders the tagline', () => {
    const { getByText } = render(<WelcomeScreen navigation={mockNavigation as any} />);
    expect(getByText(/Seu plano de treino/)).toBeTruthy();
  });

  it('renders all four feature pills', () => {
    const { getByText } = render(<WelcomeScreen navigation={mockNavigation as any} />);
    expect(getByText('Plano anual gerado por IA')).toBeTruthy();
    expect(getByText('Monitor de frequência cardíaca')).toBeTruthy();
    expect(getByText('Treinos rápidos personalizáveis')).toBeTruthy();
    expect(getByText('Progresso e compartilhamento')).toBeTruthy();
  });

  it('renders the CTA button', () => {
    const { getByText } = render(<WelcomeScreen navigation={mockNavigation as any} />);
    expect(getByText(/Começar Agora/)).toBeTruthy();
  });

  it('renders the "free, no credit card" sub-text', () => {
    const { getByText } = render(<WelcomeScreen navigation={mockNavigation as any} />);
    expect(getByText(/Gratuito/)).toBeTruthy();
  });
});

// ─── Navigation ────────────────────────────────────────────────────────────

describe('WelcomeScreen — navigation', () => {
  it('calls navigation.replace("NewPlan") when CTA is pressed', () => {
    const { getByText } = render(<WelcomeScreen navigation={mockNavigation as any} />);
    fireEvent.press(getByText(/Começar Agora/));
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('NewPlan');
  });
});
