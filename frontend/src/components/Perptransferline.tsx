// src/components/folio/PerpTransferLine.tsx
// "Perp account $0.00  Transfer ›" — matches the prototype's #fPerpLine.
// Self-contained: owns the TransferSheet drawer, so any screen can just render <PerpTransferLine />.
import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { useBalances } from "../hooks/useBalances";
import { PressScale } from "./ui";
import { hTap } from "../lib/haptics";
import { PerpToast } from "./perps/PerpToast";
import { TransferSheet } from "./TransferSheet";
import { C, FONT } from "../theme";
import { money } from "../lib/format";

export function PerpTransferLine({
  onMoved,
  withToast = true,
}: {
  /** called after a transfer finishes (e.g. refresh wallet balances) */
  onMoved?: () => void;
  /** set false if the host screen already mounts <PerpToast /> */
  withToast?: boolean;
}) {
  const { perp } = useBalances();
  const [open, setOpen] = useState(false);

  return (
    <>
      <PressScale
        scaleTo={0.97}
        onPress={() => {
          hTap();
          setOpen(true);
        }}
        style={s.line}
        accessibilityRole="button"
        accessibilityLabel={`Perp account ${money(perp)}. Transfer`}
      >
        <Text style={s.txt}>Perp account {money(perp)}</Text>
        <Text style={s.go}>Transfer ›</Text>
      </PressScale>

      {withToast ? <PerpToast /> : null}

      {open ? (
        <TransferSheet
          onClose={() => setOpen(false)}
          onMoved={() => {
            setOpen(false);
            onMoved?.();
          }}
        />
      ) : null}
    </>
  );
}

const s = StyleSheet.create({
  line: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    alignSelf: "flex-start",
    minHeight: 30,
  },
  txt: { fontFamily: FONT.mono400, fontSize: 11.5, color: C.ink3 },
  go: { fontFamily: FONT.sans700, fontSize: 12.5, color: C.mint },
});
