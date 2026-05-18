export default ({ config }) => {
  const proxyFlag = String(process.env.EXPO_PUBLIC_USE_API_PROXY ?? "")
    .trim()
    .toLowerCase();
  const useApiProxy = proxyFlag === "1" || proxyFlag === "true" || proxyFlag === "yes";

  return {
    ...config,
    scheme: config.scheme ?? "weret",
    plugins: [
      ...new Set([
        ...(config.plugins || []),
        "expo-asset",
        "expo-font",
        "expo-localization",
        "expo-dev-client",
        "@config-plugins/react-native-webrtc",
      ]),
    ],
    extra: {
      ...config.extra,
      apiUrl: process.env.EXPO_PUBLIC_API_URL,
      apiFullUrl: process.env.EXPO_PUBLIC_API_FULL_URL,
      lanHost: process.env.EXPO_PUBLIC_LAN_HOST,
      /** Read at Metro startup — client uses Constants.expoConfig.extra (reliable in Expo Go). */
      useApiProxy,
      apiProxyPort: process.env.EXPO_PUBLIC_API_PROXY_PORT || "8090",
      googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || "",
      googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || "",
      googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || "",
    },
    android: {
      ...config.android,
      /** Dev API uses http:// — required for custom dev clients / some builds */
      usesCleartextTraffic: true,
    },
    ios: {
      ...config.ios,
      infoPlist: {
        ...config.ios?.infoPlist,
        NSAppTransportSecurity: {
          ...config.ios?.infoPlist?.NSAppTransportSecurity,
          NSAllowsLocalNetworking: true,
        },
      },
    },
  };
};
