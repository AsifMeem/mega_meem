"use client";

import { useState } from "react";

interface CoachInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function CoachInput({ onSend, disabled, placeholder }: CoachInputProps) {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage("");
    }
  };

  return (
    <div className="border-t border-chat-border bg-chat-bg/80 backdrop-blur-sm p-4">
      <div className="mx-auto max-w-3xl">
        <form onSubmit={handleSubmit} className="flex items-end gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={placeholder || "What's blocking you?"}
              disabled={disabled}
              className="w-full px-4 py-3 text-sm text-chat-text bg-chat-surface border border-chat-border rounded-xl placeholder:text-chat-muted/60 focus:outline-none focus:ring-2 focus:ring-chat-accent/20 focus:border-chat-accent/40 transition-colors"
            />
            {message.length > 0 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 font-[family-name:var(--font-jetbrains)] text-xs text-chat-muted">
                {message.length}
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={disabled || !message.trim()}
            className="p-3 text-chat-bg bg-chat-accent hover:bg-chat-accent-hover rounded-xl transition-colors disabled:bg-chat-surface disabled:text-chat-muted disabled:cursor-not-allowed"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
