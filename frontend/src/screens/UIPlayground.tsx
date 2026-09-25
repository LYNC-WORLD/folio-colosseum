// TEMPORARY — renders every Step 0 building block so you can check them on a device.
// Swap it in from App.tsx for a minute, look, then delete.
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { C, TYPE, h1Size, stagger } from "../theme";
import { useCountUp } from "../hooks/useCountUp";
import {
  Badge,
  Bar,
  Button,
  Chip,
  Mark,
  OptionCard,
  Pop,
  Rise,
  Segmented,
  Switch,
} from "../components/ui";

export default function UIPlayground() {
  const [chip, setChip] = useState("Weekly");
  const [picked, setPicked] = useState(1);
  const [multi, setMulti] = useState<string[]>(["US stocks"]);
  const [sw, setSw] = useState(true);
  const [seg, setSeg] = useState(0);
  const [target, setTarget] = useState(1240.5);
  const money = useCountUp(target);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.ground }}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
        <Pop>
          <Mark height={62} />
        </Pop>
        <Rise delay={stagger(1, 80)}>
          <Text style={[TYPE.h1, h1Size(48)]}>
            Own the{"\n"}world's best{"\n"}companies.
          </Text>
        </Rise>
        <Rise delay={stagger(2, 80)}>
          <Text style={TYPE.body}>
            Stocks, pre-IPOs, gold and treasuries — held in a wallet only you
            control.
          </Text>
        </Rise>

        <Text style={TYPE.lbl}>COUNT UP</Text>
        <Text style={[TYPE.mono, { fontSize: 40 }]}>${money.toFixed(2)}</Text>
        <Button
          variant="quiet"
          size="sm"
          title="Change value"
          onPress={() => setTarget((t) => (t > 2000 ? 1240.5 : 3480.12))}
        />

        <Text style={TYPE.lbl}>BUTTONS</Text>
        <Button title="Continue" />
        <Button variant="ghost" title="Retake the questions" />
        <Button title="Disabled" disabled />

        <Text style={TYPE.lbl}>CHIPS & BADGES</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {["Weekly", "Every 2 weeks", "Monthly"].map((c) => (
            <Chip
              key={c}
              label={c}
              on={chip === c}
              onPress={() => setChip(c)}
            />
          ))}
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Chip variant="mint" label="● AVAILABLE ANYWHERE" />
          <Badge label="PRE-IPO" />
          <Badge label="#1 THIS QUARTER" variant="mint" />
          <Badge label="NEW" variant="solid" />
        </View>

        <Text style={TYPE.lbl}>OPTIONS — SINGLE</Text>
        {["$10 – $100", "$100 – $1,000", "$1,000 – $10,000"].map((t, i) => (
          <OptionCard
            key={t}
            title={t}
            subtitle="Subtitle"
            selected={picked === i}
            onPress={() => setPicked(i)}
          />
        ))}
        <Text style={TYPE.lbl}>OPTIONS — MULTI</Text>
        {["US stocks", "Pre-IPOs"].map((t) => (
          <OptionCard
            key={t}
            shape="square"
            title={t}
            selected={multi.includes(t)}
            onPress={() =>
              setMulti((m) =>
                m.includes(t) ? m.filter((x) => x !== t) : [...m, t],
              )
            }
          />
        ))}

        <Text style={TYPE.lbl}>SWITCH · SEGMENTED · BAR</Text>
        <Switch value={sw} onValueChange={setSw} />
        <Segmented
          options={["Buy", "Recurring"]}
          index={seg}
          onChange={setSeg}
        />
        <Bar value={seg === 0 ? 0.62 : 0.25} />
      </ScrollView>
    </SafeAreaView>
  );
}
