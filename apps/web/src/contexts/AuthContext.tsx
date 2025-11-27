"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useAccount } from "wagmi";
import { useQueryClientInstance } from "@/components/Providers";
import { roomQueryKeys, predictionQueryKeys } from "@/hooks/useRoomQueries";

export interface User {
  id: string;
  wallet_address: string;
  username?: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  total_predictions: number;
  total_wins: number;
  total_losses: number;
  total_volume: number;
  win_rate: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClientInstance();

  // When wallet connects, check/create user in DB
  useEffect(() => {
    if (isConnected && address) {
      checkOrCreateUser(address);
    }
  }, [isConnected, address]);

  // When wallet disconnects, clear user data
  useEffect(() => {
    if (!isConnected) {
      setUser(null);
      setError(null);
      // Clear React Query cache
      queryClient.removeQueries({ queryKey: predictionQueryKeys.all });
      queryClient.removeQueries({ queryKey: roomQueryKeys.lists() });
      queryClient.clear();
      console.log(`✅ Wallet disconnected - auth cleared`);
    }
  }, [isConnected, queryClient]);

  const checkOrCreateUser = useCallback(
    async (walletAddress: string) => {
      if (!walletAddress) return;

      setIsLoading(true);
      setError(null);

      try {
        console.log(`\n🔐 [Auth] Checking/creating user for ${walletAddress}`);

        // Call backend to get/create user
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet_address: walletAddress.toLowerCase() }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Login failed");
        }

        const data = await response.json();
        console.log(
          `✅ [Auth] User found/created: ${data.user.wallet_address}`
        );

        // Store user in memory only (no tokens, no localStorage!)
        setUser(data.user);

        // Invalidate queries to fetch fresh data for this user
        queryClient.invalidateQueries({ queryKey: roomQueryKeys.lists() });
        queryClient.invalidateQueries({ queryKey: predictionQueryKeys.lists() });

        console.log(`✅ [Auth] Ready to fetch user data\n`);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Authentication failed";
        setError(errorMessage);
        console.error("[Auth] Error:", err);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    },
    [queryClient]
  );

  // isAuthenticated = wallet is connected AND user data is loaded
  const isAuthenticated = isConnected && !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
