"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useAccount } from "wagmi";
import { Check, Loader2 } from "lucide-react";

export function AuthStatusBar() {
  const { isLoading, isAuthenticated, user } = useAuth();
  const { isConnected } = useAccount();

  // Determine status message and icon
  let status = "";
  let icon = null;
  let bgColor = "";

  if (isLoading) {
    status = "Authenticating wallet...";
    icon = <Loader2 className="w-4 h-4 animate-spin" />;
    bgColor = "bg-blue-500/10 border-blue-500/30";
  } else if (isConnected && !isAuthenticated) {
    status = "Connecting...";
    icon = <Loader2 className="w-4 h-4 animate-spin" />;
    bgColor = "bg-yellow-500/10 border-yellow-500/30";
  } else if (isAuthenticated && user) {
    status = `Connected as ${user.username || "User"}`;
    icon = <Check className="w-4 h-4 text-green-400" />;
    bgColor = "bg-green-500/10 border-green-500/30";
  }

  if (!status) return null;

  return (
    <div
      className={`fixed top-4 right-4 px-4 py-2 rounded-lg border ${bgColor} flex items-center gap-2 text-sm text-white z-40 backdrop-blur-sm`}
    >
      {icon}
      <span>{status}</span>
    </div>
  );
}
