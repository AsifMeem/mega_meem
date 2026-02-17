"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getBenchRun } from "@/lib/api";
import type { BenchRunDetail } from "@/lib/types";

export default function BenchRunPage() {
  const params = useParams<{ id: string }>();
  const runId = params?.id;
  const [run, setRun] = useState<BenchRunDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!runId) return;
    getBenchRun(runId)
      .then(setRun)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load run");
      })
      .finally(() => setLoading(false));
  }, [runId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="h-6 w-6 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
        <p className="mt-3 text-sm text-gray-400">Loading run...</p>
      </div>
    );
  }

  if (error || !run) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-sm font-medium text-gray-900">Failed to load run</p>
        <p className="mt-1 text-sm text-gray-400">{error ?? "Run not found"}</p>
      </div>
    );
  }

  const summaryScores = run.summary && typeof run.summary === "object"
    ? (run.summary as { scores?: Record<string, number> }).scores
    : undefined;

  return (
    <div className="px-6 py-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-400">Benchmark Run</div>
            <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">{run.title}</h1>
            <div className="text-xs text-gray-500 mt-1">
              {run.provider} · {run.model} · {run.scenario_id}
            </div>
          </div>
          <Link href="/eval/bench" className="text-sm text-blue-600 hover:underline">
            Back to Bench
          </Link>
        </div>

        {summaryScores && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(summaryScores).map(([k, v]) => (
              <SummaryCard key={k} label={k.replace("score_", "")} value={v.toFixed(2)} />
            ))}
          </div>
        )}

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Probes</h3>
          <div className="space-y-4">
            {run.probes.map((p) => (
              <div key={`${p.probe_id}-${p.idx}`} className="border-b border-gray-100 pb-4 last:border-b-0">
                <div className="text-xs text-gray-400">{p.probe_type} · score {p.score.toFixed(2)}</div>
                <div className="text-sm font-medium text-gray-900 mt-1">{p.question}</div>
                <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{p.response}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Conversation Turns</h3>
          <div className="space-y-3">
            {run.turns.map((t) => (
              <div key={`${t.idx}-${t.role}`} className="border-b border-gray-100 pb-3 last:border-b-0">
                <div className="text-xs text-gray-400">Turn {t.idx}</div>
                <div className="text-sm text-gray-900 whitespace-pre-wrap">{t.content}</div>
                {t.response && (
                  <div className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{t.response}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="text-lg font-semibold font-mono text-gray-900">{value}</div>
    </div>
  );
}
