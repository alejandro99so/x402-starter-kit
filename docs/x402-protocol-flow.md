# x402 Payment Protocol Flow

This document explains how the x402 HTTP Payment Protocol works on Avalanche Fuji testnet.

## Core x402 Files

### 1. Client-Side: `app/page.tsx`

The `wrapFetchWithPayment` function from `x402-fetch` wraps the standard `fetch` to automatically handle HTTP 402 responses:

```typescript
import { wrapFetchWithPayment, Signer } from "x402-fetch";

const fetchWithPay = wrapFetchWithPayment(
  fetch,                              // Standard fetch
  walletClient as unknown as Signer,  // Wallet for signing payments
  BigInt(1_000_000)                   // Max payment: $1.00 USDC (6 decimals)
);

const response = await fetchWithPay("/api/basic");
```

**How it works:**
1. Makes initial request to the API
2. If server returns `402 Payment Required`, it extracts payment details from the response headers
3. Signs a payment authorization with the wallet
4. Retries the request with `X-Payment` header containing the signed payment

---

### 2. Server-Side: `app/api/basic/route.ts` & `app/api/premium/route.ts`

The `paymentMiddleware` from `x402-hono` protects routes requiring payment:

```typescript
import { paymentMiddleware } from "x402-hono";

app.use(
  "*",
  paymentMiddleware(
    merchantAddress,                    // Where USDC gets sent
    {
      "/*": {                           // Route pattern
        price: "$0.01",                 // Price in USD
        network: "avalanche-fuji",      // Network identifier
      },
    },
    {
      url: "https://facilitator.ultravioletadao.xyz",  // Facilitator server
    }
  )
);
```

**Key configuration parameters:**

| Parameter | Description |
|-----------|-------------|
| `merchantAddress` | Your wallet that receives USDC payments |
| `price` | Human-readable price (e.g., `"$0.15"`) |
| `network` | Must be `"avalanche-fuji"` for testnet |
| `url` | Facilitator that verifies and settles payments |

---

### 3. Wallet Configuration: `app/providers.tsx`

Wagmi config for Avalanche Fuji:

```typescript
import { avalancheFuji } from "wagmi/chains";

const config = getDefaultConfig({
  chains: [avalancheFuji],  // Chain ID: 43113
  // ...
});
```

---

## Avalanche Fuji Network Details

| Item | Value |
|------|-------|
| **Chain ID** | 43113 |
| **Network Name** | `"avalanche-fuji"` |
| **USDC Contract** | `0x5425890298aed601595a70AB815c96711a31Bc65` |
| **Facilitator** | `https://facilitator.ultravioletadao.xyz` |
| **Token Decimals** | 6 (so `1_000_000` = $1.00) |

---

## How x402 Knows What to Request

### Step 1: Server Returns Payment Requirements (402 Response)

When you hit a protected endpoint without payment, the server returns a `402 Payment Required` with headers:

```
HTTP/1.1 402 Payment Required
X-Payment-Required: <base64-encoded JSON>
```

The `X-Payment-Required` header contains base64-encoded JSON with payment details:

```json
{
  "scheme": "exact",
  "network": "avalanche-fuji",
  "maxAmountRequired": "10000",
  "resource": "/api/basic",
  "description": "Payment required",
  "mimeType": "application/json",
  "payTo": "0x1d5ab913fb1b76d7ed2c9a731f39be76cb0d34b1",
  "maxTimeoutSeconds": 300,
  "asset": "0x5425890298aed601595a70AB815c96711a31Bc65",
  "extra": {
    "name": "USDC",
    "version": "2"
  }
}
```

| Field | Description |
|-------|-------------|
| `scheme` | Payment scheme type (`"exact"` = fixed price) |
| `network` | Blockchain network (`"avalanche-fuji"`) |
| `maxAmountRequired` | Amount in token's smallest unit (10000 = $0.01 USDC) |
| `resource` | The protected endpoint path |
| `payTo` | Merchant wallet address receiving payment |
| `asset` | **USDC contract address** - this tells client which token |
| `maxTimeoutSeconds` | How long the payment authorization is valid |
| `extra.name` | Token name for display |
| `extra.version` | EIP-3009 version for signature |

---

### Step 2: Client Creates Payment Authorization

The `wrapFetchWithPayment` function:

1. **Decodes** the `X-Payment-Required` header (base64 -> JSON)
2. **Checks** if `maxAmountRequired` <= configured `maxValue`
3. **Creates** an EIP-3009 `transferWithAuthorization` signature

The payment payload before encoding:

```json
{
  "x402Version": 1,
  "scheme": "exact",
  "network": "avalanche-fuji",
  "payload": {
    "signature": "0x...",
    "authorization": {
      "from": "0xYourWallet...",
      "to": "0xMerchant...",
      "value": "10000",
      "validAfter": "0",
      "validBefore": "1732900000",
      "nonce": "0x..."
    }
  }
}
```

