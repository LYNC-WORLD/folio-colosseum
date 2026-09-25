// Sell sheet: amount → confirm → selling → done (or error).
// Prototype: openSell / renderSell / confirmSell / runSell.
import { useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useSellStock, useTradeQuote, useDebouncedValue } from "../../hooks/useTrade";
import type { TradeRequest } from "../../services/trade";
import { C, TYPE } from "../../theme";
import { money } from "../../lib/format";
import { cleanAmt, floorTo, fmtIn, units } from "../../lib/trade";
import { hError } from "../../lib/haptics";
import { useSheet } from "../Sheet";
import { Button } from "../ui/Button";
import { AmountField } from "../AmountField";
import { Heading, Note, Row, Step, Success, Working } from "./SheetParts";

type Props = {
  stock: { tokenAddress: string; symbol: string; price: number };
  /** tokens you hold */
  balance: number;
  /** "$20 every month" if a recurring buy is still on */
  recurringLabel?: string;
  onFinish: (outcome: "folio" | "stay" | "cancelRecurring", summary: { usd: number }) => void;
};

type StepId = "amount" | "confirm" | "working" | "done" | "error";
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function SellFlow({ stock, balance, recurringLabel, onFinish }: Props) {
  const sheet = useSheet();
  const value = balance * stock.price; // position in USD
  const [step, setStep] = useState<StepId>("amount");
  const [input, setInput] = useState("");
  const [all, setAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [received, setReceived] = useState<number | null>(null);

  const amt = parseFloat(input) || 0;
  const over = amt > value + 1e-9;
  const zero = amt <= 0;

  // "All" sells your exact token balance; otherwise $ → tokens at today's price
  const stockAmount = all ? balance : floorTo(stock.price ? amt / stock.price : 0, 6);
  const debounced = useDebouncedValue(stockAmount, 350);
  const req = useMemo<TradeRequest | null>(
    () => (debounced > 0 && !over ? { stockAddress: stock.tokenAddress, stockSymbol: stock.symbol, stockAmount: debounced } : null),
    [debounced, over, stock.tokenAddress, stock.symbol],
  );
  const quote = useTradeQuote("sell", step === "amount" || step === "confirm" ? req : null);
  const sell = useSellStock();
  const estUsd = quote.data?.usdcAmount ?? amt;
  const remaining = Math.max(0, balance - stockAmount);

  const hint = over
    ? `More than your ${money(value)} position`
    : zero
      ? "Enter how much to sell, or tap All"
      : `≈ ${units(stockAmount)} of your ${units(balance)} ${stock.symbol}`;

  const run = async () => {
    if (!req) return;
    setStep("working");
    sheet.setOptions({ dismissable: false });
    try {
      const [res] = await Promise.all([sell.mutateAsync(req), wait(900)]);
      setReceived(typeof res?.usdcAmount === "number" ? res.usdcAmount : estUsd);
      setStep("done");
    } catch (e) {
      hError();
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStep("error");
    } finally {
      sheet.setOptions({ dismissable: true });
    }
  };

  if (step === "working") {
    return (
      <Step id="working">
        <Working title="Selling at the best price" caption="ROUTING ACROSS VENUES" />
      </Step>
    );
  }

  if (step === "done") {
    const got = received ?? estUsd;
    return (
      <Step id="done">
        <Success
          title={`Sold ${money(got)} of ${stock.symbol}`}
          body={`${money(got)} USDC is back in your wallet. ${
            all || remaining <= 0 ? `You no longer hold ${stock.symbol}.` : `You still hold ${units(remaining)} ${stock.symbol}.`
          }${recurringLabel ? ` Your ${recurringLabel} buy is still on.` : ""}`}
        />
        <Button title="See my Folio" onPress={() => onFinish("folio", { usd: got })} />
        <Button variant="ghost" size="sm" title="Done" onPress={() => onFinish("stay", { usd: got })} />
        {recurringLabel ? (
          <Button variant="link" size="sm" title="Cancel the recurring buy too" onPress={() => onFinish("cancelRecurring", { usd: got })} style={{ minHeight: 40 }} />
        ) : null}
      </Step>
    );
  }

  if (step === "error") {
    return (
      <Step id="error">
        <Heading label="SALE NOT PLACED" labelColor={C.loss} title="That didn't go through" />
        <Note>{error} Nothing was sold.</Note>
        <Button title="Try again" onPress={() => setStep("confirm")} />
        <Button variant="link" size="sm" title="Close" onPress={() => sheet.close()} />
      </Step>
    );
  }

  if (step === "confirm") {
    return (
      <Step id="confirm">
        <Heading label="CONFIRM SALE" title={all ? `Sell all your ${stock.symbol}` : `Sell ${money(amt)} of ${stock.symbol}`} />
        <View>
          <Row k="YOU SELL" v={`≈ ${units(stockAmount)} ${stock.symbol}`} />
          <Row
            k="YOU RECEIVE"
            v={quote.isFetching && !quote.data ? <ActivityIndicator size="small" color={C.ink3} /> : `≈ ${money(estUsd)} USDC`}
          />
          <Row k="ROUTE" v="Best price across venues" last />
        </View>
        {quote.isError ? <Note>Couldn't get a price for this amount. Go back and try a different amount.</Note> : null}
        <Button variant="light" title="Confirm sale" disabled={!quote.data || quote.isError} onPress={run} />
        <Button variant="link" size="sm" title="Back" onPress={() => setStep("amount")} />
      </Step>
    );
  }

  // amount
  const pcts = [25, 50, 75, 100].map((p) => ({ label: p === 100 ? "All" : `${p}%`, value: Math.floor(value * p) / 100 }));
  return (
    <Step id="amount">
      <View style={{ gap: 6 }}>
        <Text style={TYPE.lbl}>SELL {stock.symbol.toUpperCase()}</Text>
        <Text style={[TYPE.sub, { fontSize: 13 }]}>
          You hold {units(balance)} {stock.symbol}, worth {money(value)}
        </Text>
      </View>
      <AmountField
        value={input}
        onChangeText={(t) => {
          setAll(false);
          setInput(cleanAmt(t));
        }}
        amount={amt}
        pcts={pcts}
        onPick={(v, label) => {
          setAll(label === "All");
          setInput(fmtIn(v));
        }}
        availValue={money(value)}
        availLabel="YOUR POSITION"
        hint={hint}
        bad={over}
        autoFocus
      />
      <Button
        variant="light"
        title={over ? "More than you hold" : zero ? "Enter an amount" : `Review sale · ${money(amt)}`}
        disabled={over || zero}
        onPress={() => setStep("confirm")}
      />
      <Button variant="link" size="sm" title="Cancel" onPress={() => sheet.close()} />
    </Step>
  );
}

/** Prototype: pre-IPO positions can't be sold before listing (when PRE_IPO_LOCKED). */
export function LockedSell({ symbol, value }: { symbol: string; value: number }) {
  const sheet = useSheet();
  return (
    <Step id="locked">
      <View style={{ gap: 10 }}>
        <Text style={TYPE.lbl}>SELL {symbol.toUpperCase()}</Text>
        <Text style={TYPE.h2}>{symbol} is locked until it lists</Text>
        <Text style={[TYPE.body, { fontSize: 13.5 }]}>
          Pre-IPO shares cannot be sold before the company goes public or is acquired. Your {money(value)} position
          becomes sellable here on that day.
        </Text>
      </View>
      <Button variant="quiet" title="Got it" onPress={() => sheet.close()} />
    </Step>
  );
}
