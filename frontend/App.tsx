import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import LoginScreen from "./src/screens/LoginScreen";
import RootTabs from "./src/navigation/RootTabs";
import { C } from "./src/theme/colors";

function Root() {
  const { user, initializing } = useAuth();

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
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}
