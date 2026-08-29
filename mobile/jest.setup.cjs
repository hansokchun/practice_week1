jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

jest.mock("react-native-maps", () => {
  const React = require("react");
  const { View } = require("react-native");
  const MapView = ({ children, ...props }) => React.createElement(View, props, children);
  const Marker = ({ children, ...props }) => React.createElement(View, props, children);
  return { __esModule: true, default: MapView, Marker, PROVIDER_GOOGLE: "google" };
});
