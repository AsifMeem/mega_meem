"use client";

import type { ActionPillOption } from "@/lib/types";

interface ActionPillsProps {
  options: ActionPillOption[];
  onSelect: (value: string) => void;
  disabled?: boolean;
}

export function ActionPills({ options, onSelect, disabled }: ActionPillsProps) {
  return (
    <div className="flex gap-2 mt-3">
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onSelect(option.value)}
          disabled={disabled}
          className={`px-4 py-2 text-sm rounded-full border transition-all duration-200 ${
            option.value === "done"
              ? "border-chat-accent/40 bg-chat-accent/10 text-chat-accent hover:bg-chat-accent/20"
              : "border-chat-border bg-chat-surface text-chat-muted hover:bg-chat-surface-hover hover:text-chat-text"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
