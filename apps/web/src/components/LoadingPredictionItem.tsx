"use client";
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingPredictionItem() {
  return (
    <div className="bg-[#0F1729] border border-[#1E2943] rounded p-3 space-y-3">
      {/* Status bar skeleton */}
      <div className="w-2 h-12 absolute left-0 top-3 rounded-l bg-[#1E2943]" />

      {/* Header skeleton */}
      <div className="space-y-2 pl-3">
        <Skeleton className="h-4 w-2/3 bg-[#1E2943]" />
        <Skeleton className="h-3 w-1/2 bg-[#1E2943]" />
      </div>

      {/* Content skeleton */}
      <div className="space-y-2 pl-3">
        <Skeleton className="h-3 w-3/4 bg-[#1E2943]" />
        <Skeleton className="h-3 w-2/3 bg-[#1E2943]" />
      </div>

      {/* Button skeleton */}
      <Skeleton className="h-8 w-full bg-[#1E2943] rounded mt-2" />
    </div>
  );
}

export function LoadingPredictionList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <LoadingPredictionItem key={i} />
      ))}
    </div>
  );
}
