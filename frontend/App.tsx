import { useEffect } from "react";
import {
  ActivityIndicator,
  AppState,
  type AppStateStatus,
  View,
} from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { QueryClientProvider, focusManager } from "@tanstack/react-query";
import { queryClient } from "./src/lib/queryClient";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import LoginScreen from "./src/screens/LoginScreen";
import RootTabs from "./src/navigation/RootTabs";
import { C } from "./src/theme/colors";

function onAppStateChange(status: AppStateStatus) {
  focusManager.setFocused(status === "active");
}

function Root() {
  const { user, initializing } = useAuth();

  useEffect(() => {
    const sub = AppState.addEventListener("change", onAppStateChange);
    return () => sub.remove();
  }, []);

  if (initializing) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: C.bg,
        }}
      >
        <ActivityIndicator size="large" color={C.accent} />
      </View>
    );
  }

  if (!user) return <LoginScreen />;

  return (
    <NavigationContainer>
      <RootTabs />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AuthProvider>
          <Root />
        </AuthProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
