// "Which one?" sheet for starting a recurring buy: search + every stock and pre-IPO.
import { useMemo, useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { useStocks } from "../hooks";
import type { Stock } from "../types";
import type { StockCategory } from "../services";
import { C, FONT, TYPE } from "../theme";
import { dayChange } from "../lib/format";
import { AssetRow } from "./AssetRow";
import { Skeleton } from "./ui/Skeleton";
import { Step } from "./trade/SheetParts";

export type PickedAsset = { stock: Stock; category: StockCategory };

type Props = {
  /** token addresses that already have an active recurring buy */
  taken: Set<string>;
  onPick: (a: PickedAsset) => void;
  label?: string;
  title?: string;
  /** what greyed-out rows say (default "Already recurring") */
  takenLabel?: string;
};

export function AssetPickerSheet({
  taken,
  onPick,
  label = "NEW RECURRING BUY",
  title = "What do you want to buy?",
  takenLabel = "Already recurring",
}: Props) {
  const us = useStocks("us-stock");
  const pre = useStocks("pre-ipo");
  const [q, setQ] = useState("");

  const all = useMemo<PickedAsset[]>(
    () => [
      ...us.stocks.map((stock) => ({ stock, category: "us-stock" as const })),
      ...pre.stocks.map((stock) => ({ stock, category: "pre-ipo" as const })),
    ],
    [us.stocks, pre.stocks],
  );
  const list = useMemo(() => {
    const v = q.trim().toLowerCase();
    if (!v) return all;
    return all.filter(
      (a) =>
        a.stock.symbol.toLowerCase().includes(v) ||
        a.stock.name.toLowerCase().includes(v),
    );
  }, [all, q]);

  return (
    <Step id="pick">
      <View style={{ gap: 6 }}>
        <Text style={TYPE.lbl}>{label}</Text>
        <Text style={TYPE.h2}>{title}</Text>
      </View>
      <View style={s.box}>
        <Svg
          width={17}
          height={17}
          viewBox="0 0 20 20"
          fill="none"
          stroke={C.ink4}
          strokeWidth={1.8}
          strokeLinecap="round"
          style={s.icon}
        >
          <Circle cx="8.8" cy="8.8" r="5.4" />
          <Path d="m12.8 12.8 3.7 3.7" />
        </Svg>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search a ticker or company"
          placeholderTextColor={C.ink4}
          selectionColor={C.mint}
          autoCorrect={false}
          autoCapitalize="none"
          style={s.input}
        />
      </View>
      <ScrollView
        style={{ maxHeight: Dimensions.get("window").height * 0.46 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {us.loading && pre.loading ? (
          <View style={{ gap: 14 }}>
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} height={46} radius={12} />
            ))}
          </View>
        ) : list.length === 0 ? (
          <Text style={[TYPE.sub, { paddingVertical: 14 }]}>
            No match for “{q.trim()}”.
          </Text>
        ) : (
          list.map((a, i) => {
            const on = taken.has(a.stock.tokenAddress);
            return (
              <View
                key={a.category + a.stock.tokenAddress}
                style={on ? { opacity: 0.45 } : undefined}
                pointerEvents={on ? "none" : "auto"}
              >
                <AssetRow
                  symbol={a.stock.symbol}
                  name={a.stock.name}
                  price={Number(a.stock.price)}
                  imageUrl={a.stock.imageUrl}
                  change={dayChange(a.stock.price, a.stock.marketOpenPrice)}
                  kind={
                    on
                      ? takenLabel
                      : a.category === "pre-ipo"
                        ? "Pre-IPO"
                        : "Stock"
                  }
                  last={i === list.length - 1}
                  onPress={() => onPick(a)}
                />
              </View>
            );
          })
        )}
      </ScrollView>
    </Step>
  );
}

const s = StyleSheet.create({
  box: {
    height: 46,
    borderRadius: 14,
    backgroundColor: C.surface,
    justifyContent: "center",
  },
  icon: { position: "absolute", left: 14 },
  input: {
    height: "100%",
    paddingLeft: 42,
    paddingRight: 14,
    fontFamily: FONT.sans400,
    fontSize: 16,
    color: C.ink1,
  },
});
