"use client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronRight, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserPrediction } from "@/lib/types";

interface PredictionsListProps {
  predictions: UserPrediction[];
  onViewDetails: (predictionId: number) => void;
}

export function PredictionsList({
  predictions,
  onViewDetails,
}: PredictionsListProps) {
  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-3 pr-4">
        {predictions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 py-8">
            <Zap
              size={48}
              className="text-green-300/60"
            />
            <div className="text-center">
              <h3 className="text-sm font-semibold text-white mb-2">
                No Predictions Yet
              </h3>
              <p className="text-xs text-gray-400">
                Start by placing a bet in the Prediction Slip tab
              </p>
            </div>
          </div>
        ) : (
          predictions.map((pred) => (
            <div
              key={pred.id}
              className="bg-[#0F1729] border border-[#1E2943] rounded p-3 pl-5 hover:border-green-300/50 transition-colors cursor-pointer relative"
            >
              <div
                className={cn(
                  "w-2 h-full absolute left-0 top-0 rounded-l",
                  pred.status === "active"
                    ? "bg-blue-500"
                    : pred.status === "completed"
                    ? "bg-green-500"
                    : "bg-yellow-500"
                )}
              />
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h4 className="text-xs font-semibold text-white">
                    {pred.name}
                  </h4>
                  <p className="text-xs text-gray-400 mt-1">
                    Prediction:{" "}
                    <span className="text-green-300">{pred.prediction}</span>
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded whitespace-nowrap ml-2 font-medium ${
                    pred.status === "active"
                      ? "bg-blue-500/20 text-blue-300"
                      : pred.status === "completed"
                      ? "bg-green-500/20 text-green-300"
                      : "bg-yellow-500/20 text-yellow-300"
                  }`}
                >
                  {pred.status.toUpperCase()}
                </span>
              </div>

              <div className="space-y-1 text-xs text-gray-400">
                <p>
                  Stake: <span className="text-white">{pred.stake}</span>
                </p>
                {"outcome" in pred && (
                  <>
                    <p>
                      Outcome:{" "}
                      <span
                        className={
                          pred.outcome === "WIN"
                            ? "text-green-300"
                            : "text-red-300"
                        }
                      >
                        {pred.outcome}
                      </span>
                    </p>
                    <p>
                      Payout:{" "}
                      <span className="text-green-300">{pred.payout}</span>
                    </p>
                  </>
                )}
                {"timeRemaining" in pred && (
                  <p>
                    Time:{" "}
                    <span className="text-white">{pred.timeRemaining}</span>
                  </p>
                )}
                {"playersJoined" in pred && (
                  <p>
                    Players:{" "}
                    <span className="text-white">{pred.playersJoined}</span>
                  </p>
                )}
              </div>

              <button
                onClick={() => onViewDetails(pred.id)}
                className="w-full mt-2 text-xs text-green-300 hover:text-green-200 font-medium transition-colors flex items-center justify-center gap-1"
              >
                View Details <ChevronRight size={12} />
              </button>
            </div>
          ))
        )}
      </div>
    </ScrollArea>
  );
}
