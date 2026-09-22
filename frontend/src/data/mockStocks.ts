export type StockAsset = {
  id: string;
  symbol: string;
  name: string;
  price: number;
  changePct: number; // 24h
  marketCap: string;
  color: string;
};

export const MOCK_STOCKS: StockAsset[] = [
  {
    id: "aapl",
    symbol: "AAPL",
    name: "Apple Inc.",
    price: 254.32,
    changePct: 1.24,
    marketCap: "$3.9T",
    color: "#8B9BFF",
  },
  {
    id: "tsla",
    symbol: "TSLA",
    name: "Tesla Inc.",
    price: 412.18,
    changePct: -2.31,
    marketCap: "$1.3T",
    color: "#FF8F8F",
  },
  {
    id: "nvda",
    symbol: "NVDA",
    name: "NVIDIA Corp.",
    price: 187.55,
    changePct: 3.87,
    marketCap: "$4.6T",
    color: "#7EE7B8",
  },
  {
    id: "msft",
    symbol: "MSFT",
    name: "Microsoft Corp.",
    price: 512.9,
    changePct: 0.62,
    marketCap: "$3.8T",
    color: "#FFD98B",
  },
  {
    id: "amzn",
    symbol: "AMZN",
    name: "Amazon.com Inc.",
    price: 231.47,
    changePct: -0.48,
    marketCap: "$2.4T",
    color: "#FFA88B",
  },
  {
    id: "googl",
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    price: 198.76,
    changePct: 2.05,
    marketCap: "$2.5T",
    color: "#8BD3FF",
  },
];
