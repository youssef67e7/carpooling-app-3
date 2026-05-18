// https://docs.expo.dev/guides/customizing-metro/
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Reanimated 4 resolves `react-native-worklets` from source; pin resolution so Metro always finds the package.
config.resolver = {
  ...config.resolver,
  extraNodeModules: {
    ...config.resolver?.extraNodeModules,
    "react-native-worklets": path.resolve(__dirname, "node_modules/react-native-worklets"),
  },
};

module.exports = config;
