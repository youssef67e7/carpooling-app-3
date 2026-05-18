import { useEffect, useState } from "react";
import { ActivityIndicator, View, I18nManager, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import { NavigationContainer, createNavigationContainerRef } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useDispatch, useSelector } from "react-redux";
import { hydrateAuth } from "../store/slices/authSlice";
import LoginScreen from "../screens/LoginScreen";
import WeretOnboardingScreen from "../screens/WeretOnboardingScreen";
import RegisterChoiceScreen from "../screens/RegisterChoiceScreen";
import PassengerRegisterScreen from "../screens/PassengerRegisterScreen";
import DriverRegisterScreen from "../screens/DriverRegisterScreen";
import PassengerTabNavigator from "./PassengerTabNavigator";
import DriverTabNavigator from "./DriverTabNavigator";
import AdminTabNavigator from "./AdminTabNavigator";
import RideChatScreen from "../screens/RideChatScreen";
import InAppCallScreen from "../screens/InAppCallScreen";
import DriverOnboardingScreen from "../screens/DriverOnboardingScreen";
import WeretOutlineWordmark from "../components/auth/WeretOutlineWordmark";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { weretPalette } from "../theme/weretDesignSystem";
import { weretEnter } from "../theme/weretMotion";

const Stack = createNativeStackNavigator();
const navRef = createNavigationContainerRef();
const POST_REGISTER_DRIVER_FLAG = "@post_register_driver_onboarding";

function HydrateSplash() {
  return (
    <View style={styles.hydrateRoot}>
      <Animated.View entering={weretEnter.fade} style={styles.hydrateInner}>
        <WeretOutlineWordmark />
        <ActivityIndicator color={weretPalette.onSplashMuted} size="small" style={styles.hydrateSpinner} />
      </Animated.View>
    </View>
  );
}

export default function RootNavigator() {
  const dispatch = useDispatch();
  const { token, user, hydrated } = useSelector((s) => s.auth);
  const direction = I18nManager.isRTL ? "rtl" : "ltr";
  const [forceDriverOnboarding, setForceDriverOnboarding] = useState(false);
  const [checkingPostRegister, setCheckingPostRegister] = useState(false);

  useEffect(() => {
    dispatch(hydrateAuth());
  }, [dispatch]);

  // If user registered as driver, force onboarding (never show Passenger tabs).
  useEffect(() => {
    if (!hydrated || !token) return;
    let alive = true;
    (async () => {
      try {
        setCheckingPostRegister(true);
        const v = await AsyncStorage.getItem(POST_REGISTER_DRIVER_FLAG);
        if (!alive) return;
        if (v === "1") {
          await AsyncStorage.removeItem(POST_REGISTER_DRIVER_FLAG);
          setForceDriverOnboarding(true);
          // Ensure the stack contains DriverRegister -> Onboarding so user can go back.
          if (navRef.isReady()) {
            navRef.reset({
              index: 1,
              routes: [
                { name: "DriverRegisterAuthed" },
                { name: "DriverOnboardingStandalone" },
              ],
            });
          }
        }
      } catch {
        // ignore
      } finally {
        if (alive) setCheckingPostRegister(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [hydrated, token]);

  // Once user is in driver mode, stop forcing onboarding.
  useEffect(() => {
    if (!forceDriverOnboarding) return;
    if ((user?.active_role || user?.role) === "driver") {
      setForceDriverOnboarding(false);
    }
  }, [forceDriverOnboarding, user?.active_role, user?.role]);

  // After onboarding submit switches mode to driver, ensure we land in DriverRoot (not stuck on onboarding screen).
  useEffect(() => {
    if (!hydrated || !token) return;
    if (forceDriverOnboarding) return;
    const mode = user?.role === "admin" ? "admin" : (user?.active_role || user?.role);
    if (mode !== "driver") return;
    if (!navRef.isReady()) return;
    const cur = navRef.getCurrentRoute?.()?.name;
    if (cur === "DriverOnboardingStandalone") {
      navRef.reset({
        index: 0,
        routes: [{ name: "DriverRoot" }],
      });
    }
  }, [hydrated, token, forceDriverOnboarding, user?.active_role, user?.role, user?.role === "admin"]);

  if (!hydrated || checkingPostRegister) {
    return <HydrateSplash />;
  }

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, direction }}>
        <NavigationContainer ref={navRef}>
          <Stack.Navigator
            screenOptions={{
              headerTitleAlign: "center",
              animation: "slide_from_right",
            }}
          >
            {!token ? (
              <>
                <Stack.Screen
                  name="WeretOnboarding"
                  component={WeretOnboardingScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
                <Stack.Screen
                  name="Register"
                  component={RegisterChoiceScreen}
                  options={{
                    headerShown: true,
                    headerBackVisible: true,
                    headerBackTitleVisible: true,
                    headerStyle: { backgroundColor: "#ffffff" },
                    headerTintColor: "#111111",
                    headerShadowVisible: false,
                  }}
                />
                <Stack.Screen
                  name="PassengerRegister"
                  component={PassengerRegisterScreen}
                  options={{
                    headerShown: true,
                    headerStyle: { backgroundColor: "#ffffff" },
                    headerTintColor: "#111111",
                    headerShadowVisible: false,
                  }}
                />
                <Stack.Screen
                  name="DriverRegister"
                  component={DriverRegisterScreen}
                  options={{
                    headerShown: true,
                    headerStyle: { backgroundColor: "#ffffff" },
                    headerTintColor: "#111111",
                    headerShadowVisible: false,
                  }}
                />
              </>
            ) : user?.role === "admin" ? (
              <Stack.Screen name="AdminRoot" component={AdminTabNavigator} options={{ headerShown: false }} />
            ) : forceDriverOnboarding ? (
              <>
                <Stack.Screen
                  name="DriverRegisterAuthed"
                  component={DriverRegisterScreen}
                  options={{
                    headerShown: true,
                    headerStyle: { backgroundColor: "#ffffff" },
                    headerTintColor: "#111111",
                    headerShadowVisible: false,
                  }}
                />
                <Stack.Screen
                  name="DriverOnboardingStandalone"
                  component={DriverOnboardingScreen}
                  options={{ headerShown: false }}
                />
                <Stack.Screen name="RideChat" component={RideChatScreen} options={{ headerShown: true }} />
                <Stack.Screen name="InAppCall" component={InAppCallScreen} options={{ headerShown: false }} />
              </>
            ) : (user?.active_role || user?.role) === "passenger" ? (
              <>
                <Stack.Screen name="PassengerRoot" component={PassengerTabNavigator} options={{ headerShown: false }} />
                <Stack.Screen name="DriverOnboardingStandalone" component={DriverOnboardingScreen} options={{ headerShown: false }} />
                <Stack.Screen name="RideChat" component={RideChatScreen} options={{ headerShown: true }} />
                <Stack.Screen name="InAppCall" component={InAppCallScreen} options={{ headerShown: false }} />
              </>
            ) : (user?.active_role || user?.role) === "driver" ? (
              <>
                <Stack.Screen name="DriverRoot" component={DriverTabNavigator} options={{ headerShown: false }} />
                <Stack.Screen name="DriverOnboardingStandalone" component={DriverOnboardingScreen} options={{ headerShown: false }} />
                <Stack.Screen name="RideChat" component={RideChatScreen} options={{ headerShown: true }} />
                <Stack.Screen name="InAppCall" component={InAppCallScreen} options={{ headerShown: false }} />
              </>
            ) : (
              <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  hydrateRoot: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: weretPalette.splash,
  },
  hydrateInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  hydrateSpinner: {
    position: "absolute",
    bottom: 56,
  },
});
