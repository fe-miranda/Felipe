const React = require('react');
const { View } = require('react-native');

const Svg = React.forwardRef((props, ref) => React.createElement(View, { ...props, ref }, props.children));
const Rect = (props) => React.createElement(View, props, props.children);

module.exports = Svg;
module.exports.default = Svg;
module.exports.Rect = Rect;
