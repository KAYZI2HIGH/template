"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

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

  const login = useCallback(async (walletAddress: string) => {
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

      setUser(data.user);
      setAuthToken(data.access_token);
      setIsAuthenticated(true);

      // Store in localStorage
      localStorage.setItem("auth_token", data.access_token);
      localStorage.setItem("auth_user", JSON.stringify(data.user));

      console.log("✅ User logged in:", data.user.wallet_address);
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
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setAuthToken(null);
    setIsAuthenticated(false);
    setError(null);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    console.log("🚪 User logged out");
  }, []);

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
