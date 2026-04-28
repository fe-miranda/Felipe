import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
  resetKey: number;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '', resetKey: 0 };
  }

  static getDerivedStateFromError(error: unknown): Partial<State> {
    const message = error instanceof Error ? error.message : String(error);
    return { hasError: true, message };
  }

  handleReset = () => {
    this.setState(prev => ({ hasError: false, message: '', resetKey: prev.resetKey + 1 }));
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={s.container}>
          <Text style={s.emoji}>⚠️</Text>
          <Text style={s.title}>Algo deu errado</Text>
          <Text style={s.body}>{this.state.message || 'Erro inesperado no aplicativo.'}</Text>
          <TouchableOpacity style={s.btn} onPress={this.handleReset}>
            <Text style={s.btnText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>;
  }
}

const s = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#07070F',
    alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  emoji: { fontSize: 52, marginBottom: 16 },
  title: { color: '#F1F5F9', fontSize: 22, fontWeight: '800', marginBottom: 10 },
  body: { color: '#94A3B8', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  btn: {
    backgroundColor: '#7C3AED', paddingHorizontal: 28, paddingVertical: 14,
    borderRadius: 14,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
