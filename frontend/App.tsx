import { useEffect, useState } from "react";
import { AppState, type AppStateStatus, View } from "react-native";
import {
  NavigationContainer,
  DarkTheme,
  type Theme,
} from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { QueryClientProvider, focusManager } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, { Easing, FadeIn } from "react-native-reanimated";
import { queryClient } from "./src/lib/queryClient";
import { AuthProvider, useAuth } from "./src/context";
import { C } from "./src/theme/colors";
import { fontsToLoad } from "./src/theme/fonts";
import { LoginScreen } from "./src/screens";
import { OnboardingNavigator, RootTabs } from "./src/navigation";
import { WalletProvider } from "./src/context/WalletContext";
import { SplashIntro, SplashDoneContext } from "./src/components/SplashIntro";
import { SheetProvider } from "./src/components/Sheet";
import { ToastProvider } from "./src/components/Toast";
import { AppFlowContext } from "./src/context/AppFlowContext";

// Keep the native splash up until fonts are loaded and <SplashIntro> has drawn
// its first frame (it hides the native splash itself).
SplashScreen.preventAutoHideAsync().catch(() => {});

const ONBOARDED_KEY = "folio_onboarded_v1";

const NAV_THEME: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: C.ground,
    card: C.ground,
    border: C.hair,
    primary: C.mint,
    text: C.ink1,
    notification: C.mint,
  },
};

function onAppStateChange(status: AppStateStatus) {
  focusManager.setFocused(status === "active");
}

// Plain ground for the split second between states (e.g. reading the
// onboarding flag right after sign-in). No spinner: it's never on screen long.
function Blank() {
  return <View style={{ flex: 1, backgroundColor: C.ground }} />;
}

function Root() {
  const { user, initializing } = useAuth();
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);
  const [splashDone, setSplashDone] = useState(false);

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

  // Account → "Retake the questions": back to onboarding (fades in like any phase change)
  const retakeOnboarding = () => {
    AsyncStorage.removeItem(ONBOARDED_KEY).catch(() => {});
    setHasOnboarded(false);
  };

  // The splash may leave once we know which screen comes first.
  const ready = !initializing && (!user || hasOnboarded !== null);

  // Which top-level screen is showing. Changing phase (sign-in, sign-out,
  // finishing onboarding) fades the new screen in over 280ms, like the prototype.
  const phase = initializing
    ? "init"
    : !user
      ? "login"
      : hasOnboarded === null
        ? "check"
        : hasOnboarded
          ? "app"
          : "onboarding";

  let content;
  if (initializing) {
    content = <Blank />;
  } else if (!user) {
    content = <LoginScreen />;
  } else {
    content = (
      <NavigationContainer theme={NAV_THEME}>
        {hasOnboarded === null ? (
          <Blank />
        ) : !hasOnboarded ? (
          <OnboardingNavigator onComplete={completeOnboarding} />
        ) : (
          <RootTabs />
        )}
      </NavigationContainer>
    );
  }

  return (
    <AppFlowContext.Provider value={{ retakeOnboarding }}>
      <SplashDoneContext.Provider value={splashDone}>
        <View style={{ flex: 1, backgroundColor: C.ground }}>
          {/* Toast sits above the sheet; both sit above every screen, below the splash. */}
          <ToastProvider>
            <SheetProvider>
              <Animated.View
                key={phase}
                style={{ flex: 1 }}
                // No fade while the splash is up — the splash's own crossfade reveals the first screen.
                entering={
                  splashDone
                    ? FadeIn.duration(280).easing(Easing.linear)
                    : undefined
                }
              >
                {content}
              </Animated.View>
            </SheetProvider>
          </ToastProvider>
          {!splashDone && (
            <SplashIntro ready={ready} onDone={() => setSplashDone(true)} />
          )}
        </View>
      </SplashDoneContext.Provider>
    </AppFlowContext.Provider>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts(fontsToLoad);
  // If fonts fail, carry on with system fonts rather than hang on the splash.
  const canRender = fontsLoaded || !!fontError;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.ground }}>
      <StatusBar style="light" />
      {canRender && (
        <QueryClientProvider client={queryClient}>
          <SafeAreaProvider>
            <AuthProvider>
              <WalletProvider>
                <Root />
              </WalletProvider>
            </AuthProvider>
          </SafeAreaProvider>
        </QueryClientProvider>
      )}
    </GestureHandlerRootView>
  );
}
