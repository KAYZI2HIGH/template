"use client";
import Logo from "@/components/Logo";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth, useAutoAuth } from "@/contexts/AuthContext";
import { useAccount } from "wagmi";
import { useEffect } from "react";
import { Suspense } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useDisconnect } from "wagmi";

function WalletSection() {
  const { logout, isAuthenticated, user, isLoading } = useAuth();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const autoAuth = useAutoAuth();

  // Auto-authenticate when wallet connects
  useEffect(() => {
    if (isConnected && address && !isAuthenticated && !isLoading) {
      autoAuth(address);
    }
  }, [isConnected, address, isAuthenticated, isLoading, autoAuth]);

  const handleDisconnect = () => {
    logout(); // Clear app auth state
    disconnect(); // Disconnect wallet from RainbowKit
  };

  return (
    <section className="p-4 border-[#1E2943] border-b">
      <h2 className="font-semibold mb-3 text-sm">Wallet</h2>
      <div className="bg-[#0F1729] rounded p-3 border border-[#1E2943]">
        {isLoading && (
          <p className="text-xs text-muted-foreground mb-2">
            Authenticating...
          </p>
        )}

        {!isConnected ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground mb-2">
              Click to connect wallet
            </p>
            <ConnectButton />
          </div>
        ) : !isAuthenticated ? (
          <p className="text-xs text-muted-foreground mb-2">
            Auto-authenticating wallet...
          </p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground mb-2">✅ Connected</p>
            <p className="text-xs font-mono text-green-300 max-w-[180px] truncate">
              {user?.wallet_address}
            </p>
            <p className="text-xs text-muted-foreground mt-2 mb-3">
              User:{" "}
              <span className="text-green-300">{user?.username || "Anon"}</span>
            </p>
            <button
              onClick={handleDisconnect}
              className="w-full bg-red-500 hover:bg-red-600 transition-all duration-300 text-white py-2 px-3 rounded text-sm font-medium"
            >
              Disconnect
            </button>
          </>
        )}
      </div>
    </section>
  );
}

export function LeftSidebar() {
  return (
    <aside className="w-64 border-r border-[#1E2943] py-6">
      <div className="mb-2">
        <Logo />
        <p className="text-green-300 w-fit mx-auto text-sm">
          Nigerian Stock Predictions
        </p>
      </div>

      <ScrollArea className="h-[calc(100vh-118px)]">
        {/* Wallet Section */}
        <Suspense
          fallback={
            <div className="p-4 text-xs text-muted-foreground">
              Loading wallet...
            </div>
          }
        >
          <WalletSection />
        </Suspense>

        {/* How to Play Section */}
        <section className="p-4 border-[#1E2943] border-b">
          <h2 className="text-sm font-semibold mb-2">How to Play</h2>
          <ol className="text-xs text-muted-foreground space-y-2">
            <li className="flex gap-2">
              <span className="font-bold text-green-300 flex-shrink-0">1.</span>
              <span>Browse active rooms or create a new one</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-green-300 flex-shrink-0">2.</span>
              <span>Predict UP or DOWN for Nigerian stocks</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-green-300 flex-shrink-0">3.</span>
              <span>Wait for resolution via Chainlink oracle</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-green-300 flex-shrink-0">4.</span>
              <span>Claim payouts automatically</span>
            </li>
          </ol>
        </section>

        {/* Info Section */}
        <section className="p-4 border-b border-[#1E2943]">
          <h3 className="font-semibold mb-2 text-sm">Info</h3>
          <p className="text-xs text-muted-foreground mb-3">
            Predict Nigerian stock prices using real-time data. Built on Celo
            Alfajores with Chainlink oracle automation.
          </p>
          <div className="space-y-1 text-xs text-muted-foreground">
            <p>
              <span className="text-green-300">Network:</span> Celo Alfajores
            </p>
            <p>
              <span className="text-green-300">Oracle:</span> Chainlink
              Functions
            </p>
            <p>
              <span className="text-green-300">Data:</span> Financial Modeling
              Prep
            </p>
          </div>
        </section>
        <div className="space-y-2 p-4 border-b border-[#1E2943]">
          <button className="w-full bg-green-500 hover:bg-green-600 transition-all duration-300 text-white py-2 px-3 rounded text-sm font-medium">
            Get testnet cUSD 💰
          </button>
          <button className="w-full bg-gray-500 hover:bg-gray-600 transition-all duration-300 text-white py-2 px-3 rounded text-sm font-medium">
            Go To Repository 📁
          </button>
        </div>

        {/* Demo Powered By */}
        <section className="p-4 pb-0">
          <p className="text-sm mb-2">Demo Powered By:</p>
          <div className="flex flex-wrap gap-2 text-black">
            <span className="bg-gray-200 px-2 py-1 rounded text-xs">Celo</span>
            <span className="bg-gray-200 px-2 py-1 rounded text-xs">
              Chainlink
            </span>
            <span className="bg-gray-200 px-2 py-1 rounded text-xs">
              MiniPay
            </span>
          </div>
        </section>
      </ScrollArea>
    </aside>
  );
}
