// Sheets for Groups: create a group, propose a buy (pick asset → set share).
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { C, FONT, TYPE, em } from "../../theme";
import { useSheet } from "../Sheet";
import { Button } from "../ui/Button";
import { Chip } from "../ui/Chip";
import { Switch } from "../ui/Switch";
import { AssetPickerSheet, type PickedAsset } from "../AssetPickerSheet";
import { Step } from "../trade/SheetParts";
import { money } from "../../lib/format";

const SHARES = [10, 25, 50, 100];

export function NewGroupSheet({ onCreate }: { onCreate: (name: string, min: number, isPublic: boolean) => void }) {
  const sheet = useSheet();
  const [name, setName] = useState("");
  const [min, setMin] = useState(25);
  const [pub, setPub] = useState(false);
  const ok = name.trim().length >= 2;

  return (
    <Step id="newgroup">
      <View style={{ gap: 6 }}>
        <Text style={TYPE.lbl}>NEW GROUP</Text>
        <Text style={TYPE.h2}>Start a group</Text>
        <Text style={[TYPE.body, { fontSize: 13 }]}>
          Invite people you trust. Every buy pools one order, and each share settles to its owner's own wallet.
        </Text>
      </View>
      <TextInput
        value={name}
        onChangeText={(t) => setName(t.slice(0, 32))}
        placeholder="Group name"
        placeholderTextColor={C.ink4}
        selectionColor={C.mint}
        style={s.field}
        autoFocus
        accessibilityLabel="Group name"
      />
      <View style={{ gap: 10 }}>
        <Text style={TYPE.lbl}>MINIMUM SHARE</Text>
        <View style={s.row}>
          {SHARES.map((v) => (
            <Chip key={v} label={`$${v}`} on={min === v} onPress={() => setMin(v)} />
          ))}
        </View>
      </View>
      <View style={s.toggleRow}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={TYPE.ttl}>Open to join</Text>
          <Text style={TYPE.sub}>Anyone can find it under Open to join</Text>
        </View>
        <Switch value={pub} onValueChange={setPub} accessibilityLabel="Open to join" />
      </View>
      <Button title="Create group" disabled={!ok} onPress={() => onCreate(name.trim(), min, pub)} />
      <Button variant="link" size="sm" title="Cancel" onPress={() => sheet.close()} />
    </Step>
  );
}

export function ProposeSheet({
  memberCount,
  onPropose,
}: {
  memberCount: number;
  onPropose: (a: PickedAsset, share: number) => void;
}) {
  const sheet = useSheet();
  const [asset, setAsset] = useState<PickedAsset | null>(null);
  const [share, setShare] = useState(50);

  if (!asset) {
    return (
      <AssetPickerSheet
        taken={new Set()}
        label="PROPOSE A BUY"
        title="What should the group buy?"
        onPick={setAsset}
      />
    );
  }

  return (
    <Step id="share">
      <View style={{ gap: 6 }}>
        <Text style={TYPE.lbl}>PROPOSE A BUY</Text>
        <Text style={TYPE.h2}>{asset.stock.name}</Text>
        <Text style={TYPE.sub}>
          {asset.stock.symbol} · {asset.category === "pre-ipo" ? "Pre-IPO" : "Stock"}
        </Text>
      </View>
      <View style={{ gap: 10 }}>
        <Text style={TYPE.lbl}>EACH MEMBER PUTS IN</Text>
        <View style={s.row}>
          {SHARES.map((v) => (
            <Chip key={v} label={`$${v}`} on={share === v} onPress={() => setShare(v)} />
          ))}
        </View>
      </View>
      <View style={s.wash}>
        <Text style={s.washText}>
          Buy together · {money(share)} each · up to {money(share * memberCount)} if all {memberCount} are in. You're
          counted in as the proposer. It closes in 24 hours.
        </Text>
      </View>
      <Button title="Propose to the group" onPress={() => onPropose(asset, share)} />
      <Button variant="link" size="sm" title="Pick a different asset" onPress={() => setAsset(null)} />
    </Step>
  );
}

const s = StyleSheet.create({
  field: { height: 50, borderRadius: 14, backgroundColor: C.surface, paddingHorizontal: 16, fontFamily: FONT.sans400, fontSize: 16, color: C.ink1 },
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  wash: { backgroundColor: C.sunk, borderRadius: 18, padding: 16 },
  washText: { fontFamily: FONT.sans400, fontSize: 13, lineHeight: 20, color: C.ink2, letterSpacing: em(13, 0) },
});
