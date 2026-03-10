import type { BenchRun } from "./types";

type ScoreMap = Record<string, number>;

function getScores(run: BenchRun | undefined): ScoreMap {
  const summary = run?.summary as { scores?: ScoreMap } | null | undefined;
  return summary?.scores ?? {};
}

export function buildMetricSeries(runs: BenchRun[], metric: string) {
  const sorted = [...runs].sort(
    (a, b) => new Date(a.started_at ?? 0).getTime() - new Date(b.started_at ?? 0).getTime()
  );
  return sorted
    .map((run) => {
      const scores = getScores(run);
      const value = scores[metric];
      if (value === undefined) return null;
      return {
        time: run.started_at ? new Date(run.started_at).toLocaleString() : "-",
        score: value,
      };
    })
    .filter(Boolean) as { time: string; score: number }[];
}

export function buildTypeBreakdown(runs: BenchRun[]) {
  const latest = [...runs].sort(
    (a, b) => new Date(b.started_at ?? 0).getTime() - new Date(a.started_at ?? 0).getTime()
  )[0];
  const scores = getScores(latest);
  return Object.entries(scores)
    .filter(([metric]) => metric.startsWith("score_") && metric !== "score_overall")
    .filter(([metric]) => !metric.startsWith("score_age_"))
    .map(([metric, value]) => ({
      metric: metric.replace("score_", ""),
      value,
    }));
}

export function buildAgeBreakdown(runs: BenchRun[]) {
  const sorted = [...runs].sort(
    (a, b) => new Date(b.started_at ?? 0).getTime() - new Date(a.started_at ?? 0).getTime()
  );
  const latestWithAges = sorted.find((run) =>
    Object.keys(getScores(run)).some((metric) => metric.startsWith("score_age_"))
  );
  const scores = getScores(latestWithAges);
  return Object.entries(scores)
    .filter(([metric]) => metric.startsWith("score_age_"))
    .map(([metric, value]) => ({
      metric: metric.replace("score_age_", ""),
      value,
    }));
}
