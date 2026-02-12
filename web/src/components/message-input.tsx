"use client";

import { useState } from "react";

interface MessageInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <input
        type="text"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Message Future Me..."
        disabled={disabled}
        className="flex-1 px-4 py-3 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-xl placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
      />
      <button
        type="submit"
        disabled={disabled || !message.trim()}
        className="p-3 text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </button>
    </form>
  );
}
