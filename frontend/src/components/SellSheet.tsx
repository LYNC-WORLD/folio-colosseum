import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useWallet } from "../context";
import {
  useSellStock,
  useDebouncedValue,
  useTradeQuote,
} from "../hooks/useTrade";
import type { TradeRequest } from "../services/trade";
import { C, RADIUS } from "../theme/colors";
import { FONT } from "../theme/fonts";

type Mode = "usd" | "stock";

const DECIMALS: Record<Mode, number> = { usd: 2, stock: 6 };

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

function floorTo(n: number, decimals: number) {
  const f = 10 ** decimals;
  return Math.floor(n * f) / f;
}

function formatUsd(n: number) {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

function formatUnits(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
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

export function SellSheet({ visible, onClose, stock }: Props) {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const { tokens, loading: walletLoading } = useWallet();

  // Find this stock's holding by mint address, same field name your
  // wallet response uses for tokens (`mint`), matched against tokenAddress.
  const holding = tokens.find((t) => t.mint === stock.tokenAddress);
  const stockBalance = holding?.balance ?? 0;
  const price = Number(stock.price);

  const [mode, setMode] = useState<Mode>("stock");
  const [input, setInput] = useState("");

  const amount = parseAmount(input);
  const debounced = useDebouncedValue(amount, 400);
  const settled = debounced === amount;

  const request = useMemo<TradeRequest | null>(() => {
    if (debounced <= 0) return null;
    const base = {
      stockAddress: stock.tokenAddress,
      stockSymbol: stock.symbol,
    };
    return mode === "usd"
      ? { ...base, usdcAmount: debounced }
      : { ...base, stockAmount: debounced };
  }, [debounced, mode, stock.tokenAddress, stock.symbol]);

  const quote = useTradeQuote("sell", visible ? request : null);
  const sell = useSellStock();

  useEffect(() => {
    if (visible) {
      setInput("");
      setMode("stock");
      sell.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const q = settled ? quote.data : undefined;

  const stockOut =
    mode === "stock"
      ? amount
      : (q?.stockAmount ?? (price ? amount / price : 0));
  const usdcReceive =
    mode === "usd" ? amount : (q?.usdcAmount ?? amount * price);

  const insufficient = amount > 0 && !walletLoading && stockOut > stockBalance;
  const quoteLoading = amount > 0 && (!settled || quote.isFetching) && !q;

  const canSell =
    amount > 0 &&
    !walletLoading &&
    !insufficient &&
    !!q &&
    !quote.isError &&
    !sell.isPending;

  const switchMode = (next: Mode) => {
    if (next === mode) return;
    if (amount > 0 && price > 0) {
      const converted = next === "usd" ? amount * price : amount / price;
      setInput(String(floorTo(converted, DECIMALS[next])));
    }
    setMode(next);
  };

  const setFraction = (fraction: number) => {
    const stockAmt = stockBalance * fraction;
    const value = mode === "stock" ? stockAmt : stockAmt * price;
    setInput(String(floorTo(value, DECIMALS[mode])));
  };

  const handleSell = async () => {
    if (!request || !canSell) return;
    try {
      const res = await sell.mutateAsync(request);
      Keyboard.dismiss();
      onClose();
      Alert.alert(
        "Order placed",
        `You sold ≈ ${formatUnits(res.stockAmount ?? stockOut)} ${stock.symbol}`,
      );
    } catch {
      // Error is shown inline via sell.error
    }
  };

  const errorMessage = insufficient
    ? `Insufficient balance. You have ${formatUnits(stockBalance)} ${stock.symbol}.`
    : sell.error instanceof Error
      ? sell.error.message
      : quote.isError && settled
        ? "Couldn't get a quote. Try a different amount."
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
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

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
            <Text style={s.title}>Sell {stock.symbol}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={C.inkMuted} />
            </Pressable>
          </View>

          <Text style={s.available}>
            Available:{" "}
            {walletLoading
              ? "…"
              : `${formatUnits(stockBalance)} ${stock.symbol}`}
          </Text>

          <View style={s.modeTabs}>
            {(["stock", "usd"] as const).map((m) => (
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

          <View style={s.chips}>
            {[
              { label: "25%", f: 0.25 },
              { label: "50%", f: 0.5 },
              { label: "Max", f: 1 },
            ].map(({ label, f }) => (
              <Pressable
                key={label}
                onPress={() => setFraction(f)}
                disabled={walletLoading || stockBalance <= 0}
                style={s.chip}
              >
                <Text style={s.chipText}>{label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={s.quoteBox}>
            <Text style={s.quoteLabel}>
              {mode === "stock" ? "You'll receive" : "You'll sell"}
            </Text>
            {quoteLoading ? (
              <ActivityIndicator size="small" color={C.bone} />
            ) : (
              <Text style={s.quoteValue}>
                {amount > 0
                  ? mode === "stock"
                    ? `≈ ${formatUsd(usdcReceive)}`
                    : `≈ ${formatUnits(stockOut)} ${stock.symbol}`
                  : "—"}
              </Text>
            )}
          </View>

          {errorMessage && <Text style={s.error}>{errorMessage}</Text>}

          <Pressable
            onPress={handleSell}
            disabled={!canSell}
            style={[s.sellBtnAction, !canSell && s.sellBtnDisabled]}
          >
            {sell.isPending ? (
              <ActivityIndicator color={C.buttonInk} />
            ) : (
              <Text style={s.sellText}>
                {insufficient
                  ? "Insufficient balance"
                  : amount > 0
                    ? `Sell ${formatUnits(stockOut)} ${stock.symbol}`
                    : "Enter an amount"}
              </Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

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

  chips: { flexDirection: "row", gap: 8 },
  chip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: C.hairline,
    alignItems: "center",
  },
  chipText: { color: C.inkSecondary, fontSize: 12, fontFamily: FONT.mono400 },

  quoteBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 24,
  },
  quoteLabel: { color: C.inkMuted, fontSize: 13, fontFamily: FONT.display400 },
  quoteValue: { color: C.bone, fontSize: 15, fontFamily: FONT.mono500 },

  error: { color: C.clay, fontSize: 13, fontFamily: FONT.display400 },

  sellBtnAction: {
    height: 56,
    borderRadius: RADIUS.md,
    backgroundColor: C.clay,
    alignItems: "center",
    justifyContent: "center",
  },
  sellBtnDisabled: { opacity: 0.45 },
  sellText: { color: C.buttonInk, fontSize: 16, fontFamily: FONT.display600 },
});
