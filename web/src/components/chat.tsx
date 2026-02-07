"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getHistory, sendMessage } from "@/lib/api";
import type { Message } from "@/lib/types";
import { LoadingIndicator } from "./loading-indicator";
import { MessageBubble } from "./message";
import { MessageInput } from "./message-input";

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Load initial history
  useEffect(() => {
    async function loadHistory() {
      setIsLoading(true);
      try {
        const data = await getHistory(20);
        // History comes newest-first, reverse for display (oldest at top)
        setMessages(data.messages.reverse());
        setHasMore(data.has_more);
        setNextCursor(data.next_cursor);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load history");
      } finally {
        setIsLoading(false);
      }
    }
    loadHistory();
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (content: string) => {
    setError(null);
    setIsSending(true);

    // Optimistic update: add user message immediately
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const response = await sendMessage(content);
      // Replace temp message and add assistant response
      setMessages((prev) => {
        const withoutTemp = prev.filter((m) => m.id !== tempUserMsg.id);
        return [
          ...withoutTemp,
          { ...tempUserMsg, id: `user-${response.id}` },
          {
            id: response.id,
            role: "assistant",
            content: response.response,
            timestamp: response.timestamp,
          },
        ];
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
      // Remove temp message on error
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setIsSending(false);
    }
  };

  const loadMore = useCallback(async () => {
    if (!hasMore || !nextCursor || isLoading) return;
    setIsLoading(true);
    try {
      const data = await getHistory(20, nextCursor);
      // Prepend older messages (reversed since they come newest-first)
      setMessages((prev) => [...data.messages.reverse(), ...prev]);
      setHasMore(data.has_more);
      setNextCursor(data.next_cursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load more");
    } finally {
      setIsLoading(false);
    }
  }, [hasMore, nextCursor, isLoading]);

  // Infinite scroll: load more when scrolled to top
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (container.scrollTop < 100 && hasMore && !isLoading) {
        loadMore();
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [hasMore, isLoading, loadMore]);

  return (
    <div className="flex flex-col h-full">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-2">
          {error}
        </div>
      )}

      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {isLoading && messages.length === 0 && (
          <div className="text-center text-gray-500">Loading...</div>
        )}

        {hasMore && (
          <button
            onClick={loadMore}
            disabled={isLoading}
            className="w-full text-center text-blue-600 hover:text-blue-800 py-2"
          >
            {isLoading ? "Loading..." : "Load older messages"}
          </button>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isSending && <LoadingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t p-4 dark:border-gray-700">
        <MessageInput onSend={handleSend} disabled={isSending} />
      </div>
    </div>
  );
}
