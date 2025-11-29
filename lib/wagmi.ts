import { http, createConfig } from "wagmi";
import { avalancheFuji } from "wagmi/chains";
import { injected, walletConnect } from "wagmi/connectors";

// WalletConnect project ID - you can get one at https://cloud.walletconnect.com
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo";

export const config = createConfig({
  chains: [avalancheFuji],
  connectors: [
    injected(),
    walletConnect({ projectId }),
  ],
  transports: {
    [avalancheFuji.id]: http(),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}
