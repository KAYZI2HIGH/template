"use client";
import { Skeleton } from "@/components/ui/skeleton";

export function LoadingRoomCard() {
  return (
    <div className="bg-[#0F1729] border border-[#1E2943] rounded p-4 space-y-4">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4 bg-[#1E2943]" />
        <Skeleton className="h-3 w-1/2 bg-[#1E2943]" />
      </div>

      {/* Content skeleton */}
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <Skeleton className="h-3 w-full bg-[#1E2943]" />
          <Skeleton className="h-3 w-full bg-[#1E2943]" />
        </div>
        <Skeleton className="h-3 w-5/6 bg-[#1E2943]" />
      </div>

      {/* Button skeleton */}
      <Skeleton className="h-8 w-full bg-[#1E2943] rounded" />
    </div>
  );
}

export function LoadingRoomList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <LoadingRoomCard key={i} />
      ))}
    </div>
  );
}
