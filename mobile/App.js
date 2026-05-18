import "react-native-gesture-handler";
import { useEffect } from "react";
import { Provider } from "react-redux";
import { I18nextProvider } from "react-i18next";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { store } from "./src/store";
import { hydrateUi } from "./src/store/slices/uiSlice";
import { ThemeProvider, useTheme } from "./src/context/ThemeProvider";
import RootNavigator from "./src/navigation/RootNavigator";
import i18n, { initI18n } from "./src/i18n";
import RealtimeBridge from "./src/realtime/RealtimeBridge";

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? "light" : "dark"} />;
}

function AppInner() {
  useEffect(() => {
    store.dispatch(hydrateUi());
    initI18n();
  }, []);

  return (
    <ThemeProvider>
      <ThemedStatusBar />
      <RealtimeBridge />
      <RootNavigator />
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <I18nextProvider i18n={i18n}>
          <AppInner />
        </I18nextProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}
