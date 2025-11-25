/**
 * Settlement utility functions
 * Used by settlement endpoint and future Chainlink automation
 */

export interface Settlement {
  roomId: string;
  startingPrice: number;
  endingPrice: number;
  priceWentUp: boolean;
  totalPredictions: number;
  winners: number;
  losers: number;
  totalPool: number;
  totalPayedOut: number;
}

export interface PredictionOutcome {
  id: string;
  outcome: "WIN" | "LOSS";
  payoutAmount: number;
  direction: "up" | "down";
  stakeAmount: number;
}

/**
 * Determine winning direction based on price change
 */
export function getWinningDirection(
  startingPrice: number,
  endingPrice: number
): "up" | "down" {
  return endingPrice > startingPrice ? "up" : "down";
}

/**
 * Calculate outcomes for all predictions in a room
 * Returns array of prediction outcomes with payout amounts
 */
export function calculatePayouts(
  predictions: Array<{
    id: string;
    direction: "up" | "down";
    stake_amount: number | string;
  }>,
  winningDirection: "up" | "down"
): PredictionOutcome[] {
  // Calculate totals
  let totalPool = 0;
  let totalWinnerStake = 0;
  const isWinnerMap = new Map<string, boolean>();

  for (const prediction of predictions) {
    const stakeAmount = parseFloat(String(prediction.stake_amount));
    totalPool += stakeAmount;

    const isWinner = prediction.direction === winningDirection;
    isWinnerMap.set(prediction.id, isWinner);

    if (isWinner) {
      totalWinnerStake += stakeAmount;
    }
  }

  // Calculate payouts
  return predictions.map((prediction) => {
    const isWinner = isWinnerMap.get(prediction.id)!;
    const stakeAmount = parseFloat(String(prediction.stake_amount));
    let payoutAmount = 0;

    if (isWinner && totalWinnerStake > 0) {
      // Proportional payout: (their stake / total winner stake) * total pool
      payoutAmount = (stakeAmount / totalWinnerStake) * totalPool;
    }

    return {
      id: prediction.id,
      outcome: isWinner ? "WIN" : "LOSS",
      payoutAmount: Math.round(payoutAmount * 100) / 100, // Round to 2 decimals
      direction: prediction.direction,
      stakeAmount,
    };
  });
}

/**
 * Calculate settlement statistics
 */
export function calculateSettlementStats(
  outcomes: PredictionOutcome[],
  startingPrice: number,
  endingPrice: number
): Settlement {
  const totalPredictions = outcomes.length;
  const winners = outcomes.filter((o) => o.outcome === "WIN").length;
  const losers = outcomes.filter((o) => o.outcome === "LOSS").length;
  const totalPool = outcomes.reduce((sum, o) => sum + o.stakeAmount, 0);
  const totalPayedOut = outcomes.reduce((sum, o) => sum + o.payoutAmount, 0);
  const priceWentUp = endingPrice > startingPrice;

  return {
    roomId: "",
    startingPrice,
    endingPrice,
    priceWentUp,
    totalPredictions,
    winners,
    losers,
    totalPool: Math.round(totalPool * 100) / 100,
    totalPayedOut: Math.round(totalPayedOut * 100) / 100,
  };
}

/**
 * Validate settlement inputs
 */
export function validateSettlement(
  predictions: unknown,
  startingPrice: unknown,
  endingPrice: unknown
): { valid: boolean; error?: string } {
  if (!Array.isArray(predictions) || predictions.length === 0) {
    return { valid: false, error: "No predictions found" };
  }

  if (typeof startingPrice !== "number" || startingPrice <= 0) {
    return { valid: false, error: "Invalid starting price" };
  }

  if (typeof endingPrice !== "number" || endingPrice <= 0) {
    return { valid: false, error: "Invalid ending price" };
  }

  for (const prediction of predictions) {
    if (
      !prediction.id ||
      !["up", "down"].includes(prediction.direction) ||
      !prediction.stake_amount ||
      parseFloat(String(prediction.stake_amount)) <= 0
    ) {
      return { valid: false, error: "Invalid prediction data" };
    }
  }

  return { valid: true };
}

/**
 * Format settlement summary for logging/response
 */
export function formatSettlementSummary(settlement: Settlement): string {
  return `
Settlement Summary:
- Starting Price: $${settlement.startingPrice}
- Ending Price: $${settlement.endingPrice}
- Direction: ${settlement.priceWentUp ? "UP" : "DOWN"}
- Total Predictions: ${settlement.totalPredictions}
- Winners: ${settlement.winners} | Losers: ${settlement.losers}
- Total Pool: $${settlement.totalPool}
- Total Payed Out: $${settlement.totalPayedOut}
  `;
}