| Field | Description |
|-------|-------------|
| `x402Version` | Protocol version |
| `scheme` | Must match server's scheme |
| `network` | Must match server's network |
| `payload.signature` | EIP-712 typed signature from wallet |
| `payload.authorization.from` | Payer's wallet address |
| `payload.authorization.to` | Merchant address (from `payTo`) |
| `payload.authorization.value` | Amount in smallest units |
| `payload.authorization.validAfter` | Unix timestamp (usually 0) |
| `payload.authorization.validBefore` | Expiration timestamp |
| `payload.authorization.nonce` | Random nonce to prevent replay |

---

### Step 3: X-Payment Header Creation

The client encodes the payment object to base64:

```
JSON Object -> JSON.stringify() -> Base64 Encode -> X-Payment Header
```

```typescript
// Simplified flow inside x402-fetch:
const paymentPayload = {
  x402Version: 1,
  scheme: "exact",
  network: "avalanche-fuji",
  payload: {
    signature: await walletClient.signTypedData(...),
    authorization: { from, to, value, validAfter, validBefore, nonce }
  }
};

const xPaymentHeader = btoa(JSON.stringify(paymentPayload));
// Result: "eyJ4NDAyVmVyc2lvbiI6MSwic2NoZW1lIjoiZXhhY3QiLCJuZXR3b3JrIjoiYXZhbGFuY2hlLWZ1amki..."
```

The `==` at the end is base64 padding (added when input length isn't divisible by 3).

---

### Step 4: EIP-3009 Signature (How USDC Transfers Work)

USDC supports **gasless transfers** via EIP-3009. The wallet signs a typed message:

```typescript
// EIP-712 typed data structure for USDC transferWithAuthorization
const typedData = {
  types: {
    TransferWithAuthorization: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" }
    ]
  },
  primaryType: "TransferWithAuthorization",
  domain: {
    name: "USDC",
    version: "2",
    chainId: 43113,  // Avalanche Fuji
    verifyingContract: "0x5425890298aed601595a70AB815c96711a31Bc65"
  },
  message: {
    from: "0xYourWallet",
    to: "0xMerchant",
    value: "10000",
    validAfter: "0",
    validBefore: "1732900000",
    nonce: "0x..."
  }
};
```

This signature authorizes USDC to be transferred **without the payer paying gas**. The facilitator executes the actual transfer on-chain.

---

## Complete Flow Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                         CLIENT (x402-fetch)                            │
├────────────────────────────────────────────────────────────────────────┤
│  1. GET /api/basic                                                     │
│     └─► No X-Payment header                                            │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      SERVER (x402-hono middleware)                     │
├────────────────────────────────────────────────────────────────────────┤
│  2. No payment? Return 402 with X-Payment-Required:                    │
│     Base64({ network, asset, maxAmountRequired, payTo, ... })          │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         CLIENT (x402-fetch)                            │
├────────────────────────────────────────────────────────────────────────┤
│  3. Decode X-Payment-Required header                                   │
│  4. Check: maxAmountRequired (10000) <= maxValue (1000000)? Yes        │
│  5. Build EIP-3009 authorization message                               │
│  6. walletClient.signTypedData() -> User signs in wallet               │
│  7. Create payment payload JSON                                        │
│  8. Base64 encode -> X-Payment header                                  │
│  9. Retry GET /api/basic with X-Payment header                         │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      SERVER (x402-hono middleware)                     │
├────────────────────────────────────────────────────────────────────────┤
│  10. Decode X-Payment header (Base64 -> JSON)                          │
│  11. Send to Facilitator for verification                              │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    FACILITATOR (Ultravioleta)                          │
├────────────────────────────────────────────────────────────────────────┤
│  12. Verify signature is valid                                         │
│  13. Check payer has sufficient USDC balance                           │
│  14. Execute transferWithAuthorization on USDC contract                │
│  15. Return success to server                                          │
└────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      SERVER -> CLIENT                                  │
├────────────────────────────────────────────────────────────────────────┤
│  16. Payment verified -> Return 200 with content                       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Summary Flow

```
Client                    Server                    Facilitator
  │                         │                           │
  │──── GET /api/basic ────►│                           │
  │                         │                           │
  │◄─── 402 + X-Payment ────│                           │
  │     Required header     │                           │
  │                         │                           │
  │ [Decode requirements]   │                           │
  │ [Sign EIP-3009 auth]    │                           │
  │                         │                           │
  │──── GET /api/basic ────►│                           │
  │     + X-Payment header  │                           │
  │                         │──── Verify payment ──────►│
  │                         │                           │
  │                         │◄─── Payment settled ──────│
  │                         │     (USDC transferred)    │
  │◄─── 200 + Content ──────│                           │
  │                         │                           │
```

---

## Key Takeaways

1. **USDC detection**: The `asset` field in `X-Payment-Required` specifies the token contract address
2. **Amount calculation**: `maxAmountRequired` is in USDC's smallest unit (6 decimals, so 10000 = $0.01)
3. **X-Payment encoding**: `JSON.stringify()` -> `base64` (that's where `==` padding comes from)
4. **Gasless transfers**: EIP-3009 signatures let the facilitator pay gas, not the user
5. **Facilitator role**: Verifies signatures and executes the actual on-chain USDC transfer
