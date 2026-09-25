// Groups tab — header from the prototype (#s-groups). The full screen
// (your groups, open to join, group detail, chat) arrives in Step 10.
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { C, FONT, TYPE } from "../theme";
import { Rise } from "../components/ui";
import { useTabBarSpace } from "../navigation/TabBar";

export function GroupsScreen() {
  const bottom = useTabBarSpace();
  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={[s.page, { paddingBottom: bottom }]}>
        <View style={s.header}>
          <Rise duration={460}>
            <Text style={TYPE.lbl}>GROUPS</Text>
          </Rise>
          <Rise duration={460} delay={55}>
            <Text style={TYPE.h1} accessibilityRole="header">
              Buy together
            </Text>
          </Rise>
          <Rise duration={460} delay={110}>
            <Text style={TYPE.body}>
              A group pools one order. Every share settles to its own wallet —
              nobody holds anybody else's asset.
            </Text>
          </Rise>
        </View>

        <Rise delay={165}>
          <View style={s.soon}>
            <Text style={s.soonTitle}>Groups are on the way</Text>
            <Text style={TYPE.sub}>
              You'll be able to start one or join an open group here.
            </Text>
          </View>
        </Rise>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.ground },
  page: { paddingTop: 26, paddingHorizontal: 20, gap: 20 },
  header: { gap: 10 },
  soon: { backgroundColor: C.sunk, borderRadius: 18, padding: 16, gap: 6 },
  soonTitle: { fontFamily: FONT.sans700, fontSize: 14.5, color: C.ink1 },
});
