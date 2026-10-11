// Buy / recurring-buy sheet: confirm → routing → done (or error).
// Prototype: #buyBtn handler + runBuy().
import { useMemo, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useBuyStock, useStartRecurringBuy, useTradeQuote } from "../../hooks/useTrade";
import type { TradeRequest } from "../../services/trade";
import { C } from "../../theme";
import { money } from "../../lib/format";
import { dayDate, nextOccurrence, ordinal, shortDate, thenText, units, PRE_IPO_LOCKED } from "../../lib/trade";
import { hError } from "../../lib/haptics";
import { useSheet } from "../Sheet";
import { Button } from "../ui/Button";
import { Heading, Note, Row, Step, Success, Working } from "./SheetParts";

type Stock = { tokenAddress: string; symbol: string; price: number };

export type BuyOutcome = "folio" | "orders" | "makeRecurring" | "stay";

type Props = {
  stock: Stock;
  amount: number;
  /** null = one-off buy; otherwise the day of the month for a recurring buy */
  recurringDay: number | null;
  isPreIpo: boolean;
  /** show "Make it recurring" after a one-off buy */
  canMakeRecurring: boolean;
  onFinish: (outcome: BuyOutcome, summary: { amount: number; units: number }) => void;
};

type StepId = "confirm" | "working" | "done" | "error";
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function BuyFlow({ stock, amount, recurringDay, isPreIpo, canMakeRecurring, onFinish }: Props) {
  const sheet = useSheet();
  const rep = recurringDay != null;
  const [step, setStep] = useState<StepId>("confirm");
  const [error, setError] = useState<string | null>(null);
  const [bought, setBought] = useState<number | null>(null);

  const req = useMemo<TradeRequest>(
    () => ({ stockAddress: stock.tokenAddress, stockSymbol: stock.symbol, usdcAmount: amount }),
    [stock.tokenAddress, stock.symbol, amount],
  );
  const quote = useTradeQuote("buy", rep ? null : req);
  const buy = useBuyStock();
  const start = useStartRecurringBuy();

  const firstDate = rep ? nextOccurrence(recurringDay!) : null;
  const estUnits = quote.data?.stockAmount ?? (stock.price ? amount / stock.price : 0);

  const run = async () => {
    setStep("working");
    sheet.setOptions({ dismissable: false });
    try {
      if (rep) {
        await Promise.all([
          start.mutateAsync({
            stockAddress: stock.tokenAddress,
            stockSymbol: stock.symbol,
            buyDate: firstDate!.toISOString(),
            usdcAmount: String(amount),
            stockAmount: undefined,
          }),
          wait(900),
        ]);
      } else {
        const [res] = await Promise.all([buy.mutateAsync(req), wait(900)]);
        setBought(typeof res?.stockAmount === "number" ? res.stockAmount : estUnits);
      }
      setStep("done");
    } catch (e) {
      hError();
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStep("error");
    } finally {
      sheet.setOptions({ dismissable: true });
    }
  };

  const finish = (o: BuyOutcome) => onFinish(o, { amount, units: bought ?? estUnits });

  if (step === "working") {
    return (
      <Step id="working">
        <Working
          title={rep ? "Setting up your recurring buy" : "Routing your order"}
          caption={rep ? "SCHEDULING WITH YOUR WALLET" : "FINDING BEST PRICE ACROSS VENUES"}
        />
      </Step>
    );
  }

  if (step === "done") {
    return rep ? (
      <Step id="done">
        <Success
          title={`${stock.symbol} every month`}
          body={`${money(amount)} is bought on ${shortDate(firstDate!)}, then on the ${ordinal(recurringDay!)} of every month.`}
        />
        <Button title="See standing orders" onPress={() => finish("orders")} />
        <Button variant="ghost" size="sm" title="Done" onPress={() => finish("stay")} />
      </Step>
    ) : (
      <Step id="done">
        <Success
          title={`You own ${units(bought ?? estUnits)} ${stock.symbol}`}
          body="Held at your address, not ours. It stays yours whatever happens to Folio."
        />
        <Button title="See my Folio" onPress={() => finish("folio")} />
        {canMakeRecurring ? (
          <Button variant="ghost" size="sm" title="Make it recurring" onPress={() => finish("makeRecurring")} />
        ) : (
          <Button variant="ghost" size="sm" title="Done" onPress={() => finish("stay")} />
        )}
      </Step>
    );
  }

  if (step === "error") {
    return (
      <Step id="error">
        <Heading label="ORDER NOT PLACED" labelColor={C.loss} title="That didn't go through" />
        <Note>{error} Nothing was taken from your wallet.</Note>
        <Button title="Try again" onPress={() => setStep("confirm")} />
        <Button variant="link" size="sm" title="Close" onPress={() => sheet.close()} />
      </Step>
    );
  }

  // confirm
  const quoteReady = rep || (!!quote.data && !quote.isError);
  return (
    <Step id="confirm">
      <Heading
        label={rep ? "CONFIRM RECURRING BUY" : "CONFIRM ORDER"}
        title={rep ? `${money(amount)} of ${stock.symbol}\nevery month` : `${money(amount)} of ${stock.symbol}`}
      />
      <View>
        {rep ? (
          <>
            <Row k="FIRST BUY" v={`${dayDate(firstDate!)} · ${money(amount)}`} />
            <Row k="THEN" v={thenText(recurringDay!)} />
          </>
        ) : (
          <Row k="ROUTE" v="Best price across venues" />
        )}
        <Row
          k="YOU RECEIVE"
          v={
            !rep && quote.isFetching && !quote.data ? (
              <ActivityIndicator size="small" color={C.ink3} />
            ) : (
              `≈ ${units(estUnits)} ${stock.symbol}${rep ? " each time" : ""}`
            )
          }
        />
        <Row k="PAY WITH" v="USDC" last />
      </View>

      {isPreIpo && PRE_IPO_LOCKED ? (
        <Note>
          This is a pre-IPO. {rep ? "Every buy in this order is" : "It is"} locked until the company lists or is acquired.
        </Note>
      ) : null}
      {rep ? (
        <Note tone="ink3">
          Cancel it any time from Standing orders. If your balance is short on the day, that buy is skipped. Nothing is
          ever borrowed.
        </Note>
      ) : null}
      {!rep && quote.isError ? <Note>Couldn't get a price for this amount. Try a different amount.</Note> : null}

      <Button
        title={rep ? "Start recurring buy" : "Confirm · settles to your wallet"}
        disabled={!quoteReady}
        onPress={run}
      />
      <Button variant="link" size="sm" title="Cancel" onPress={() => sheet.close()} />
    </Step>
  );
}
