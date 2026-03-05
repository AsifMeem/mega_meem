"use client";

import { useEffect, useState } from "react";
import type { DoseLevels, TodoItem } from "@/lib/types";

interface DoseBarProps {
  label: string;
  shortLabel: string;
  value: number;
  color: string;
  glowColor: string;
}

function DoseBar({ label, shortLabel, value, color, glowColor }: DoseBarProps) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const [glowing, setGlowing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValue(value);
      if (value > 0) {
        setGlowing(true);
        setTimeout(() => setGlowing(false), 1200);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-semibold w-18 text-right truncate" style={{ color }}>
        {label}
      </span>
      <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden relative">
        <div
          className="h-full rounded-full transition-all duration-[800ms] ease-out"
          style={{
            width: `${animatedValue}%`,
            backgroundColor: color,
            boxShadow: glowing ? `0 0 12px ${glowColor}, 0 0 24px ${glowColor}` : "none",
          }}
        />
      </div>
      <span
        className="font-[family-name:var(--font-jetbrains)] text-xs w-8 text-right"
        style={{ color }}
      >
        {Math.round(animatedValue)}%
      </span>
    </div>
  );
}

interface DoseDashboardProps {
  levels: DoseLevels;
  todos: TodoItem[];
}

export function DoseDashboard({ levels, todos }: DoseDashboardProps) {
  const bars: DoseBarProps[] = [
    {
      label: "Dopamine",
      shortLabel: "D",
      value: levels.dopamine,
      color: "var(--color-dose-dopamine)",
      glowColor: "rgba(0, 212, 255, 0.4)",
    },
    {
      label: "Oxytocin",
      shortLabel: "O",
      value: levels.oxytocin,
      color: "var(--color-dose-oxytocin)",
      glowColor: "rgba(255, 45, 120, 0.4)",
    },
    {
      label: "Serotonin",
      shortLabel: "S",
      value: levels.serotonin,
      color: "var(--color-dose-serotonin)",
      glowColor: "rgba(57, 255, 20, 0.4)",
    },
    {
      label: "Endorphin",
      shortLabel: "E",
      value: levels.endorphin,
      color: "var(--color-dose-endorphin)",
      glowColor: "rgba(255, 184, 0, 0.4)",
    },
  ];

  return (
    <div className="bg-chat-surface backdrop-blur-md border border-chat-border rounded-2xl p-4 space-y-4">
      {/* DOSE header */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-chat-muted uppercase tracking-wider">DOSE Levels</span>
        <div className="flex-1 h-px bg-chat-border" />
      </div>

      {/* Bars */}
      <div className="space-y-2.5">
        {bars.map((bar) => (
          <DoseBar key={bar.shortLabel} {...bar} />
        ))}
      </div>

      {/* Integrated todo list */}
      {todos.length > 0 && (
        <>
          <div className="h-px bg-chat-border" />
          <div className="space-y-2">
            {todos.map((todo) => (
              <div key={todo.id} className="flex items-center gap-2.5">
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-500 ${
                    todo.done
                      ? "border-chat-accent bg-chat-accent/20"
                      : "border-chat-border bg-transparent"
                  }`}
                >
                  {todo.done && (
                    <svg className="w-2.5 h-2.5 text-chat-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span
                  className={`text-sm transition-all duration-500 ${
                    todo.done ? "text-chat-muted line-through" : "text-chat-text"
                  }`}
                >
                  {todo.label}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
