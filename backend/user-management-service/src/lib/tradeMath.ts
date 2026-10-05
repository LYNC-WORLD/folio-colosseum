
export function toBaseUnits(amount: number, decimals: number): string {
  return BigInt(Math.floor(amount * 10 ** decimals)).toString();
}

export function averagePrice(
  heldAmount: number,
  heldCost: number,
  addedAmount: number,
  addedCost: number,
): number {
  return (heldCost + addedCost) / (heldAmount + addedAmount);
}

export function costBasisAfterSell(
  heldAmount: number,
  heldCost: number,
  soldAmount: number,
): number {
  if (heldAmount <= 0) return 0;
  return heldCost * Math.max(0, 1 - soldAmount / heldAmount);
}

export function indexOrder(
  stockPrices: number[],
  usdcAmount: number | undefined,
  indexAmount: number | undefined,
) {
  if (!stockPrices.length || stockPrices.some((price) => !price)) return;
  const unitPrice =
    stockPrices.reduce((sum, price) => sum + price, 0) / stockPrices.length;
  const totalUsdc = usdcAmount ?? (indexAmount ?? 0) * unitPrice;
  const usdcPerStock = totalUsdc / stockPrices.length;
  return {
    unitPrice,
    totalUsdc,
    indexAmount: totalUsdc / unitPrice,
    usdcPerStock,
    stockAmounts: stockPrices.map((price) => usdcPerStock / price),
  };
}
