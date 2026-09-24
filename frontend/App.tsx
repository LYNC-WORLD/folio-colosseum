import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  type AppStateStatus,
  View,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider, focusManager } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { queryClient } from "./src/lib/queryClient";
import { AuthProvider, useAuth } from "./src/context";
import { C } from "./src/theme/colors";
import { fontsToLoad } from "./src/theme/fonts";
import { LoginScreen } from "./src/screens";
import { OnboardingNavigator, RootTabs } from "./src/navigation";
import { WalletProvider } from "./src/context/WalletContext";

const ONBOARDED_KEY = "folio_onboarded_v1";

function onAppStateChange(status: AppStateStatus) {
  focusManager.setFocused(status === "active");
}

function LoadingScreen() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: C.bg,
      }}
    >
      <ActivityIndicator size="large" color={C.bone} />
    </View>
  );
}

function Root() {
  const { user, initializing } = useAuth();
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    const sub = AppState.addEventListener("change", onAppStateChange);
    return () => sub.remove();
  }, []);

  // Check onboarding status once we know a user is signed in.
  useEffect(() => {
    if (!user) {
      setHasOnboarded(null);
      return;
    }
    AsyncStorage.getItem(ONBOARDED_KEY)
      .then((v) => setHasOnboarded(v === "true"))
      .catch(() => setHasOnboarded(false));
  }, [user]);

  const completeOnboarding = () => {
    AsyncStorage.setItem(ONBOARDED_KEY, "true").catch(() => {});
    setHasOnboarded(true);
  };

  if (initializing) return <LoadingScreen />;
  if (!user) return <LoginScreen />;

  // NavigationContainer wraps BOTH navigators below it — OnboardingNavigator
  // and RootTabs each create their own navigator internally, and every
  // navigator needs exactly one NavigationContainer somewhere above it in
  // the tree. Only one per app, wrapping whichever navigator is active.
  return (
    <NavigationContainer>
      {hasOnboarded === null ? (
        <LoadingScreen />
      ) : !hasOnboarded ? (
        <OnboardingNavigator onComplete={completeOnboarding} />
      ) : (
        <RootTabs />
      )}
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts(fontsToLoad);

  if (!fontsLoaded) return <LoadingScreen />;

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AuthProvider>
          <WalletProvider>
            <Root />
          </WalletProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
