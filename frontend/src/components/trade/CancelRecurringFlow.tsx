// "Stop buying NVDA?" confirmation (prototype askCancel).
import { useCancelRecurringBuy } from "../../hooks/useTrade";
import { C } from "../../theme";
import { useSheet } from "../Sheet";
import { useToast } from "../Toast";
import { Button } from "../ui/Button";
import { Heading, Note, Step } from "./SheetParts";

type Props = { recurringId: string; symbol: string; label: string; onCancelled?: () => void };

export function CancelRecurringFlow({ recurringId, symbol, label, onCancelled }: Props) {
  const sheet = useSheet();
  const toast = useToast();
  const cancel = useCancelRecurringBuy();

  return (
    <Step id="cancel">
      <Heading label="CANCEL RECURRING BUY" labelColor={C.loss} title={`Stop buying ${symbol}?`} />
      <Note>
        {label}. What you have already bought stays in your Folio. Only future buys stop.
      </Note>
      {cancel.error instanceof Error ? <Note>{cancel.error.message}</Note> : null}
      <Button
        variant="danger"
        title="Cancel recurring buy"
        loading={cancel.isPending}
        onPress={async () => {
          try {
            await cancel.mutateAsync(recurringId);
            sheet.close();
            toast("Recurring buy cancelled", `${symbol.toUpperCase()} · NO FUTURE BUYS`);
            onCancelled?.();
          } catch {
            // shown above
          }
        }}
      />
      <Button variant="link" size="sm" title="Keep it" disabled={cancel.isPending} onPress={() => sheet.close()} />
    </Step>
  );
}
