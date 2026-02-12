"use client";

import { useState } from "react";
import { rateTrace } from "@/lib/api";

interface RatingProps {
  traceId: string;
  initialScore?: number | null;
  initialNote?: string | null;
}

export function Rating({ traceId, initialScore, initialNote }: RatingProps) {
  const [score, setScore] = useState<number | null>(initialScore ?? null);
  const [note, setNote] = useState(initialNote ?? "");
  const [showNote, setShowNote] = useState(!!initialNote);
  const [saving, setSaving] = useState(false);

  async function handleRate(value: number) {
    const prev = score;
    setScore(value);
    setSaving(true);
    try {
      await rateTrace(traceId, value, note || undefined);
    } catch {
      setScore(prev);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveNote() {
    if (score === null) return;
    setSaving(true);
    try {
      await rateTrace(traceId, score, note || undefined);
    } catch {
      // keep local state
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((v) => (
          <button
            key={v}
            onClick={() => handleRate(v)}
            disabled={saving}
            className={`w-6 h-6 rounded text-xs font-medium transition-colors ${
              score !== null && v <= score
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {score !== null && !showNote && (
        <button
          onClick={() => setShowNote(true)}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          + note
        </button>
      )}

      {showNote && (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note..."
            className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-0.5 text-xs text-gray-900 w-40 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          <button
            onClick={handleSaveNote}
            disabled={saving}
            className="text-xs text-blue-600 hover:text-blue-700 transition-colors"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}
