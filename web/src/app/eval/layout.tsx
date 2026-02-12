"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/eval/traces", label: "Traces" },
  { href: "/eval/analytics", label: "Analytics" },
  { href: "/eval/compare", label: "Compare" },
];

export default function EvalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-gray-200 px-6">
        <div className="max-w-5xl mx-auto flex gap-6">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                pathname === tab.href
                  ? "border-blue-600 text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
