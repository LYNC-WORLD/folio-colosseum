import { Pressable, SafeAreaView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { PrimaryButton, GhostLink } from "../../components/";
import { ASSET_DEFS, useOnboarding } from "../../context";
import { C, RADIUS, FONT } from "../../theme";
import type { OnboardingStackParamList } from "../../navigation";
import { ProgressBar } from "../../components";

type Props = NativeStackScreenProps<OnboardingStackParamList, "WhatToOwn">;

export function WhatToOwnScreen({ navigation }: Props) {
  const { picked, togglePicked, setShowEverything } = useOnboarding();
  const count = Object.values(picked).filter(Boolean).length;

  const goNext = () => navigation.navigate("StartingSize");

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.container}>
        <ProgressBar step={1} />

        <Text style={s.h1}>What do you want to own?</Text>
        <Text style={s.sub}>
          Pick as many as you like. Your home feed leads with these.
        </Text>

        <View style={s.grid}>
          {ASSET_DEFS.map((d) => {
            const on = picked[d.id];
            return (
              <Pressable
                key={d.id}
                onPress={() => togglePicked(d.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={d.label}
                style={[
                  s.tile,
                  {
                    backgroundColor: on ? C.raised : C.card,
                    borderColor: on ? C.bone : C.hairline,
                  },
                ]}
              >
                <View
                  style={[
                    s.dot,
                    {
                      backgroundColor: on ? C.bone : "transparent",
                      borderColor: on ? C.bone : "#453D37",
                    },
                  ]}
                />
                <Text style={s.tileLabel}>{d.label}</Text>
                <Text style={s.tileNote}>{d.note}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ flexGrow: 1 }} />

        <View style={s.countRow}>
          <Text style={s.countNum}>{count}</Text>
          <Text style={s.countLabel}>selected</Text>
        </View>

        <PrimaryButton label="Continue" onPress={goNext} />
        <GhostLink
          label="Show me everything instead"
          onPress={() => {
            setShowEverything(true);
            goNext();
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  container: {
    flex: 1,
    paddingTop: 24,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },

  h1: {
    marginTop: 28,
    fontFamily: FONT.display800,
    fontSize: 34,
    lineHeight: 34,
    letterSpacing: -1.5,
    color: C.bone,
  },
  sub: {
    marginTop: 8,
    marginBottom: 20,
    fontFamily: FONT.display400,
    fontSize: 14,
    lineHeight: 21,
    color: C.inkSecondary,
  },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    width: "48%",
    minHeight: 104,
    padding: 14,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 1 },
  tileLabel: {
    marginTop: 12,
    fontFamily: FONT.display600,
    fontSize: 15,
    color: C.bone,
  },
  tileNote: {
    marginTop: 4,
    fontFamily: FONT.display400,
    fontSize: 12,
    lineHeight: 17,
    color: C.inkMuted,
  },

  countRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  countNum: { fontFamily: FONT.mono400, fontSize: 12, color: C.bone },
  countLabel: { fontFamily: FONT.display400, fontSize: 12, color: C.inkMuted },
});
