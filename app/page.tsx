"use client";

import { useState, useEffect } from "react";
import { useAccount, useConnect, useDisconnect, useWalletClient } from "wagmi";
import { wrapFetchWithPayment, Signer } from "x402-fetch";
import { PaymentCard } from "@/components/payment-card";
import { ContentDisplay } from "@/components/content-display";
import { TransactionLog, LogEntry } from "@/components/transaction-log";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ContentData {
  tier: string;
  data: string;
  features?: string[];
  timestamp: string;
}

function ConnectWallet() {
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { address, isConnected } = useAccount();
  const [open, setOpen] = useState(false);

  const handleConnect = (connector: (typeof connectors)[number]) => {
    connect({ connector });
    setOpen(false);
  };

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm font-mono bg-primary/10 text-primary px-3 py-1.5 rounded-md border border-primary/20 transition-all duration-300 hover:bg-primary/15">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
        <Button variant="outline" size="sm" onClick={() => disconnect()}>
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg" className="px-8">
          Connect Wallet
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect your wallet</DialogTitle>
          <DialogDescription>
            Choose a wallet to connect to this app
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-4">
          {connectors.map((connector) => (
            <Button
              key={connector.uid}
              variant="outline"
              className="w-full justify-start gap-3 h-14 text-base"
              onClick={() => handleConnect(connector)}
              disabled={isPending}
            >
              {connector.icon && (
                <img
                  src={connector.icon}
                  alt={connector.name}
                  className="w-6 h-6"
                />
              )}
              {isPending ? "Connecting..." : connector.name}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Home() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [content, setContent] = useState<ContentData | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [payingTier, setPayingTier] = useState<"basic" | "premium" | null>(null);
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by waiting for client mount
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setLogs([]);
    setContent(null);
  }, [address]);

  const addLog = (message: string, type: LogEntry["type"]) => {
    setLogs((prev) => [...prev, { message, type, timestamp: new Date() }]);
  };

  const updateLogStatus = (messagePattern: string, newType: LogEntry["type"]) => {
    setLogs((prev) =>
      prev.map((log) =>
        log.message.includes(messagePattern) ? { ...log, type: newType } : log
      )
    );
  };

  const handlePayment = async (tier: "basic" | "premium") => {
    if (!walletClient) return;

    setPayingTier(tier);
    setContent(null);
    setLogs([]);

    try {
      addLog(`Initiating ${tier} payment...`, "info");

      // Create x402 fetch wrapper with the wallet client
      // maxValue is set to $1.00 USDC (1000000 in 6 decimals) to allow premium payments
      const fetchWithPay = wrapFetchWithPayment(
        fetch,
        walletClient as unknown as Signer,
        BigInt(1_000_000) // $1.00 USDC max
      );

      addLog("Requesting payment authorization...", "info");
      const endpoint = tier === "basic" ? "/api/basic" : "/api/premium";

      const response = await fetchWithPay(endpoint);
      const responseData = await response.json();

      if (response.status === 200) {
        updateLogStatus("Initiating", "success");
        updateLogStatus("Requesting payment authorization", "success");
        addLog("Payment successful!", "success");
        addLog("Content received", "success");
        setContent(responseData);
      } else {
        updateLogStatus("Initiating", "error");
        updateLogStatus("Requesting payment authorization", "error");
        const errorMsg = responseData.error || responseData.errorMessage || "Unknown error";
        addLog(`Payment failed: ${errorMsg}`, "error");
      }
    } catch (error) {
      updateLogStatus("Initiating", "error");
      updateLogStatus("Requesting payment authorization", "error");
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      addLog(`Error: ${errorMsg}`, "error");
    } finally {
      setPayingTier(null);
    }
  };

  // Prevent hydration mismatch - render loading state until client is mounted
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-rose-50 to-pink-50">
        <div className="text-center space-y-8 p-8">
          <div className="space-y-3">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
              x402 Starter Kit
            </h1>
            <p className="text-lg text-muted-foreground">HTTP 402 Payment Protocol Demo</p>
            <p className="text-sm text-muted-foreground">Avalanche Fuji Testnet</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-rose-50 to-pink-50">
        <div className="text-center space-y-8 p-8">
          <div className="space-y-3">
            <h1 className="text-5xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
              x402 Starter Kit
            </h1>
            <p className="text-lg text-muted-foreground">HTTP 402 Payment Protocol Demo</p>
            <p className="text-sm text-muted-foreground">Avalanche Fuji Testnet</p>
          </div>
          <ConnectWallet />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
            x402 Payment Demo
          </h1>
          <p className="text-muted-foreground">Choose a payment tier to unlock content</p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <ConnectWallet />
          </div>
        </div>

        <Separator />

        <div className="flex flex-wrap justify-between gap-6 max-w-4xl mx-auto">
          <PaymentCard
            tier="Basic"
            price="$0.01"
            description="Perfect for trying out the payment system"
            onPayClick={() => handlePayment("basic")}
            isPaying={payingTier === "basic"}
            isDisabled={payingTier !== null}
          />
          <PaymentCard
            tier="Premium"
            price="$0.15"
            description="Full access to all advanced features"
            onPayClick={() => handlePayment("premium")}
            isPaying={payingTier === "premium"}
            isDisabled={payingTier !== null}
          />
        </div>

        {content && (
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <ContentDisplay
              tier={content.tier}
              data={content.data}
              features={content.features}
              timestamp={content.timestamp}
            />
          </div>
        )}

        {logs.length > 0 && (
          <div className="max-w-4xl mx-auto animate-in fade-in-from-bottom-4 duration-700">
            <TransactionLog logs={logs} />
          </div>
        )}
      </div>
    </div>
  );
}
