"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useQueryClientInstance } from "@/components/Providers";
import { roomQueryKeys, predictionQueryKeys } from "@/hooks/useRoomQueries";
import { clearAuthTokens } from "@/lib/api-client";

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
  login: (address: string) => Promise<void>;
  logout: () => void;
  authToken: string | null;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Get queryClient instance for cache invalidation
  const queryClient = useQueryClientInstance();

  // Load stored auth token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("auth_token");
    const storedUser = localStorage.getItem("auth_user");

    if (storedToken && storedUser) {
      try {
        setAuthToken(storedToken);
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
      } catch (err) {
        console.error("Failed to load stored auth:", err);
        localStorage.removeItem("auth_token");
        localStorage.removeItem("auth_user");
      }
    }
  }, []);

  const login = useCallback(
    async (walletAddress: string) => {
      setIsLoading(true);
      setError(null);

      try {
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
        const newWalletAddress = data.user.wallet_address;
        const currentWalletAddress = user?.wallet_address;

        // If user wallet address changed, do complete cache clear
        if (currentWalletAddress && currentWalletAddress !== newWalletAddress) {
          console.log(`\n🔄 ACCOUNT SWITCH DETECTED:`);
          console.log(`   From: ${currentWalletAddress}`);
          console.log(`   To: ${newWalletAddress}`);
          console.log(`🗑️  Clearing ALL previous user data...`);

          // Nuclear option - clear entire cache
          queryClient.clear();
          console.log("✅ [1/2] React Query cache cleared");

          // Clear localStorage AND sessionStorage
          localStorage.clear();
          sessionStorage.clear();
          console.log("✅ [2/2] Storage cleared");
        } else if (!currentWalletAddress) {
          // First time login
          console.log(`\n🔐 FIRST LOGIN: ${newWalletAddress}`);
          console.log(`🗑️  Clearing any residual cache...`);
          queryClient.clear();
          console.log("✅ Cache cleared");
        }

        // Set new user
        console.log(`📝 Setting new user data...`);
        setUser(data.user);
        setAuthToken(data.access_token);
        setIsAuthenticated(true);

        // Store in localStorage
        console.log(`💾 Storing auth in localStorage...`);
        localStorage.setItem("auth_token", data.access_token);
        localStorage.setItem("auth_user", JSON.stringify(data.user));

        console.log(
          `✅✅✅ LOGIN COMPLETE: ${newWalletAddress} - Ready to fetch data ✅✅✅\n`
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Authentication failed";
        setError(errorMessage);
        console.error("Login error:", err);
        setUser(null);
        setAuthToken(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    },
    [user, queryClient]
  );

  const logout = useCallback(() => {
    const previousWallet = user?.wallet_address;
    console.log(`🚪 LOGOUT INITIATED for ${previousWallet}`);

    // 1. NUKE React Query cache entirely
    console.log("🗑️  [1/5] Nuking React Query cache completely...");
    try {
      queryClient.clear();
      console.log("✅ React Query cache cleared");
    } catch (e) {
      console.error("⚠️  Error clearing React Query cache:", e);
    }

    // 2. NUKE localStorage completely
    console.log("🗑️  [2/5] Clearing localStorage...");
    try {
      localStorage.clear();
      console.log("✅ localStorage cleared");
    } catch (e) {
      console.error("⚠️  Error clearing localStorage:", e);
    }

    // 3. NUKE sessionStorage
    console.log("🗑️  [3/5] Clearing sessionStorage...");
    try {
      sessionStorage.clear();
      console.log("✅ sessionStorage cleared");
    } catch (e) {
      console.error("⚠️  Error clearing sessionStorage:", e);
    }

    // 4. NUKE in-memory state
    console.log("🗑️  [4/5] Clearing in-memory auth state...");
    setUser(null);
    setAuthToken(null);
    setIsAuthenticated(false);
    setError(null);
    console.log("✅ In-memory state cleared");

    // 5. Explicit removal of known auth keys (belt and suspenders approach)
    console.log("🗑️  [5/5] Explicit removal of auth keys...");
    const authKeys = [
      "auth_token",
      "auth_user",
      "access_token",
      "user",
      "wallet",
      "connected_wallet",
    ];
    authKeys.forEach((key) => {
      try {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      } catch (e) {
        // Ignore errors
      }
    });
    console.log("✅ Auth keys explicitly removed");

    console.log(
      `✅✅✅ LOGOUT COMPLETE for ${previousWallet} - ALL CACHE NUKED ✅✅✅`
    );
  }, [user?.wallet_address, queryClient]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        logout,
        authToken,
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

/**
 * Hook for auto-authenticating when wallet connects
 * Call this in a component that has access to useAccount from wagmi
 */
export function useAutoAuth() {
  const { login, isAuthenticated } = useAuth();

  return async (address: string | undefined) => {
    if (address && !isAuthenticated) {
      try {
        await login(address);
        return true;
      } catch (error) {
        console.error("Auto-auth failed:", error);
        return false;
      }
    }
    return isAuthenticated;
  };
}
