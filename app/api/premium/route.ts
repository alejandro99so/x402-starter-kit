import { Hono } from "hono";
import { handle } from "hono/vercel";
import { paymentMiddleware } from "x402-hono";
import type { Address } from "viem";

const merchantAddress = (process.env.MERCHANT_WALLET_ADDRESS || "0x1d5ab913fb1b76d7ed2c9a731f39be76cb0d34b1") as Address;

const app = new Hono();

// Payment middleware with wildcard route pattern
app.use(
  "*",
  paymentMiddleware(
    merchantAddress,
    {
      "/*": {
        price: "$0.15",
        network: "avalanche-fuji",
      },
    },
    {
      url: "https://facilitator.ultravioletadao.xyz",
    }
  )
);

app.get("*", (c) => {
  return c.json({
    tier: "premium",
    data: "Welcome to Premium tier! You have access to all advanced features.",
    features: [
      "Advanced Analytics",
      "Priority Support",
      "Custom Integrations",
      "Unlimited API Calls",
    ],
    timestamp: new Date().toISOString(),
  });
});

export const GET = handle(app);
