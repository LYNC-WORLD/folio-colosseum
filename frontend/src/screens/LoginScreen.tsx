import {
  ActivityIndicator,
  Button,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";

export default function LoginScreen() {
  const { signIn, busy, error } = useAuth();

  return (
    <View style={s.center}>
      <Text style={s.title}>Welcome</Text>
      {busy ? (
        <ActivityIndicator size="large" />
      ) : (
        <Button title="Sign in with Google" onPress={signIn} />
      )}
      {error && <Text style={s.error}>{error}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 24,
  },
  title: { fontSize: 28, fontWeight: "700" },
  error: { color: "#c00", textAlign: "center" },
});
