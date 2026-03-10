"use client";

import Markdown from "react-markdown";
import type { ScoringMetrics } from "@/lib/types";

interface CoachMessageProps {
  content: string;
  timestamp: string;
  scoring?: ScoringMetrics;
}

function frictionLabel(value: number): { text: string; color: string } {
  if (value >= 7) return { text: "High", color: "text-chat-danger" };
  if (value >= 4) return { text: "Medium", color: "text-amber-400" };
  return { text: "Low", color: "text-chat-accent" };
}

function yieldLabel(value: number): { text: string; color: string } {
  if (value >= 6) return { text: "High", color: "text-chat-accent" };
  if (value >= 4) return { text: "Medium", color: "text-amber-400" };
  return { text: "Low", color: "text-chat-danger" };
}

export function CoachMessage({ content, timestamp, scoring }: CoachMessageProps) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[85%] space-y-3">
        {/* Response card */}
        <div className="bg-chat-surface backdrop-blur-md border border-chat-border rounded-2xl px-5 py-4">
          <div className="text-sm leading-relaxed text-chat-text prose prose-invert prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0.5 prose-strong:text-chat-text prose-headings:text-chat-text prose-headings:text-sm prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1">
            <Markdown>{content}</Markdown>
          </div>
          <time className="font-[family-name:var(--font-jetbrains)] text-xs text-chat-muted mt-2 block">
            {new Date(timestamp).toLocaleTimeString()}
          </time>
        </div>

        {/* DOSE Effect card — Frame 02 style */}
        {scoring && (
          <div className="space-y-3">
            {/* Diagnostic */}
            <div>
              <p className="text-xs text-chat-muted uppercase tracking-wider mb-2">Diagnostic</p>
              <div className="bg-chat-accent/10 border border-chat-accent/20 rounded-2xl px-4 py-3">
                <p className="text-sm font-semibold text-chat-accent">
                  Friction level elevated
                </p>
                <p className="text-xs text-chat-muted mt-1">
                  Biology dictates that action precedes motivation, not the reverse.
                </p>
              </div>
            </div>

            {/* Error card */}
            <div className="bg-chat-danger-surface border border-chat-danger/20 rounded-2xl px-4 py-3 flex items-start gap-3">
              <div className="mt-0.5 w-5 h-5 rounded-full bg-chat-danger/20 flex items-center justify-center shrink-0">
                <span className="text-chat-danger text-xs font-bold">!</span>
              </div>
              <p className="text-sm text-chat-text/80">
                You are waiting for motivation to start. This is a cognitive error.
              </p>
            </div>

            {/* Protocol */}
            <div className="bg-chat-surface border border-chat-border rounded-2xl px-4 py-3">
              <p className="text-sm text-chat-text">
                <span className="font-semibold">Protocol Initiated:</span>{" "}
                The DOSE Effect (Micro-Win Generation)
              </p>
            </div>

            {/* Pending Maintenance — prescribed task */}
            <div>
              <p className="text-xs text-chat-muted uppercase tracking-wider mb-2">Pending Maintenance</p>
              <div className="border-l-2 border-chat-accent bg-chat-surface rounded-r-2xl px-4 py-3">
                <p className="text-sm text-chat-text leading-relaxed">
                  {scoring.prescribed_task} This is a low-cognitive, highly tactile task with a clear completion state.
                </p>
              </div>
            </div>

            {/* Mandatory Directive */}
            <div>
              <p className="text-xs text-chat-muted uppercase tracking-wider mb-2">Mandatory Directive</p>
              <div className="border-l-2 border-chat-accent bg-chat-surface rounded-r-2xl px-4 py-3 space-y-1">
                <p className="text-sm text-chat-text">
                  Step away from the IDE. Clean the machine. Pull a shot. Report back.
                </p>
                <p className="text-sm text-chat-danger">
                  Do not attempt high-leverage coding until neurochemistry is reset.
                </p>
              </div>
            </div>

            {/* Bottom metric pills */}
            <div className="grid grid-cols-3 gap-3 pt-1">
              <div className="bg-chat-surface border border-chat-border rounded-2xl px-3 py-3 text-center">
                <p className="text-[10px] text-chat-muted uppercase tracking-wider">Cognitive Load</p>
                <p className={`font-[family-name:var(--font-jetbrains)] text-lg font-bold mt-1 ${frictionLabel(scoring.task_resistance).color}`}>
                  {frictionLabel(scoring.task_resistance).text}
                </p>
                <div className="mt-1.5 h-0.5 w-8 mx-auto rounded-full bg-blue-500" />
              </div>
              <div className="bg-chat-surface border border-chat-border rounded-2xl px-3 py-3 text-center">
                <p className="text-[10px] text-chat-muted uppercase tracking-wider">Est. Time</p>
                <p className="font-[family-name:var(--font-jetbrains)] text-lg font-bold text-chat-text mt-1">
                  {scoring.tactile_yield + 2}m
                </p>
                <p className="text-[10px] text-chat-muted mt-0.5">Short duration</p>
              </div>
              <div className="bg-chat-surface border border-chat-border rounded-2xl px-3 py-3 text-center">
                <p className="text-[10px] text-chat-muted uppercase tracking-wider">State Delta</p>
                <p className={`font-[family-name:var(--font-jetbrains)] text-lg font-bold mt-1 ${yieldLabel(scoring.tactile_yield).color}`}>
                  +{scoring.bounty}
                </p>
                <div className="mt-1.5 h-0.5 w-8 mx-auto rounded-full bg-chat-accent" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
