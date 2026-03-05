"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export function ChatNav({
  onNewSession,
}: {
  onNewSession?: () => void;
}) {
  const pathname = usePathname();
  const [evalOpen, setEvalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setEvalOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isActive = (path: string) => pathname === path;
  const isEvalActive = pathname.startsWith("/eval");

  const linkClass = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      active
        ? "text-chat-accent bg-chat-surface"
        : "text-chat-muted hover:text-chat-text hover:bg-chat-surface"
    }`;

  return (
    <nav className="sticky top-0 z-50 border-b border-chat-border bg-chat-bg/80 backdrop-blur-sm">
      <div className="mx-auto max-w-5xl px-6">
        <div className="flex items-center justify-between h-16">
          <div className="flex flex-col justify-center">
            <Link href="/" className="text-lg font-bold text-chat-text tracking-tight">
              AI Life Coach
            </Link>
            <span className="text-xs text-chat-muted -mt-0.5">
              Neurochemistry-Based Performance Optimization
            </span>
          </div>

          {!DEMO_MODE && (
            <div className="flex items-center gap-1">
              <Link href="/" className={linkClass(isActive("/"))}>
                Chat
              </Link>

              <Link href="/history" className={linkClass(isActive("/history"))}>
                History
              </Link>

              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setEvalOpen(!evalOpen)}
                  className={`${linkClass(isEvalActive)} inline-flex items-center gap-1`}
                >
                  Eval
                  <svg
                    className={`w-3 h-3 transition-transform ${evalOpen ? "rotate-180" : ""}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {evalOpen && (
                  <div className="absolute top-full right-0 mt-1 w-40 bg-[#1e1e1e] border border-chat-border rounded-xl shadow-lg py-1 z-50">
                    {[
                      { href: "/eval/traces", label: "Traces" },
                      { href: "/eval/analytics", label: "Analytics" },
                      { href: "/eval/compare", label: "Compare" },
                      { href: "/eval/bench", label: "Bench" },
                    ].map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`block px-4 py-2 text-sm ${
                          isActive(item.href)
                            ? "text-chat-accent bg-chat-surface"
                            : "text-chat-muted hover:bg-chat-surface hover:text-chat-text"
                        }`}
                        onClick={() => setEvalOpen(false)}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={onNewSession}
                className="ml-3 px-3 py-1.5 rounded-lg text-sm font-medium text-chat-bg bg-chat-accent hover:bg-chat-accent-hover transition-colors"
              >
                New Session
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
