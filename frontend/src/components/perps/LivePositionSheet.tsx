// Position details + close, for live Hyperliquid positions (replaces the mock PositionSheet).
import { useState } from "react";
import { Text, View } from "react-native";
import { Body, Btn, H2, Kv, KvCard, Sheet, Tag } from "../PerpUi";
import { fmtPx, sMoney, sPct, sideTxt, toast } from "../../data/perpsStore";
import { C } from "../../theme";
import { livePnl, liveRoe, type UiPosition } from "../../hooks/perps";
import { errMsg } from "../../services/hyperliquid/format";

export function LivePositionSheet({
  position: p,
  mark,
  label,
  onClose,
  onClosePosition,
  onMoveToSpot,
}: {
  position: UiPosition;
  mark: number;
  label: string;
  onClose: () => void;
  onClosePosition: (fraction: number) => Promise<unknown>;
  onMoveToSpot?: () => void;
}) {
  const [busy, setBusy] = useState<null | number>(null);
  const pnl = livePnl(p, mark);
  const roe = liveRoe(p, mark);

  const close = async (fraction: number) => {
    setBusy(fraction);
    try {
      await onClosePosition(fraction);
      toast(
        fraction === 1 ? "Position closed" : "Half closed",
        `${label.toUpperCase()} · ${sMoney(pnl * fraction)}`,
      );
      onClose();
    } catch (e) {
      toast("Couldn't close", errMsg(e).toUpperCase());
    } finally {
      setBusy(null);
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
        label={busy === 1 ? "Closing…" : "Close position"}
        disabled={busy != null}
        onPress={() => close(1)}
      />
      <Btn
        kind="ghost"
        small
        label={busy === 0.5 ? "Closing…" : "Close half"}
        disabled={busy != null}
        onPress={() => close(0.5)}
      />
    </Sheet>
  );
}
