import {
  Button,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../context";

export function DashboardScreen() {
  const { user, session, signOut } = useAuth();
  if (!user) return null;

  return (
    <ScrollView contentContainerStyle={s.container}>
      {user.photo && <Image source={{ uri: user.photo }} style={s.avatar} />}
      <Text style={s.title}>Dashboard</Text>
      <Text style={s.name}>{user.name}</Text>
      <Text style={s.email}>{user.email}</Text>

      <Text style={s.label}>Login API response</Text>
      <Text selectable style={s.box}>
        {JSON.stringify(session, null, 2)}
      </Text>

      <View style={s.buttons}>
        <Button title="Sign out" onPress={signOut} />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { alignItems: "center", padding: 24, paddingTop: 80, gap: 8 },
  title: { fontSize: 28, fontWeight: "700" },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  name: { fontSize: 18, fontWeight: "600" },
  email: { color: "#555" },
  label: { marginTop: 24, fontWeight: "700" },
  box: {
    fontSize: 12,
    backgroundColor: "#f2f2f2",
    padding: 12,
    borderRadius: 8,
    width: "100%",
  },
  buttons: { marginTop: 24, width: "100%" },
});
