"use client";

import type { Message } from "@/lib/types";
import { Rating } from "./rating";

interface MessageProps {
  message: Message;
  traceId?: string;
}

export function MessageBubble({ message, traceId }: MessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[75%]">
        <div
          className={`rounded-2xl px-4 py-3 text-sm ${
            isUser
              ? "bg-blue-600 text-white rounded-br-md"
              : "bg-gray-50 border border-gray-200 text-gray-800 rounded-bl-md"
          }`}
        >
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
          <time className={`text-xs mt-1 block ${isUser ? "text-blue-200" : "text-gray-400"}`}>
            {new Date(message.timestamp).toLocaleTimeString()}
          </time>
        </div>
        {!isUser && traceId && (
          <Rating traceId={traceId} />
        )}
      </div>
    </div>
  );
}
