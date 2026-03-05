interface CoachUserMessageProps {
  content: string;
  timestamp: string;
}

export function CoachUserMessage({ content, timestamp }: CoachUserMessageProps) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[75%]">
        <div className="bg-chat-accent/15 border border-chat-accent/20 text-chat-text rounded-2xl rounded-br-md px-4 py-3">
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{content}</p>
          <time className="font-[family-name:var(--font-jetbrains)] text-xs text-chat-accent/60 mt-1 block">
            {new Date(timestamp).toLocaleTimeString()}
          </time>
        </div>
      </div>
    </div>
  );
}
