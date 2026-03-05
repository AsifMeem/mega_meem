import type { ScoringMetrics } from "./types";

export function generateMockScoring(): ScoringMetrics {
  const current_friction = 8;
  const task_resistance = 7;
  const tactile_yield = 6;
  const bounty = current_friction * tactile_yield;

  return {
    task_resistance,
    current_friction,
    tactile_yield,
    bounty,
    prescribed_task:
      "Clean and backflush the espresso machine. Pull a shot when done.",
  };
}
