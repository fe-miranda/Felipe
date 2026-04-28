import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ChatScreen } from '../../src/screens/ChatScreen';
import * as aiService from '../../src/services/aiService';
import type { AnnualPlan } from '../../src/types';

// ─── Mocks ─────────────────────────────────────────────────────────────────

jest.mock('../../src/services/aiService');
jest.mock('../../src/services/workoutHistoryService', () => ({
  loadHistory: jest.fn().mockResolvedValue([]),
}));

const mockGoBack = jest.fn();
const mockNavigation = { goBack: mockGoBack, navigate: jest.fn() };

const mockPlan: AnnualPlan = {
  userId: 'Carla',
  createdAt: '2026-01-01T00:00:00.000Z',
  userProfile: {
    name: 'Carla',
    age: 30,
    weight: 65,
    height: 168,
    gender: 'female',
    goal: 'general_fitness',
    fitnessLevel: 'intermediate',
    daysPerWeek: 3,
    workoutDuration: 60,
    cardioMinutes: 10,
  },
  totalMonths: 12,
  overallGoal: 'Melhorar condicionamento geral',
  monthlyBlocks: [],
  nutritionTips: [],
  recoveryTips: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockPlan));
});

// ─── Rendering ─────────────────────────────────────────────────────────────

describe('ChatScreen — rendering', () => {
  it('shows welcome message with user name after plan loads', async () => {
    const { findByText } = render(
      <ChatScreen navigation={mockNavigation as any} />
    );

    expect(await findByText(/Olá, Carla/)).toBeTruthy();
  });

  it('renders quick suggestion buttons', async () => {
    const { findByTestId } = render(
      <ChatScreen navigation={mockNavigation as any} />
    );

    expect(await findByTestId('suggestion-0')).toBeTruthy();
    expect(await findByTestId('suggestion-4')).toBeTruthy();
  });

  it('renders chat input and send button', async () => {
    const { findByTestId } = render(
      <ChatScreen navigation={mockNavigation as any} />
    );

    expect(await findByTestId('chat-input')).toBeTruthy();
    expect(await findByTestId('btn-send')).toBeTruthy();
  });

  it('shows error state when no plan in storage', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    const { findByText } = render(
      <ChatScreen navigation={mockNavigation as any} />
    );

    expect(await findByText('Nenhum plano encontrado.')).toBeTruthy();
  });
});

// ─── Messaging ─────────────────────────────────────────────────────────────

describe('ChatScreen — messaging', () => {
  it('sends message and shows AI reply', async () => {
    (aiService.chatAboutPlan as jest.Mock).mockResolvedValueOnce(
      'Você está indo muito bem!'
    );

    const { findByTestId, findByText } = render(
      <ChatScreen navigation={mockNavigation as any} />
    );

    const input = await findByTestId('chat-input');
    fireEvent.changeText(input, 'Como estou indo?');

    const sendBtn = await findByTestId('btn-send');
    await act(async () => {
      fireEvent.press(sendBtn);
    });

    expect(await findByText('Como estou indo?')).toBeTruthy();
    expect(await findByText('Você está indo muito bem!')).toBeTruthy();
  });

  it('sends message via quick suggestion', async () => {
    (aiService.chatAboutPlan as jest.Mock).mockResolvedValueOnce('Ótima pergunta!');

    const { findByTestId, findByText } = render(
      <ChatScreen navigation={mockNavigation as any} />
    );

    const suggestion = await findByTestId('suggestion-0');
    await act(async () => {
      fireEvent.press(suggestion);
    });

    await waitFor(() => {
      expect(aiService.chatAboutPlan).toHaveBeenCalledTimes(1);
    });
  });

  it('clears input after sending', async () => {
    (aiService.chatAboutPlan as jest.Mock).mockResolvedValueOnce('Resposta');

    const { findByTestId } = render(
      <ChatScreen navigation={mockNavigation as any} />
    );

    const input = await findByTestId('chat-input');
    fireEvent.changeText(input, 'Minha pergunta');

    await act(async () => {
      fireEvent.press(await findByTestId('btn-send'));
    });

    await waitFor(() => {
      expect(input.props.value).toBe('');
    });
  });

  it('shows error message in chat when API fails', async () => {
    (aiService.chatAboutPlan as jest.Mock).mockRejectedValueOnce(
      new Error('Sem internet')
    );

    const { findByTestId, findByText } = render(
      <ChatScreen navigation={mockNavigation as any} />
    );

    fireEvent.changeText(await findByTestId('chat-input'), 'Oi');

    await act(async () => {
      fireEvent.press(await findByTestId('btn-send'));
    });

    expect(await findByText(/Sem internet/)).toBeTruthy();
  });

  it('does not send empty message', async () => {
    const { findByTestId } = render(
      <ChatScreen navigation={mockNavigation as any} />
    );

    // send button with empty input should be disabled
    const sendBtn = await findByTestId('btn-send');
    expect(sendBtn.props.accessibilityState?.disabled).toBeTruthy();
  });

  it('calls chatAboutPlan with plan context', async () => {
    (aiService.chatAboutPlan as jest.Mock).mockResolvedValueOnce('Resposta');

    const { findByTestId } = render(
      <ChatScreen navigation={mockNavigation as any} />
    );

    fireEvent.changeText(await findByTestId('chat-input'), 'Pergunta teste');

    await act(async () => {
      fireEvent.press(await findByTestId('btn-send'));
    });

    await waitFor(() => {
      expect(aiService.chatAboutPlan).toHaveBeenCalledWith(
        'Pergunta teste',
        expect.objectContaining({ userId: 'Carla' }),
        [], // empty chat history on first message
        []  // empty workout history (mocked)
      );
    });
  });

  it('builds conversation history for subsequent messages', async () => {
    (aiService.chatAboutPlan as jest.Mock)
      .mockResolvedValueOnce('Primeira resposta')
      .mockResolvedValueOnce('Segunda resposta');

    const { findByTestId } = render(
      <ChatScreen navigation={mockNavigation as any} />
    );

    // First message
    fireEvent.changeText(await findByTestId('chat-input'), 'Primeira pergunta');
    await act(async () => {
      fireEvent.press(await findByTestId('btn-send'));
    });
    await waitFor(() => expect(aiService.chatAboutPlan).toHaveBeenCalledTimes(1));

    // Second message — history should include first exchange
    fireEvent.changeText(await findByTestId('chat-input'), 'Segunda pergunta');
    await act(async () => {
      fireEvent.press(await findByTestId('btn-send'));
    });

    await waitFor(() => {
      const [, , history] = (aiService.chatAboutPlan as jest.Mock).mock.calls[1];
      // History on second call includes both first user message AND first AI reply
      expect(history).toHaveLength(2);
      expect(history[0]).toEqual({ role: 'user', text: 'Primeira pergunta' });
      expect(history[1]).toEqual({ role: 'model', text: 'Primeira resposta' });
    });
  });
});

// ─── Error state ───────────────────────────────────────────────────────────

describe('ChatScreen — error state', () => {
  it('goBack button works in error state', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    const { findByText } = render(
      <ChatScreen navigation={mockNavigation as any} />
    );

    const backBtn = await findByText('Voltar');
    fireEvent.press(backBtn);

    expect(mockGoBack).toHaveBeenCalled();
  });
});
