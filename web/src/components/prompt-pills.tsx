"use client";

interface PromptPillsProps {
  pills: string[];
  onSelect: (pill: string) => void;
}

export function PromptPills({ pills, onSelect }: PromptPillsProps) {
  if (pills.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 px-1 scrollbar-none">
      {pills.map((pill) => (
        <button
          key={pill}
          onClick={() => onSelect(pill)}
          className="shrink-0 px-3 py-1.5 text-xs text-chat-muted bg-chat-surface border border-chat-border rounded-full hover:bg-chat-surface-hover hover:text-chat-text transition-all duration-200"
        >
          {pill}
        </button>
      ))}
    </div>
  );
}
