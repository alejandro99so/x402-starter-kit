# x402 Starter Kit

HTTP 402 payment integration with Ultravioleta facilitator on Avalanche Fuji testnet.

## Setup

```bash
git clone https://github.com/federiconardelli7/x402-starter-kit.git
cd x402-starter-kit
npm install
```

## Configuration

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in the required values:

- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` - Your WalletConnect project ID (get one at https://dashboard.reown.com)
- `MERCHANT_WALLET_ADDRESS` - Payment recipient wallet address

## Development

```bash
npm run dev
```

Open http://localhost:3000

## Build

```bash
npm run build
npm start
```

## Features

- HTTP 402 payment protocol implementation
- Two payment tiers (Basic: $0.01, Premium: $0.15)
- Ultravioleta community facilitator integration
- Real-time transaction logging
- Modern UI with shadcn components

## Technical Stack

- Next.js 15
- wagmi + viem for wallet connection
- x402-fetch for payment handling
- x402-hono for server-side middleware
- TypeScript
- Tailwind CSS
- shadcn/ui components
