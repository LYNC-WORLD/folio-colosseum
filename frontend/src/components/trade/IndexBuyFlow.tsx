// Index fund buy sheet: confirm → buying each stock → done (or partial / error).
// There is no fund-level trade on the backend, so a fund buy is one
// /api/trade/stock-buy per stock, with the USDC split by weight (splitBuy).
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useBuyStock } from "../../hooks/useTrade";
import { C, FONT } from "../../theme";
import { money } from "../../lib/format";
import { splitBuy, type Fund, type Leg } from "../../lib/indexFunds";
import { units } from "../../lib/trade";
import { hError } from "../../lib/haptics";
import { useSheet } from "../Sheet";
import { Button } from "../ui/Button";
import { Heading, Note, Row, Step, Success, Working } from "./SheetParts";

export type IndexBuyOutcome = "folio" | "stay";

type Props = {
  fund: Fund;
  amount: number;
  onFinish: (outcome: IndexBuyOutcome, summary: { spent: number }) => void;
};

type StepId = "confirm" | "working" | "done" | "error";
type Result = { leg: Leg; ok: boolean; units?: number; error?: string };

const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

export function IndexBuyFlow({ fund, amount, onFinish }: Props) {
  const sheet = useSheet();
  const buy = useBuyStock();
  const legs = useMemo(() => splitBuy(fund, amount), [fund, amount]);

  const [step, setStep] = useState<StepId>("confirm");
  const [current, setCurrent] = useState({ n: 0, symbol: "" });
  const [results, setResults] = useState<Result[]>([]);

  // Legs from an earlier attempt that already went through are not bought twice.
  const pending = legs.filter(
    (l) => !results.some((r) => r.ok && r.leg.holding.stock.tokenAddress === l.holding.stock.tokenAddress),
  );

  const run = async () => {
    setStep("working");
    sheet.setOptions({ dismissable: false });
    const kept = results.filter((r) => r.ok);
    const next: Result[] = [...kept];
    // one at a time: the trades all spend from the same wallet
    for (let i = 0; i < pending.length; i++) {
      const leg = pending[i];
      const { tokenAddress, symbol, price } = leg.holding.stock;
      setCurrent({ n: kept.length + i + 1, symbol });
      try {
        const res = await buy.mutateAsync({
          stockAddress: tokenAddress,
          stockSymbol: symbol,
          usdcAmount: leg.usdc,
        });
        next.push({
          leg,
          ok: true,
          units: typeof res?.stockAmount === "number" ? res.stockAmount : leg.usdc / Number(price),
        });
      } catch (e) {
        next.push({ leg, ok: false, error: errMsg(e) });
      }
    }
    setResults(next);
    sheet.setOptions({ dismissable: true });
    if (next.some((r) => !r.ok)) {
      hError();
      setStep("error");
    } else setStep("done");
  };

  const spent = results.filter((r) => r.ok).reduce((t, r) => t + r.leg.usdc, 0);
  const finish = (o: IndexBuyOutcome) => onFinish(o, { spent });

  if (step === "working") {
    return (
      <Step id="working">
        <Working
          title={`Buying ${current.symbol || fund.name}`}
          caption={`STOCK ${current.n} OF ${legs.length} · ${fund.name.toUpperCase()}`}
        />
      </Step>
    );
  }

  if (step === "done") {
    return (
      <Step id="done">
        <Success
          title={`You own ${fund.name}`}
          body={`${money(spent)} split across ${legs.length} stocks. Each one is held at your address, not ours.`}
        />
        <View>
          {results.map((r, i) => (
            <Row
              key={r.leg.holding.stock.tokenAddress}
              k={r.leg.holding.stock.symbol}
              v={`${units(r.units ?? 0)} · ${money(r.leg.usdc)}`}
              last={i === results.length - 1}
            />
          ))}
        </View>
        <Button title="See my Folio" onPress={() => finish("folio")} />
        <Button variant="ghost" size="sm" title="Done" onPress={() => finish("stay")} />
      </Step>
    );
  }

  if (step === "error") {
    const failed = results.filter((r) => !r.ok);
    const partial = failed.length < results.length;
    return (
      <Step id="error">
        <Heading
          label={partial ? "PARTLY BOUGHT" : "ORDER NOT PLACED"}
          labelColor={C.loss}
          title={partial ? `${failed.length} of ${legs.length} didn't go through` : "That didn't go through"}
        />
        <View>
          {results.map((r, i) => (
            <Row
              key={r.leg.holding.stock.tokenAddress}
              k={r.leg.holding.stock.symbol}
              v={
                <Text style={[s.val, { color: r.ok ? C.mint : C.loss }]}>
                  {r.ok ? `Bought ${money(r.leg.usdc)}` : "Failed"}
                </Text>
              }
              last={i === results.length - 1}
            />
          ))}
        </View>
        <Note>
          {failed[0]?.error}{" "}
          {partial
            ? `The ${money(spent)} that went through is in your wallet as stock. Only the failed ones are retried.`
            : "Nothing was taken from your wallet."}
        </Note>
        <Button title={partial ? `Retry ${failed.length} failed` : "Try again"} onPress={run} />
        <Button
          variant="link"
          size="sm"
          title="Close"
          onPress={() => (partial ? finish("stay") : sheet.close())}
        />
      </Step>
    );
  }

  // confirm
  return (
    <Step id="confirm">
      <Heading label="CONFIRM ORDER" title={`${money(amount)} of ${fund.name}`} />
      <View>
        <Row k="SPLIT ACROSS" v={`${legs.length} stocks, by weight`} />
        {legs.map((l) => (
          <Row
            key={l.holding.stock.tokenAddress}
            k={`${l.holding.stock.symbol} · ${l.holding.weight.toFixed(1)}%`}
            v={`${money(l.usdc)} ≈ ${units(l.holding.price ? l.usdc / l.holding.price : 0)}`}
          />
        ))}
        <Row k="PAY WITH" v="USDC" last />
      </View>
      <Note tone="ink3">
        This places {legs.length} separate orders, one per stock. Prices can move slightly between them.
      </Note>
      <Button title="Confirm · settles to your wallet" onPress={run} />
      <Button variant="link" size="sm" title="Cancel" onPress={() => sheet.close()} />
    </Step>
  );
}

const s = StyleSheet.create({
  val: { fontFamily: FONT.mono400, fontSize: 13, fontVariant: ["tabular-nums"] },
});
