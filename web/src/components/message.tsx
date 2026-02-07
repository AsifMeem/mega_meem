import type { Message } from "@/lib/types";

interface MessageProps {
  message: Message;
}

export function MessageBubble({ message }: MessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2 ${
          isUser
            ? "bg-blue-600 text-white rounded-br-sm"
            : "bg-gray-100 text-gray-900 rounded-bl-sm dark:bg-gray-800 dark:text-gray-100"
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
        <time className={`text-xs mt-1 block ${isUser ? "text-blue-200" : "text-gray-500"}`}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </time>
      </div>
    </div>
  );
}
