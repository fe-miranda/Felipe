const React = require('react');
const { View, Text } = require('react-native');

const Svg = React.forwardRef((props, ref) => React.createElement(View, { ...props, ref }, props.children));
const makeEl = (name) => (props) => React.createElement(View, { testID: name, ...props }, props.children);

module.exports = Svg;
module.exports.default = Svg;
module.exports.Rect = makeEl('Rect');
module.exports.Circle = makeEl('Circle');
module.exports.Ellipse = makeEl('Ellipse');
module.exports.Path = makeEl('Path');
module.exports.Line = makeEl('Line');
module.exports.Polyline = makeEl('Polyline');
module.exports.G = makeEl('G');
module.exports.Text = makeEl('SvgText');
module.exports.Defs = makeEl('Defs');
module.exports.LinearGradient = makeEl('LinearGradient');
module.exports.Stop = makeEl('Stop');
module.exports.ClipPath = makeEl('ClipPath');
