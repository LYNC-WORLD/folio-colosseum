import { useState } from "react";
import { Text, View } from "react-native";
import { Body, Btn, H2, Kv, KvCard, Sheet, Tag } from "../PerpUi";
import { fmtPx, sPct, toast } from "../../data/perpsStore";
import { C } from "../../theme";
import { errMsg } from "../../services/hyperliquid/format";
import type { SymOrder } from "../../hooks/perps/useSymbolTrading";

const NOTE: Record<SymOrder["role"], string> = {
  tp: "When the price reaches this level, your position closes at market to lock in profit.",
  sl: "When the price reaches this level, your position closes at market to limit your loss.",
  stop: "This order triggers once the price reaches the trigger level.",
  limit: "This order rests on the book until the price reaches your limit.",
};

export function LiveOrderSheet({
  order: o,
  mark,
  label,
  roleLabel,
  tone,
  onClose,
  onCancelOrder,
}: {
  order: SymOrder;
  mark: number;
  label: string;
  roleLabel: string;
  tone: "long" | "short";
  onClose: () => void;
  onCancelOrder: () => Promise<unknown>;
}) {
  const [busy, setBusy] = useState(false);
  const col = tone === "long" ? C.mint : C.loss;
  const dist = mark ? ((o.px - mark) / mark) * 100 : 0;
  const fullPos = o.isPositionTpsl || o.size === 0;

  const cancel = async () => {
    setBusy(true);
    try {
      await onCancelOrder();
      toast("Order cancelled", `${label.toUpperCase()} · ${fmtPx(o.px)}`);
      onClose();
    } catch (e) {
      toast("Couldn't cancel", errMsg(e).toUpperCase());
    } finally {
      setBusy(false);
    }
  };

  const rows: [string, string][] = [
    ["TYPE", o.orderType],
    ["SIDE", o.side > 0 ? "Buy" : "Sell"],
    ...(o.isTrigger
      ? ([["TRIGGER", o.triggerText]] as [string, string][])
      : []),
    [o.isTrigger ? "TRIGGER PRICE" : "LIMIT PRICE", fmtPx(o.px)],
    ["MARK", fmtPx(mark)],
    ["DISTANCE FROM MARK", sPct(dist)],
    ["SIZE", fullPos ? "Full position" : `${o.size} · ${fmtPx(o.size * o.px)}`],
    ["REDUCE ONLY", o.reduceOnly ? "Yes" : "No"],
    ["PLACED", new Date(o.placedAt).toLocaleString()],
    ["ORDER ID", String(o.oid)],
  ];

  return (
    <Sheet onClose={busy ? () => {} : onClose}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <H2 style={{ flex: 1 }}>{label}</H2>
        <Tag label={roleLabel} tone={tone} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
        <Text style={{ fontSize: 28, fontWeight: "800", color: col }}>
          {fmtPx(o.px)}
        </Text>
        <Text style={{ fontSize: 13, color: C.ink3 }}>
          {sPct(dist)} from mark
        </Text>
      </View>
      <KvCard>
        {rows.map(([k, v], i) => (
          <Kv key={k} k={k} v={v} last={i === rows.length - 1} />
        ))}
      </KvCard>
      <Body style={{ fontSize: 12.5 }}>{NOTE[o.role]}</Body>
      <Btn
        kind={o.side > 0 ? "long" : "short"}
        label={busy ? "Cancelling…" : "Cancel order"}
        disabled={busy}
        onPress={cancel}
      />
    </Sheet>
  );
}
