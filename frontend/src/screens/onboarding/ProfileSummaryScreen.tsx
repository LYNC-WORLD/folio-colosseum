// Result — prototype #s-result
// Submit logic is unchanged: same endpoint, same payload keys.
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useAuth, useOnboarding } from "../../context";
import { saveOnboardingProfile } from "../../lib";
import { submitLoginForm } from "../../services/onboarding";
import { hError, hSuccess } from "../../lib/haptics";
import { C, FONT, em, h1Size } from "../../theme";
import { Button, Rise } from "../../components/ui";
import {
  AFTER_HEADER,
  HEADER_STEP,
  OnboardingScaffold,
  Wash,
} from "../../components/onboarding/OnboardingScaffold";
import type { OnboardingStackParamList } from "../../navigation";

type Props = NativeStackScreenProps<OnboardingStackParamList, "ProfileSummary">;

export function ProfileSummaryScreen({ navigation, route }: Props) {
  const { computeProfile, picked, resolvedAmount, risk, horizon } =
    useOnboarding();

  const profile = computeProfile();
  const onComplete = route.params?.onComplete;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { idToken } = useAuth();

  const handleEnter = async () => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError(null);

      const interestedStocks = Object.entries(picked)
        .filter(([, selected]) => selected)
        .map(([assetId]) => assetId);

      const payload = {
        interestedStocks,
        amountToPutIn: resolvedAmount,
        question1: risk,
        question2: horizon,
      };
      // console.log("====================================");
      // console.log(payload);
      // console.log("====================================");
      const data = await submitLoginForm(payload, idToken!);
      // console.log("====================================");
      // console.log("hellos", data);
      // console.log("====================================");
      saveOnboardingProfile(profile);
      hSuccess();
      onComplete?.();
    } catch (err) {
      console.error("Failed to submit onboarding form:", err);
      hError();
      setError("We couldn't save your answers. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const rows: [string, string][] = [
    ["OWNS", profile.owns.join(" · ")],
    ["STARTS WITH", profile.capitalLabel],
    ["DRAWDOWN", profile.riskSummary],
    ["HORIZON", profile.horizonLabel],
  ];

  return (
    <OnboardingScaffold
      label="YOUR PROFILE"
      title={profile.title}
      titleStyle={h1Size(44)}
      body={profile.description}
      bodyStyle={{ color: C.ink2 }}
      headerGap={12}
      footer={
        <>
          {error ? (
            <Rise key={error} distance={8} duration={320}>
              <View
                style={s.error}
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
              >
                <View style={s.errorBar} />
                <Text style={s.errorText}>{error}</Text>
              </View>
            </Rise>
          ) : null}
          <Button
            title="Start investing"
            loading={isSubmitting}
            onPress={handleEnter}
          />
          <Button
            variant="link"
            size="sm"
            title="Retake the questions"
            disabled={isSubmitting}
            onPress={() => navigation.navigate("WhatToOwn")}
          />
        </>
      }
    >
      <View style={s.rows}>
        {rows.map(([k, v], i) => (
          <Rise key={k} delay={AFTER_HEADER + i * HEADER_STEP}>
            <View style={s.row}>
              <Text style={s.rowKey}>{k}</Text>
              <Text style={s.rowVal}>{v}</Text>
            </View>
          </Rise>
        ))}
      </View>

      <Rise delay={AFTER_HEADER + rows.length * HEADER_STEP}>
        <Wash label="WHAT CHANGES">
          <Text style={s.change}>{profile.whatChanges}</Text>
        </Wash>
      </Rise>
    </OnboardingScaffold>
  );
}

const s = StyleSheet.create({
  rows: { gap: 10 },
  row: {
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: C.surface,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowKey: {
    flex: 1,
    fontFamily: FONT.mono400,
    fontSize: 10,
    letterSpacing: em(10, 0.18),
    color: C.ink3,
  },
  rowVal: {
    flexShrink: 1,
    maxWidth: "68%",
    textAlign: "right",
    fontFamily: FONT.sans600,
    fontSize: 14.5,
    letterSpacing: em(14.5, -0.015),
    color: C.ink1,
  },
  change: {
    fontFamily: FONT.sans400,
    fontSize: 13,
    lineHeight: 20,
    color: C.ink2,
  },

  error: { flexDirection: "row", alignItems: "stretch", gap: 12 },
  errorBar: { width: 3, borderRadius: 2, backgroundColor: C.loss },
  errorText: {
    flex: 1,
    fontFamily: FONT.sans500,
    fontSize: 13.5,
    lineHeight: 20,
    color: C.loss,
  },
});
