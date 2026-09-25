import type { UserTransaction } from "../services/user";

/**
 * USD value of a transaction. Assumes `amount` is the token quantity and
 * `price` the price per token. If your API's `amount` is already in USD,
 * return Number(tx.amount) here instead — Folio's Activity sheet and the
 * Transactions screen both use this.
 */
export const txUsd = (tx: UserTransaction) => Number(tx.amount) * Number(tx.price);

export const isSell = (tx: UserTransaction) => String(tx.type).toUpperCase() === "SELL";
