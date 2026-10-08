import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Body, Btn, H2, Kv, KvCard, Sheet, Tag } from "../PerpUi";
import { fmtPx, sMoney, sPct, sideTxt, toast } from "../../data/perpsStore";
import { C } from "../../theme";
import { livePnl, liveRoe, type UiPosition } from "../../hooks/perps";
import { errMsg } from "../../services/hyperliquid/format";
import { hTap } from "../../lib/haptics";
import Svg, { Path } from "react-native-svg";

export function LivePositionSheet({
  position: p,
  mark,
  label,
  onClose,
  onClosePosition,
  onMoveToSpot,
  onEditTpSl,
}: {
  position: UiPosition;
  mark: number;
  label: string;
  onClose: () => void;
  onClosePosition: () => Promise<unknown>;
  onMoveToSpot?: () => void;
  onEditTpSl?: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const pnl = livePnl(p, mark);
  const roe = liveRoe(p, mark);

  const close = async () => {
    setBusy(true);
    try {
      await onClosePosition();
      toast("Position closed", `${label.toUpperCase()} · ${sMoney(pnl)}`);
      onClose();
    } catch (e) {
      toast("Couldn't close", errMsg(e).toUpperCase());
    } finally {
      setBusy(false);
    }
  };

  const rows: [string, string][] = [
    ["SIZE", `${p.size} · ${fmtPx(p.size * mark)}`],
    ["ENTRY", fmtPx(p.entry)],
    ["MARK", fmtPx(mark)],
    ["LIQUIDATION", p.liq != null ? fmtPx(p.liq) : "—"],
    ["MARGIN", `${fmtPx(p.margin)} · ${p.isCross ? "cross" : "isolated"}`],
    ["TAKE PROFIT", p.tp != null ? fmtPx(p.tp) : "Not set"],
    ["STOP LOSS", p.sl != null ? fmtPx(p.sl) : "Not set"],
    ["FUNDING SINCE OPEN", sMoney(p.fundingSinceOpen)],
  ];

  return (
    <Sheet onClose={onClose}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <H2 style={{ flex: 1 }}>{label}</H2>
        <Tag
          label={`${sideTxt(p.side)} ${p.lev}x`}
          tone={p.side > 0 ? "long" : "short"}
        />
        {onEditTpSl ? (
          <Pressable
            onPress={() => {
              hTap();
              onEditTpSl();
            }}
            hitSlop={8}
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#1A1F27",
            }}
            accessibilityRole="button"
            accessibilityLabel={`Edit take profit and stop loss for ${label}`}
          >
            <Svg
              width={15}
              height={15}
              viewBox="0 0 20 20"
              fill="none"
              stroke={C.ink3}
              strokeWidth={1.8}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <Path d="M13.5 3.5 16.5 6.5 7 16H4v-3L13.5 3.5Z" />
            </Svg>
          </Pressable>
        ) : null}
      </View>
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
        <Text
          style={{
            fontSize: 28,
            fontWeight: "800",
            color: pnl >= 0 ? C.mint : C.loss,
          }}
        >
          {sMoney(pnl)}
        </Text>
        <Text style={{ fontSize: 13, color: roe >= 0 ? C.mint : C.loss }}>
          {sPct(roe)}
        </Text>
      </View>
      <KvCard>
        {rows.map(([k, v], i) => (
          <Kv key={k} k={k} v={v} last={i === rows.length - 1} />
        ))}
      </KvCard>
      <Body style={{ fontSize: 12.5 }}>
        Closing sells at the market price. Small price moves can change the
        final amount.
      </Body>
      <Btn
        kind={p.side > 0 ? "short" : "long"}
        label={busy ? "Closing…" : "Close position"}
        disabled={busy}
        onPress={close}
      />
    </Sheet>
  );
}
