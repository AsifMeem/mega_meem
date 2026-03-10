export function CoachLoading() {
  return (
    <div className="flex justify-start">
      <div className="bg-chat-surface backdrop-blur-md border border-chat-border rounded-2xl px-5 py-4">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-chat-accent/60 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-2 h-2 bg-chat-accent/60 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-2 h-2 bg-chat-accent/60 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <span className="text-xs text-chat-muted">Processing...</span>
        </div>
      </div>
    </div>
  );
}
