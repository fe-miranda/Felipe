import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SettingsScreen } from '../../src/screens/SettingsScreen';
import * as aiService from '../../src/services/aiService';

// ─── Mocks ─────────────────────────────────────────────────────────────────

jest.mock('../../src/services/aiService');

const mockGoBack = jest.fn();
const mockNavigation = {
  navigate: jest.fn(),
  replace: jest.fn(),
  goBack: mockGoBack,
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert');
  (AsyncStorage.clear as jest.Mock)();
});

// ─── Rendering ─────────────────────────────────────────────────────────────

describe('SettingsScreen — rendering', () => {
  it('renders the page title', () => {
    const { getByText } = render(
      <SettingsScreen navigation={mockNavigation as any} />
    );
    expect(getByText('Configurações de IA')).toBeTruthy();
  });

  it('renders the API key input', () => {
    const { getByTestId } = render(
      <SettingsScreen navigation={mockNavigation as any} />
    );
    expect(getByTestId('input-apikey')).toBeTruthy();
  });

  it('renders the save button', () => {
    const { getByTestId } = render(
      <SettingsScreen navigation={mockNavigation as any} />
    );
    expect(getByTestId('btn-save-key')).toBeTruthy();
  });

  it('renders the open Groq console button', () => {
    const { getByTestId } = render(
      <SettingsScreen navigation={mockNavigation as any} />
    );
    expect(getByTestId('btn-open-groq')).toBeTruthy();
  });

  it('renders the status card with ready/fast/model items', () => {
    const { getByText } = render(
      <SettingsScreen navigation={mockNavigation as any} />
    );
    expect(getByText('Pronto')).toBeTruthy();
    expect(getByText('Rápido')).toBeTruthy();
    expect(getByText('Llama 3.3')).toBeTruthy();
  });

  it('renders the token usage info card', () => {
    const { getByText } = render(
      <SettingsScreen navigation={mockNavigation as any} />
    );
    expect(getByText(/Uso eficiente de tokens/)).toBeTruthy();
  });
});

// ─── Initial load ───────────────────────────────────────────────────────────

describe('SettingsScreen — initial load', () => {
  it('loads stored API key from AsyncStorage on mount', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('gsk_existing_key');

    const { findByTestId } = render(
      <SettingsScreen navigation={mockNavigation as any} />
    );

    const input = await findByTestId('input-apikey');
    expect(input.props.value).toBe('gsk_existing_key');
  });

  it('shows saved badge when a key is already stored', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('gsk_existing_key');

    const { findByText } = render(
      <SettingsScreen navigation={mockNavigation as any} />
    );

    expect(await findByText('Chave configurada e ativa')).toBeTruthy();
  });

  it('does not show remove button when no key is stored', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

    const { queryByTestId } = render(
      <SettingsScreen navigation={mockNavigation as any} />
    );

    await waitFor(() => {
      expect(queryByTestId('btn-remove-key')).toBeNull();
    });
  });

  it('shows remove button when a key is stored', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('gsk_existing_key');

    const { findByTestId } = render(
      <SettingsScreen navigation={mockNavigation as any} />
    );

    expect(await findByTestId('btn-remove-key')).toBeTruthy();
  });
});

// ─── Save key ────────────────────────────────────────────────────────────────

describe('SettingsScreen — save key', () => {
  it('shows alert when save is pressed with empty input', async () => {
    const { getByTestId } = render(
      <SettingsScreen navigation={mockNavigation as any} />
    );

    fireEvent.press(getByTestId('btn-save-key'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Atenção',
      expect.stringContaining('API Key')
    );
  });

  it('saves key to AsyncStorage and calls setRuntimeApiKey', async () => {
    const { getByTestId } = render(
      <SettingsScreen navigation={mockNavigation as any} />
    );

    fireEvent.changeText(getByTestId('input-apikey'), 'gsk_new_test_key');

    await act(async () => {
      fireEvent.press(getByTestId('btn-save-key'));
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@gymapp_custom_apikey',
      'gsk_new_test_key'
    );
    expect(aiService.setRuntimeApiKey).toHaveBeenCalledWith('gsk_new_test_key');
  });

  it('trims whitespace from the key before saving', async () => {
    const { getByTestId } = render(
      <SettingsScreen navigation={mockNavigation as any} />
    );

    fireEvent.changeText(getByTestId('input-apikey'), '  gsk_trimmed  ');

    await act(async () => {
      fireEvent.press(getByTestId('btn-save-key'));
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@gymapp_custom_apikey',
      'gsk_trimmed'
    );
  });

  it('shows success alert and navigates back after saving', async () => {
    jest.spyOn(Alert, 'alert').mockImplementationOnce((_title, _msg, buttons: any) => {
      buttons?.find((b: any) => b.text === 'OK')?.onPress?.();
    });

    const { getByTestId } = render(
      <SettingsScreen navigation={mockNavigation as any} />
    );

    fireEvent.changeText(getByTestId('input-apikey'), 'gsk_valid_key');

    await act(async () => {
      fireEvent.press(getByTestId('btn-save-key'));
    });

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});

// ─── Remove key ──────────────────────────────────────────────────────────────

describe('SettingsScreen — remove key', () => {
  it('removes key from AsyncStorage when remove is pressed', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('gsk_existing_key');

    const { findByTestId } = render(
      <SettingsScreen navigation={mockNavigation as any} />
    );

    const removeBtn = await findByTestId('btn-remove-key');

    await act(async () => {
      fireEvent.press(removeBtn);
    });

    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@gymapp_custom_apikey');
    expect(aiService.setRuntimeApiKey).toHaveBeenCalledWith(null);
  });

  it('hides the remove button after key is removed', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce('gsk_existing_key');

    const { findByTestId, queryByTestId } = render(
      <SettingsScreen navigation={mockNavigation as any} />
    );

    const removeBtn = await findByTestId('btn-remove-key');

    await act(async () => {
      fireEvent.press(removeBtn);
    });

    await waitFor(() => {
      expect(queryByTestId('btn-remove-key')).toBeNull();
    });
  });
});

// ─── External link ───────────────────────────────────────────────────────────

describe('SettingsScreen — external link', () => {
  it('opens the Groq console URL when the open button is pressed', () => {
    const openURLSpy = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

    const { getByTestId } = render(
      <SettingsScreen navigation={mockNavigation as any} />
    );

    fireEvent.press(getByTestId('btn-open-groq'));

    expect(openURLSpy).toHaveBeenCalledWith('https://console.groq.com/keys');
  });
});
