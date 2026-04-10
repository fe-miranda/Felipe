const React = require('react');

const insets = { top: 44, right: 0, bottom: 34, left: 0 };

module.exports = {
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children, style }) =>
    React.createElement('View', { style }, children),
  useSafeAreaInsets: () => insets,
  SafeAreaConsumer: ({ children }) => children(insets),
  initialWindowMetrics: {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets,
  },
};
