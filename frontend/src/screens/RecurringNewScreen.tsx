// New recurring buy — prototype #s-recnew ("Buy NVDA on a schedule").
// Monthly on a chosen day (what the backend supports); confirm/working/done
// run in the same sheet as the stock page.

import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useWallet } from "../context/WalletContext";
import type { ProfileStackParamList } from "../navigation/ProfileStack";
import { C, FONT, TYPE, em, h1Size } from "../theme";
import { timing } from "../theme/motion";
import { Button, Chip, Rise } from "../components/ui";
import { BackLink } from "../components/BackLink";
import { DayPicker } from "../components/DayPicker";
import { useSheet } from "../components/Sheet";
import { useToast } from "../components/Toast";
import { BuyFlow } from "../components/trade/BuyFlow";
import { money, money0 } from "../lib/format";
import { cleanAmt, dayDate, defaultDay, nextOccurrence, thenText } from "../lib/trade";

type Nav = NativeStackNavigationProp<ProfileStackParamList, "RecurringNew">;
const PRESETS = [10, 20, 50, 100];

export function RecurringNewScreen() {
  const nav = useNavigation<Nav>();
  const { params } = useRoute<RouteProp<ProfileStackParamList, "RecurringNew">>();
  const insets = useSafeAreaInsets();
  const sheet = useSheet();
  const toast = useToast();
  const { usdc, loading: walletLoading } = useWallet();

  const [input, setInput] = useState("100");
  const [day, setDay] = useState(defaultDay());
  const amt = parseFloat(input) || 0;
  const balance = usdc?.balance ?? 0;
  const over = !walletLoading && amt > balance + 1e-9;

  // focus ring on the amount card
  const f = useSharedValue(0);
  const ring = useAnimatedStyle(() => ({
    borderColor: over ? C.loss : interpolateColor(f.value, [0, 1], ["rgba(55,224,153,0)", C.mint]),
    backgroundColor: interpolateColor(f.value, [0, 1], [C.surface, C.raised]),
  }));

  const start = () =>
    sheet.open(
      <BuyFlow
        stock={{ tokenAddress: params.tokenAddress, symbol: params.symbol, price: params.price }}
        amount={amt}
        recurringDay={day}
        isPreIpo={params.category === "pre-ipo"}
        canMakeRecurring={false}
        onFinish={(_, sum) => {
          sheet.close();
          toast("Recurring buy is on", `${money(sum.amount)} OF ${params.symbol.toUpperCase()} EVERY MONTH`);
          nav.goBack();
        }}
      />,
      { label: "Confirm recurring buy" },
    );

  return (
    <View style={s.safe}>
      <ScrollView
        contentContainerStyle={[s.page, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <BackLink label="Standing orders" onPress={() => nav.goBack()} />

        <Rise duration={460}>
          <Text style={[TYPE.h1]} accessibilityRole="header">
            Buy {params.symbol}
            {"\n"}on a schedule
          </Text>
        </Rise>

        <Rise duration={460} delay={55} style={{ gap: 12 }}>
          <Text style={TYPE.lbl}>AMOUNT EACH TIME</Text>
          <Animated.View style={[s.amtCard, ring]}>
            <Text style={s.cur}>$</Text>
            <TextInput
              value={input}
              onChangeText={(t) => setInput(cleanAmt(t))}
              onFocus={() => (f.value = withTiming(1, timing(220)))}
              onBlur={() => (f.value = withTiming(0, timing(220)))}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor="#3A404A"
              selectionColor={C.mint}
              style={[s.amtInput, over && { color: C.loss }]}
              accessibilityLabel="Amount each time, in US dollars"
            />
          </Animated.View>
          <View style={s.chips}>
            {PRESETS.map((p) => (
              <Chip key={p} label={`$${p}`} on={amt === p} onPress={() => setInput(String(p))} />
            ))}
          </View>
          {over ? <Text style={[s.hint, { color: C.loss }]}>More than the {money(balance)} USDC you have now</Text> : null}
        </Rise>

        <Rise duration={460} delay={110} style={{ gap: 12 }}>
          <Text style={TYPE.lbl}>EVERY MONTH ON THE</Text>
          <DayPicker day={day} onPick={setDay} />
        </Rise>

        <Rise duration={460} delay={165}>
          <View style={s.wash}>
            <Text style={TYPE.lbl}>WHAT THIS DOES</Text>
            <Text style={s.blurb}>
              {thenText(day)}, {money(amt)} of USDC buys {params.symbol} at the best price we can route, and it settles
              straight to your wallet. First buy: {dayDate(nextOccurrence(day))}. If your balance is short, that buy is
              skipped. Nothing is ever borrowed.
            </Text>
            <View style={s.yearRow}>
              <Text style={s.yearKey}>A YEAR AT THIS RATE</Text>
              <Text style={s.yearVal}>{money0(amt * 12)}</Text>
            </View>
          </View>
        </Rise>

        <Rise duration={460} delay={220}>
          <Button
            title={amt > 0 ? `Buy ${money(amt)} every month` : "Enter an amount"}
            disabled={amt <= 0 || over || walletLoading}
            onPress={start}
          />
        </Rise>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.ground },
  page: { paddingHorizontal: 20, gap: 22 },
  amtCard: { height: 66, borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 2 },
  cur: { fontFamily: FONT.sans800, fontSize: 32, letterSpacing: em(32, -0.04), color: C.ink4 },
  amtInput: { flex: 1, height: "100%", padding: 0, fontFamily: FONT.sans800, fontSize: 32, letterSpacing: em(32, -0.04), color: C.ink1 },
  chips: { flexDirection: "row", gap: 8 },
  hint: { fontFamily: FONT.mono400, fontSize: 11.5 },
  wash: { backgroundColor: C.sunk, borderRadius: 18, padding: 16, gap: 10 },
  blurb: { fontFamily: FONT.sans400, fontSize: 13, lineHeight: 21, color: C.ink2 },
  yearRow: { flexDirection: "row", alignItems: "center", paddingTop: 12, borderTopWidth: 1, borderTopColor: C.hair },
  yearKey: { flex: 1, fontFamily: FONT.mono400, fontSize: 10, letterSpacing: em(10, 0.16), color: C.ink4 },
  yearVal: { fontFamily: FONT.mono400, fontSize: 15, color: C.ink1, fontVariant: ["tabular-nums"] },
});
