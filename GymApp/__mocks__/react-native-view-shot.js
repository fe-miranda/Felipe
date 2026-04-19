const React = require('react');

const ViewShot = React.forwardRef(({ children }, ref) => children);
ViewShot.displayName = 'ViewShot';

module.exports = ViewShot;
module.exports.default = ViewShot;
module.exports.captureRef = jest.fn().mockResolvedValue('file:///mock/screenshot.jpg');
module.exports.captureScreen = jest.fn().mockResolvedValue('file:///mock/screenshot.jpg');
