import { Hono } from "hono";
import { handle } from "hono/vercel";
import { paymentMiddleware } from "x402-hono";
import type { Address } from "viem";

const merchantAddress = (process.env.MERCHANT_WALLET_ADDRESS || "0x1d5ab913fb1b76d7ed2c9a731f39be76cb0d34b1") as Address;

const app = new Hono();

// Payment middleware with EXPLICIT route pattern that matches the request path
app.use(
  "*",
  paymentMiddleware(
    merchantAddress,
    {
      // Use wildcard pattern to match ANY path
      "/*": {
        price: "$0.01",
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
    tier: "basic",
    data: "Welcome to Basic tier! You now have access to standard features.",
    timestamp: new Date().toISOString(),
  });
});

export const GET = handle(app);
