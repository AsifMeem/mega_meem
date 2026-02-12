"use client";

import { useState } from "react";
import { createSession } from "@/lib/api";
import type { SessionResponse } from "@/lib/types";

interface NewSessionDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (response: SessionResponse) => void;
}

export function NewSessionDialog({ open, onClose, onCreated }: NewSessionDialogProps) {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      const response = await createSession(note || undefined);
      setNote("");
      onCreated(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create session");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white border border-gray-200 rounded-lg p-6 w-full max-w-md shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Start New Session?</h2>
        <p className="text-sm text-gray-600 mb-4">
          This will save your current conversation to history and start fresh.
          The LLM context will be reset.
        </p>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note (e.g., 'Testing Gemini with shorter context')"
          rows={2}
          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
        />

        {error && (
          <p className="text-sm text-red-600 mb-3">{error}</p>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
          >
            {loading ? "Creating..." : "Start New Session"}
          </button>
        </div>
      </div>
    </div>
  );
}
