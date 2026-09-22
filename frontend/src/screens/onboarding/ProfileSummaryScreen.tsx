// src/screens/onboarding/ProfileSummaryScreen.tsx
import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  GhostLink,
  PrimaryButton,
} from "../../components/onboarding/OnboardingButton";
import { useOnboarding } from "../../context/OnboardingContext";
import { C, RADIUS } from "../../theme/colors";
import { FONT } from "../../theme/fonts";
import type { OnboardingStackParamList } from "../../navigation/OnboardingNavigator";

type Props = NativeStackScreenProps<OnboardingStackParamList, "ProfileSummary">;

export default function ProfileSummaryScreen({ navigation, route }: Props) {
  const { computeProfile } = useOnboarding();
  const profile = computeProfile();
  const onComplete = route.params?.onComplete;

  const rows = [
    {
      icon: "stats-chart-outline" as const,
      title: profile.feedTitle,
      sub: profile.feedSub,
    },
    {
      icon: "cash-outline" as const,
      title: profile.amountTitle,
      sub: profile.amountSub,
    },
    {
      icon: "time-outline" as const,
      title: profile.chartTitle,
      sub: profile.chartSub,
    },
  ];

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <Text style={s.eyebrow}>YOUR PROFILE</Text>
        <Text style={s.h1}>{profile.title}</Text>
        <Text style={s.sub}>{profile.description}</Text>

        <View style={s.rows}>
          {rows.map((r, i) => (
            <View
              key={r.title}
              style={[
                s.row,
                i === 0 && s.rowFirst,
                i === rows.length - 1 && s.rowLast,
              ]}
            >
              <View style={s.rowIcon}>
                <Ionicons name={r.icon} size={18} color={C.bone} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>{r.title}</Text>
                <Text style={s.rowSub}>{r.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={s.note}>
          <Text style={s.noteText}>
            Your profile is a starting point, not a cage. Folio re-reads it from
            what you actually buy.
          </Text>
        </View>

        <View style={{ flexGrow: 1 }} />

        <PrimaryButton label="Enter Folio" onPress={() => onComplete?.()} />
        <GhostLink
          label="Change my answers"
          onPress={() => navigation.navigate("WhatToOwn")}
        />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: {
    flex: 1,
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },

  eyebrow: {
    fontFamily: FONT.display600,
    fontSize: 10,
    letterSpacing: 1.8,
    color: C.inkMuted,
  },
  h1: {
    marginTop: 10,
    fontFamily: FONT.display800,
    fontSize: 46,
    lineHeight: 46,
    letterSpacing: -2.3,
    color: C.bone,
  },
  sub: {
    marginTop: 14,
    fontFamily: FONT.display400,
    fontSize: 15,
    lineHeight: 23,
    color: C.inkSecondary,
  },

  rows: {
    marginTop: 26,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: C.hairline,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.hairline,
  },
  rowFirst: { borderTopWidth: 0 },
  rowLast: {},
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 7,
    backgroundColor: C.raised,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontFamily: FONT.display600, fontSize: 14, color: C.bone },
  rowSub: {
    marginTop: 2,
    fontFamily: FONT.display400,
    fontSize: 12,
    color: C.inkMuted,
  },

  note: {
    marginTop: 18,
    padding: 16,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#453D37",
  },
  noteText: {
    fontFamily: FONT.display400,
    fontSize: 13,
    lineHeight: 19,
    color: C.inkSecondary,
  },
});
