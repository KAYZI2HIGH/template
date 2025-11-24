"use client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Room } from "@/lib/types";

interface PendingPrediction {
  roomIdx: number;
  prediction: "UP" | "DOWN";
  stake: string;
}

interface PredictionConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pendingPrediction: PendingPrediction | null;
  rooms: Room[];
  onConfirm: () => void;
}

export function PredictionConfirmDialog({
  open,
  onOpenChange,
  pendingPrediction,
  rooms,
  onConfirm,
}: PredictionConfirmDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <AlertDialogContent className="border-[#1E2943] bg-[#0F1729]">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">
            Confirm Prediction
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-400">
            {pendingPrediction ? (
              <div className="space-y-2 mt-2">
                <p>
                  <strong className="text-white">Room:</strong>{" "}
                  {rooms[pendingPrediction.roomIdx].name}
                </p>
                <p>
                  <strong className="text-white">Prediction:</strong>{" "}
                  <span
                    className={
                      pendingPrediction.prediction === "UP"
                        ? "text-green-300"
                        : "text-red-300"
                    }
                  >
                    {pendingPrediction.prediction}
                  </span>
                </p>
                <p>
                  <strong className="text-white">Stake:</strong>{" "}
                  <span className="text-green-300">
                    {pendingPrediction.stake} cUSD
                  </span>
                </p>
              </div>
            ) : null}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-[#1E2943] text-gray-400 hover:text-white">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-green-500 hover:bg-green-600 text-white"
          >
            Confirm & Place Prediction
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
