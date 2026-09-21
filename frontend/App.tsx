import { useEffect, useState } from "react";
import {
  View,
  Text,
  Button,
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
} from "react-native";
import {
  GoogleSignin,
  isSuccessResponse,
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";

GoogleSignin.configure({
  webClientId:
    "1037438594396-f69c40aorv78hf8j2c927sjc6j6n609g.apps.googleusercontent.com",
  iosClientId:
    "1037438594396-a10qm1r0p4evjdnptubbj6kk7rbumpta.apps.googleusercontent.com",
});

type User = { name: string | null; email: string; photo: string | null };

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAccessToken = async () => {
    const { accessToken } = await GoogleSignin.getTokens();
    setAccessToken(accessToken);
    return accessToken;
  };

  // Restore previous session on launch
  useEffect(() => {
    (async () => {
      try {
        const res = await GoogleSignin.signInSilently();
        if (isSuccessResponse(res)) {
          setUser(res.data.user);
          await loadAccessToken();
        }
      } catch {
        // not signed in
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signIn = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const res = await GoogleSignin.signIn();
      if (isSuccessResponse(res)) {
        setUser(res.data.user);
        const token = await loadAccessToken();

        // Example: pass the token to your backend
        // await fetch('https://your-api.com/auth/google', {
        //   method: 'POST',
        //   headers: { Authorization: `Bearer ${token}` },
        // });
      }
    } catch (e) {
      if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED)
        return;
      console.warn("Sign-in error", e);
    }
  };

  const signOut = async () => {
    await GoogleSignin.signOut();
    setUser(null);
    setAccessToken(null);
  };

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={s.center}>
        <Text style={s.title}>Welcome</Text>
        <Button title="Sign in with Google" onPress={signIn} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={s.container}>
      {user.photo && <Image source={{ uri: user.photo }} style={s.avatar} />}
      <Text style={s.title}>Dashboard</Text>
      <Text style={s.name}>{user.name}</Text>
      <Text style={s.email}>{user.email}</Text>

      <Text style={s.label}>Access token</Text>
      <Text selectable style={s.token}>
        {accessToken}
      </Text>

      <View style={s.buttons}>
        <Button title="Refresh token" onPress={loadAccessToken} />
        <Button title="Sign out" onPress={signOut} />
      </View>
    </ScrollView>
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
  container: { alignItems: "center", padding: 24, paddingTop: 80, gap: 8 },
  title: { fontSize: 28, fontWeight: "700" },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  name: { fontSize: 18, fontWeight: "600" },
  email: { color: "#555" },
  label: { marginTop: 24, fontWeight: "700" },
  token: {
    fontSize: 12,
    backgroundColor: "#f2f2f2",
    padding: 12,
    borderRadius: 8,
    width: "100%",
  },
  buttons: { marginTop: 24, gap: 12, width: "100%" },
});
