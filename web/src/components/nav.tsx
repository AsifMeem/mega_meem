"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";

export function Nav({
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
    `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
      active
        ? "text-blue-600 bg-blue-50"
        : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
    }`;

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto max-w-5xl px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Link
            href="/"
            className="text-sm font-semibold text-gray-900 tracking-tight mr-6"
          >
            Future Me
          </Link>

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
              <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-sm py-1 z-50">
                <Link
                  href="/eval/traces"
                  className={`block px-4 py-2 text-sm ${
                    isActive("/eval/traces") ? "text-blue-600 bg-blue-50" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                  onClick={() => setEvalOpen(false)}
                >
                  Traces
                </Link>
                <Link
                  href="/eval/analytics"
                  className={`block px-4 py-2 text-sm ${
                    isActive("/eval/analytics") ? "text-blue-600 bg-blue-50" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                  onClick={() => setEvalOpen(false)}
                >
                  Analytics
                </Link>
                <Link
                  href="/eval/compare"
                  className={`block px-4 py-2 text-sm ${
                    isActive("/eval/compare") ? "text-blue-600 bg-blue-50" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                  onClick={() => setEvalOpen(false)}
                >
                  Compare
                </Link>
                <Link
                  href="/eval/bench"
                  className={`block px-4 py-2 text-sm ${
                    isActive("/eval/bench") ? "text-blue-600 bg-blue-50" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                  onClick={() => setEvalOpen(false)}
                >
                  Bench
                </Link>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={onNewSession}
          className="px-3 py-1.5 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          New Session
        </button>
      </div>
    </nav>
  );
}
