import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useWallet } from "../context";
import { C, RADIUS } from "../theme/colors";
import { FONT } from "../theme/fonts";
import { useStartRecurringBuy } from "../hooks/useTrade";
import type { RecurringBuyRequest } from "../services/trade";
type Mode = "usd" | "stock";

const DECIMALS: Record<Mode, number> = { usd: 2, stock: 6 };
const DAYS = Array.from({ length: 30 }, (_, i) => i + 1);

type Props = {
  visible: boolean;
  onClose: () => void;
  stock: { tokenAddress: string; symbol: string; price: string | number };
};

function sanitize(text: string, decimals: number) {
  let t = text.replace(",", ".").replace(/[^0-9.]/g, "");
  const [int, ...rest] = t.split(".");
  if (rest.length) t = `${int}.${rest.join("").slice(0, decimals)}`;
  return t;
}

function parseAmount(text: string) {
  const n = Number(text);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function formatUsd(n: number) {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

function formatDate(d: Date) {
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Resolves a day-of-month (1-30) into the next actual calendar date it
// occurs on. If that day has already passed this month, rolls to next month.
function nextOccurrence(day: number): Date {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  let candidate = new Date(year, month, day, 0, 0, 0, 0);
  if (candidate <= now) {
    candidate = new Date(year, month + 1, day, 0, 0, 0, 0);
  }
  return candidate;
}

function defaultDay() {
  const d = new Date();
  return Math.min(d.getDate() + 1, 30);
}

function useKeyboardHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const isIOS = Platform.OS === "ios";
    const showEvt = isIOS ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = isIOS ? "keyboardWillHide" : "keyboardDidHide";

    const show = Keyboard.addListener(showEvt, (e) => {
      if (isIOS) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      setHeight(e.endCoordinates.height);
    });
    const hide = Keyboard.addListener(hideEvt, () => {
      if (isIOS) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      setHeight(0);
    });

    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  return height;
}

export function RecurringBuySheet({ visible, onClose, stock }: Props) {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const { usdc, loading: walletLoading } = useWallet();
  const usdcBalance = usdc?.balance ?? 0;
  const price = Number(stock.price);

  const [mode, setMode] = useState<Mode>("usd");
  const [input, setInput] = useState("");
  const [day, setDay] = useState<number>(defaultDay());
  const [ready, setReady] = useState(false);

  const start = useStartRecurringBuy();

  useEffect(() => {
    if (visible) {
      setInput("");
      setMode("usd");
      setDay(defaultDay());
      start.reset();
      setReady(true);
    } else {
      setReady(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const amount = parseAmount(input);
  const insufficient =
    mode === "usd" && amount > 0 && !walletLoading && amount > usdcBalance;

  const canSubmit = ready && amount > 0 && !insufficient && !start.isPending;

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    if (amount > 0 && price > 0) {
      const converted = next === "stock" ? amount / price : amount * price;
      setInput(String(converted.toFixed(DECIMALS[next])));
    }
    setMode(next);
  };

  const upcomingDate = nextOccurrence(day);

  const handleStart = async () => {
    if (!canSubmit) return;

    const req: RecurringBuyRequest = {
      stockAddress: stock.tokenAddress,
      buyDate: upcomingDate.toISOString(),
      stockSymbol: stock.symbol,
      usdcAmount: mode === "usd" ? String(amount) : undefined,
      stockAmount: mode === "stock" ? String(amount) : undefined,
    };

    try {
      await start.mutateAsync(req);
      Keyboard.dismiss();
      onClose();
      Alert.alert(
        "Recurring buy started",
        `${mode === "usd" ? formatUsd(amount) : `${amount} ${stock.symbol}`} of ${stock.symbol}, every month on day ${day}. Next buy: ${formatDate(upcomingDate)}.`,
      );
    } catch {}
  };

  const errorMessage = insufficient
    ? `Insufficient balance. You have ${usdcBalance} USDC.`
    : start.error instanceof Error
      ? start.error.message
      : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={s.root}>
        <Pressable style={StyleSheetAbsoluteFill} onPress={onClose} />

        <View
          style={[
            s.sheet,
            {
              marginBottom: keyboardHeight,
              paddingBottom: (keyboardHeight > 0 ? 0 : insets.bottom) + 16,
            },
          ]}
        >
          <View style={s.headerRow}>
            <Text style={s.title}>Recurring buy {stock.symbol}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={C.inkMuted} />
            </Pressable>
          </View>

          <Text style={s.available}>
            Available: {walletLoading ? "…" : `${usdcBalance} USDC`}
          </Text>

          <View style={s.modeTabs}>
            {(["usd", "stock"] as const).map((m) => (
              <Pressable
                key={m}
                onPress={() => switchMode(m)}
                style={[s.modePill, mode === m && s.modePillActive]}
              >
                <Text style={[s.modeText, mode === m && s.modeTextActive]}>
                  {m === "usd" ? "USD" : stock.symbol}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={[s.inputRow, insufficient && s.inputRowError]}>
            {mode === "usd" && <Text style={s.inputAffix}>$</Text>}
            <TextInput
              value={input}
              onChangeText={(t) => setInput(sanitize(t, DECIMALS[mode]))}
              placeholder="0"
              placeholderTextColor={C.inkMuted}
              keyboardType="decimal-pad"
              style={s.input}
              autoFocus
            />
            {mode === "stock" && (
              <Text style={s.inputAffix}>{stock.symbol}</Text>
            )}
          </View>

          <Text style={s.fieldLabel}>Buy automatically on day</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.dayRow}
          >
            {DAYS.map((d) => (
              <Pressable
                key={d}
                onPress={() => setDay(d)}
                style={[s.dayPill, day === d && s.dayPillActive]}
              >
                <Text style={[s.dayText, day === d && s.dayTextActive]}>
                  {d}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={s.dateRow}>
            <Ionicons name="calendar-outline" size={18} color={C.inkMuted} />
            <Text style={s.dateText}>Next buy: {formatDate(upcomingDate)}</Text>
          </View>

          {errorMessage && <Text style={s.error}>{errorMessage}</Text>}

          <Pressable
            onPress={handleStart}
            disabled={!canSubmit}
            style={[s.submitBtn, !canSubmit && s.submitBtnDisabled]}
          >
            {start.isPending ? (
              <ActivityIndicator color={C.buttonInk} />
            ) : (
              <Text style={s.submitText}>
                {insufficient
                  ? "Insufficient balance"
                  : amount > 0
                    ? "Start recurring buy"
                    : "Enter an amount"}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const StyleSheetAbsoluteFill = {
  position: "absolute" as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
};

const s = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  sheet: {
    backgroundColor: C.bg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: C.hairline,
    paddingHorizontal: 20,
    paddingTop: 18,
    gap: 14,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { color: C.bone, fontSize: 18, fontFamily: FONT.display600 },
  available: { color: C.inkMuted, fontSize: 13, fontFamily: FONT.mono400 },

  modeTabs: {
    flexDirection: "row",
    backgroundColor: C.card,
    borderRadius: RADIUS.sm,
    padding: 4,
    gap: 4,
  },
  modePill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    alignItems: "center",
  },
  modePillActive: { backgroundColor: C.raised },
  modeText: { color: C.inkMuted, fontSize: 13, fontFamily: FONT.display500 },
  modeTextActive: { color: C.bone },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 64,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.hairline,
  },
  inputRowError: { borderColor: C.clay },
  inputAffix: { color: C.inkMuted, fontSize: 22, fontFamily: FONT.mono500 },
  input: { flex: 1, color: C.bone, fontSize: 28, fontFamily: FONT.mono500 },

  fieldLabel: {
    color: C.inkMuted,
    fontSize: 12,
    fontFamily: FONT.display500,
    marginTop: 4,
  },

  dayRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingVertical: 2,
  },
  dayPill: {
    minWidth: 42,
    height: 42,
    paddingHorizontal: 10,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.hairline,
  },
  dayPillActive: { backgroundColor: C.bone, borderColor: C.bone },
  dayText: { color: C.inkMuted, fontSize: 14, fontFamily: FONT.mono500 },
  dayTextActive: { color: C.buttonInk },

  customIntervalBox: {
    flexDirection: "row",
    alignItems: "center",
    height: 42,
    paddingHorizontal: 10,
    borderRadius: RADIUS.sm,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.hairline,
    gap: 4,
  },
  customIntervalInput: {
    color: C.bone,
    fontSize: 14,
    fontFamily: FONT.mono500,
    minWidth: 24,
    padding: 0,
  },
  customIntervalSuffix: {
    color: C.inkMuted,
    fontSize: 12,
    fontFamily: FONT.display400,
  },

  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 52,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.hairline,
  },
  dateText: { color: C.bone, fontSize: 15, fontFamily: FONT.mono500 },

  error: { color: C.clay, fontSize: 13, fontFamily: FONT.display400 },

  submitBtn: {
    height: 56,
    borderRadius: RADIUS.md,
    backgroundColor: C.bone,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitText: { color: C.buttonInk, fontSize: 16, fontFamily: FONT.display600 },
});
