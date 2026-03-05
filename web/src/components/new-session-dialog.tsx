"use client";

import { useState } from "react";
import { createSession } from "@/lib/api";
import type { SessionResponse } from "@/lib/types";

interface NewSessionDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (response: SessionResponse) => void;
  dark?: boolean;
}

export function NewSessionDialog({ open, onClose, onCreated, dark }: NewSessionDialogProps) {
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
      <div className={`relative border rounded-2xl p-6 w-full max-w-md shadow-lg ${
        dark
          ? "bg-[#1e1e1e] border-white/10 text-white"
          : "bg-white border-gray-200 text-gray-900"
      }`}>
        <h2 className={`text-lg font-semibold mb-2 ${dark ? "text-white" : "text-gray-900"}`}>
          Start New Session?
        </h2>
        <p className={`text-sm mb-4 ${dark ? "text-gray-400" : "text-gray-600"}`}>
          This will save your current conversation to history and start fresh.
          The LLM context will be reset.
        </p>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional note (e.g., 'Testing Gemini with shorter context')"
          rows={2}
          className={`w-full rounded-xl px-3 py-2 text-sm mb-4 resize-none focus:outline-none focus:ring-2 transition-colors ${
            dark
              ? "bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:ring-teal-400/20 focus:border-teal-400/40"
              : "bg-gray-50 border border-gray-200 text-gray-900 placeholder:text-gray-400 focus:ring-blue-500/20 focus:border-blue-500"
          }`}
        />

        {error && (
          <p className="text-sm text-red-500 mb-3">{error}</p>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              dark
                ? "text-gray-300 bg-white/5 border border-white/10 hover:bg-white/10"
                : "text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300"
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              dark
                ? "text-chat-bg bg-teal-400 hover:bg-teal-500"
                : "text-white bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading ? "Creating..." : "Start New Session"}
          </button>
        </div>
      </div>
    </div>
  );
}
