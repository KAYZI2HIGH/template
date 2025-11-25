"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, createContext, useContext } from "react";

// Create queryClient instance
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
      retry: 1,
    },
  },
});

// Create context to provide queryClient to child components
const QueryClientContext = createContext<QueryClient | undefined>(undefined);

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <QueryClientContext.Provider value={queryClient}>
        {children}
      </QueryClientContext.Provider>
    </QueryClientProvider>
  );
}

/**
 * Hook to access queryClient from components
 */
export function useQueryClientInstance() {
  const context = useContext(QueryClientContext);
  if (!context) {
    throw new Error("useQueryClientInstance must be used within Providers");
  }
  return context;
}
