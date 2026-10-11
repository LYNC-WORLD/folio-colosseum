// Live order book for the Trade screen's "Order book" tab (l2Book WebSocket).
import { ActivityIndicator, Text, View } from "react-native";
import { C } from "../../theme";
import { fmtNum, fmtPx, qtyFmt } from "../../data/perpsStore";
import { useOrderBook } from "../../hooks/perps";
import type { BookRow } from "../../services/hyperliquid/format";
import { tradeStyles } from "../../screens/TradeScreen";

export function OrderBook({ sym, label, depth = 10 }: { sym: string; label: string; depth?: number }) {
  const { bids, asks, spread, mid, ready } = useOrderBook(sym, depth);

  if (!ready)
    return (
      <View style={{ paddingVertical: 28, alignItems: "center" }}>
        <ActivityIndicator color={C.ink3} />
      </View>
    );

  const mx = Math.max(1e-9, ...asks.map((x) => x.q), ...bids.map((x) => x.q));

  const Row = ({ x, bid }: { x: BookRow; bid: boolean }) => (
    <View style={tradeStyles.bRow}>
      <View
        style={[
          tradeStyles.bBar,
          bid
            ? { right: 0, backgroundColor: "rgba(55,224,153,.12)" }
            : { left: 0, backgroundColor: "rgba(240,96,77,.12)" },
          { width: `${(x.q / mx) * 100}%` },
        ]}
      />
      <Text style={[tradeStyles.bTxt, { color: bid ? C.mint : C.loss }]}>{fmtNum(x.p)}</Text>
      <Text style={[tradeStyles.bTxt, { color: C.ink3 }]}>{qtyFmt(x.q)}</Text>
    </View>
  );

  return (
    <View>
      <View style={{ flexDirection: "row", gap: 14 }}>
        <View style={{ flex: 1 }}>
          <Text style={tradeStyles.bHd}>BIDS · {label.toUpperCase()}</Text>
          {bids.map((x) => (
            <Row key={"b" + x.p} x={x} bid />
          ))}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[tradeStyles.bHd, { textAlign: "right" }]}>ASKS</Text>
          {asks.map((x) => (
            <Row key={"a" + x.p} x={x} bid={false} />
          ))}
        </View>
      </View>
      <Text style={tradeStyles.foot}>
        SPREAD {fmtPx(spread)} · {mid ? ((spread / mid) * 100).toFixed(3) : "0.000"}% · LIVE
      </Text>
    </View>
  );
}
