# Folio

**Social investing for anyone, anywhere: US stocks, pre-IPO companies, index funds, and perps on Solana and Hyperliquid.**

Folio lets anyone in the world buy tokenized US stocks, pre-IPO companies, and index funds, and trade perps on them.

You don't need a brokerage account, a minimum balance, or to live in a particular country.

Users sign in with Google and can start investing in seconds from their own Solana wallet.

> Built for the [Colosseum Hackathon](https://colosseum.com/arena/hackathon/).

---

## Why Folio

- **Investing in US Stocks is hard:** Most of the world can't open a US brokerage account, Folio needs only a Google login.
- **Private markets are closed:** Pre-IPO companies like OpenAI, SpaceX, and Anthropic have mostly been open only to accredited investors and VCs.
- **Investing is hard:** Traditional apps hide what everyone else is doing.

On Folio, investing is social, and every position can be verified on-chain.

Our mission: **make tokenized assets accessible to anyone, anywhere, in one click.**

---

## Features

| | Feature | What it does |
|---|---|---|
| 📈 | **US stocks** | Buy tokenized Apple, Nvidia, Tesla and more (xStocks) in fractional amounts, 24/7, straight from your wallet. |
| 🚀 | **Pre-IPO shares** | Get exposure to private companies like OpenAI, SpaceX, and Anthropic through PreStocks. |
| 🧺 | **Index funds** | Buy S&P 500 and Nasdaq-100 style baskets in one tap, Each fund lists its constituents so users know exactly what they own. |
| 📊 | **Perp trading** | Go long or short on stocks, commodities, and indices with leverage through Hyperliquid perpetuals, from a separate perp account funded from your spot balance. |
| 🔁 | **Recurring buys** | Dollar-cost average into any stock, pre-IPO asset, or fund on a daily, weekly, or monthly schedule. |
| 🤖 | **Robo portfolio** | An AI-built portfolio matched to the user's risk profile and goals, rebalanced automatically as markets move. |
| 👥 | **Follow friends and top investors** | See the positions and moves of people you follow in real time and get notified when they buy or sell, Every decision stays manual. |
| 🤝 | **Invest together** | Create groups, propose an asset, discuss it, and choose to join in together. |
| 🏆 | **Leaderboard** | Top investors ranked by verified on-chain returns, not self-reported numbers. |

### Onboarding

The first-run flow asks four questions, which build the user's investor profile:

1. **What to own**: interests (US stocks, pre-IPO, funds)
2. **Starting size**: how much capital to start with
3. **Risk behavior**: how comfortable the user is with risk
4. **Holding period**: time horizon

---

## How it works

```
┌─────────────────────┐     Google Sign-In      ┌──────────────────────────────┐
│  Folio mobile app   │ ──────────────────────▶ │  user-management-service     │
│  (Expo/React Native)│ ◀── JWT + wallet addr ─ │  (Express + Prisma)          │
└─────────┬───────────┘                         │                              │
          │  quote / buy / sell / recurring /   │  • Privy: Solana + EVM       │
          │  open / close perp                  │  • Jupiter: USDC ⇄ asset     │
          └───────────────────────────────────▶ │  • Hyperliquid: perp orders  │
                                                │  • Portfolio, trades, index  │
                                                │    funds, recurring buys     │
                                                └───────┬──────────────┬───────┘
                                       signed swap tx   │              │  agent-signed order
                                                        ▼              ▼
                                  ┌──────────────────────────┐  ┌──────────────────────┐
                                  │      Solana mainnet      │◀▶│     Hyperliquid      │
                                  │  Jupiter aggregator      │  │  Perpetuals on       │
                                  │  xStocks (US equities)   │  │  stocks, commodities │
                                  │  PreStocks (pre-IPO)     │  │  and indices         │
                                  └──────────────────────────┘  └──────────────────────┘
                                                            ◀▶ SOL bridge via Hyperunit
                                                ▲
┌─────────────────────┐   prices every 5 min / daily open
│  pricing-service    │ ── xStocks API + PreStocks API ──┘
│  (node-cron)        │ ──▶ Postgres (shared)
└─────────────────────┘
```

- **Wallets per user:** At sign-up, the backend creates a Privy user linked to the Google account and provisions a dedicated **Solana wallet** (spot) and an **Ethereum wallet** (Hyperliquid account) for that user. Assets settle into the user's own wallets, never into a pooled Folio account.
- **Routing, not issuing.** Folio doesn't issue any exposure itself. It aggregates liquidity venues and routes each order:
  - **US stocks**: tokenized equities from **xStocks** (SPL / Token-2022 tokens on Solana).
  - **Pre-IPO**: tokenized exposure to private companies from **PreStocks**.
  - Spot trades execute as **USDC ⇄ asset swaps routed through Jupiter**, which finds the best price across Solana liquidity. The resulting tokens land in the user's wallet.
  - **Perps**: orders go to **Hyperliquid**, with cross or isolated margin. The perp account is separate from spot, so leveraged positions never touch spot holdings.
- **Funding the perp account.** A deposit swaps USDC to SOL on Jupiter, bridges the SOL to the user's Hyperliquid address through 
- **Agent wallets.** Perp orders are signed by a per-user Hyperliquid agent (API) wallet, whose key is encrypted at rest with `ENCRYPTION_KEY`.
- **Index funds** are baskets of tokenized constituents. Buying a fund executes a Jupiter swap for each constituent in proportion.
- **Recurring buys** are stored as schedules and executed by the same routing layer at the chosen frequency.
- **Verifiable by design.** Balances are read directly from chain (SOL, SPL, and Token-2022 accounts), so positions, the social feed, and the leaderboard reflect real on-chain activity.
- **Pricing.** A separate service keeps live prices (every 5 minutes) and daily open prices in Postgres from the xStocks and PreStocks APIs, Charts come from Jupiter's data API.

---

## Tech stack

| Layer | Tech |
|---|---|
| Mobile app | Expo SDK 57, React Native 0.86, React 19, TypeScript, React Navigation, TanStack Query, react-native-svg |
| Auth | Google Sign-In (`@react-native-google-signin`), `google-auth-library`, JWT |
| Wallets and swaps | Privy (server wallets), Jupiter Swap API, `@solana/web3.js` |
| Perps | Hyperliquid API |
| Assets | xStocks (tokenized US equities), PreStocks (tokenized pre-IPO) |
| Backend | Node.js, Express 5, Prisma 7, PostgreSQL |
| Pricing | node-cron, xStocks API, PreStocks API, Jupiter chart API |
| Infra | Docker Compose |

---

## Getting started

### Prerequisites

- Node.js 20+
- PostgreSQL
- A [Privy](https://privy.io) app with server wallets enabled and an authorization key
- A Solana mainnet RPC URL
- A [Jupiter](https://dev.jup.ag) API key
- Google OAuth client IDs (web and iOS)
- Xcode and/or Android Studio to run the app

### 1. Backend: user-management-service

```bash
cd backend/user-management-service
npm install
```

Create `backend/user-management-service/.env`:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/folio
PORT=5000
RPC_URL=https://your-solana-mainnet-rpc
PRIVY_APP_ID=...
PRIVY_APP_SECRET=...
PRIVY_AUTH_KEY=...
PRIVY_AUTH_ADDRESS=...
GOOGLE_CLIENT_ID=...
JUPITER_API_KEY=...
ENCRYPTION_KEY=...   # exactly 32 characters; encrypts Hyperliquid agent keys
```

Every variable above is required. The service refuses to start if one is missing.

```bash
npx prisma migrate deploy
npx prisma generate
npm run dev
```

### 2. Backend: pricing-service

```bash
cd backend/pricing-service
npm install
echo "DATABASE_URL=postgresql://user:password@localhost:5432/folio" > .env
npx prisma generate
npm run dev
```

You can also run both services with Docker from `backend/`:

```bash
cd backend
docker compose up --build
```

Compose exposes the user-management service on port **5010**, so set `PORT=5010` in its `.env` when running this way.

### 3. Mobile app

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
EXPO_PUBLIC_API_URL=http://<your-local-ip>:5000/api
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=...
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=...
```

Google Sign-In uses native modules, so run a development build instead of Expo Go:

```bash
npm run ios
```

```bash
npm run android
```

---

Built by [LYNC](https://lync.world).
