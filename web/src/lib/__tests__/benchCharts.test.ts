import { describe, expect, it } from "vitest";
import { buildAgeBreakdown, buildMetricSeries, buildTypeBreakdown } from "../benchCharts";
import type { BenchRun } from "../types";

const runs: BenchRun[] = [
  {
    id: "run-1",
    scenario_id: "life_coach_baseline",
    title: "Baseline",
    provider: "ollama",
    model: "llama",
    context_messages: 10,
    started_at: "2026-02-18T08:00:00.000Z",
    ended_at: "2026-02-18T08:10:00.000Z",
    notes: null,
    summary: {
      scores: {
        score_overall: 0.8,
        score_preference: 0.5,
        score_age_180d: 0.7,
      },
    },
  },
  {
    id: "run-2",
    scenario_id: "life_coach_baseline",
    title: "Baseline 2",
    provider: "ollama",
    model: "llama",
    context_messages: 10,
    started_at: "2026-02-19T08:00:00.000Z",
    ended_at: "2026-02-19T08:10:00.000Z",
    notes: null,
    summary: {
      scores: {
        score_overall: 0.9,
        score_preference: 0.6,
      },
    },
  },
];

describe("bench chart helpers", () => {
  it("buildMetricSeries returns ordered series", () => {
    const series = buildMetricSeries(runs, "score_overall");
    expect(series).toHaveLength(2);
    expect(series[0].score).toBe(0.8);
    expect(series[1].score).toBe(0.9);
  });

  it("buildTypeBreakdown returns latest run scores without overall/age", () => {
    const breakdown = buildTypeBreakdown(runs);
    expect(breakdown).toEqual([
      { metric: "preference", value: 0.6 },
    ]);
  });

  it("buildAgeBreakdown returns latest run age scores", () => {
    const breakdown = buildAgeBreakdown(runs);
    expect(breakdown).toEqual([
      { metric: "180d", value: 0.7 },
    ]);
  });
});
