"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getHistory, sendMessage } from "@/lib/api";
import { generateMockScoring } from "@/lib/mock-scoring";
import { DEMO_STEPS, WONT_DO_RESPONSE } from "@/lib/demo-script";
import type { Message, ScoringMetrics, DoseLevels, TodoItem, ActionPillOption } from "@/lib/types";
import { CoachLoading } from "./coach-loading";
import { CoachMessage } from "./coach-message";
import { CoachUserMessage } from "./coach-user-message";
import { CoachInput } from "./coach-input";
import { DoseDashboard } from "./dose-dashboard";
import { ActionPills } from "./action-pills";
import { PromptPills } from "./prompt-pills";

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [scoringMap, setScoringMap] = useState<Map<string, ScoringMetrics>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Demo state
  const [demoStep, setDemoStep] = useState(0);
  const [doseLevels, setDoseLevels] = useState<DoseLevels | null>(null);
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [activeActionPills, setActiveActionPills] = useState<ActionPillOption[] | null>(null);
  const [activePromptPills, setActivePromptPills] = useState<string[]>([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Load initial history (skip in demo mode)
  useEffect(() => {
    if (DEMO_MODE) return;
    async function loadHistory() {
      setIsLoading(true);
      try {
        const data = await getHistory(20);
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

  useEffect(() => {
    scrollToBottom();
  }, [messages, doseLevels]);

  const addDemoAssistantMessage = (step: typeof DEMO_STEPS[number]) => {
    const msgId = `demo-assistant-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: msgId,
        role: "assistant",
        content: step.content,
        timestamp: new Date().toISOString(),
      },
    ]);
    if (step.doseLevels) setDoseLevels(step.doseLevels);
    if (step.todos) setTodos(step.todos);
    if (step.actionPills) setActiveActionPills(step.actionPills);
    else setActiveActionPills(null);
    if (step.promptPills) setActivePromptPills(step.promptPills);
    else setActivePromptPills([]);
  };

  const handleDemoSend = (content: string) => {
    // Add user message
    setMessages((prev) => [
      ...prev,
      {
        id: `demo-user-${Date.now()}`,
        role: "user",
        content,
        timestamp: new Date().toISOString(),
      },
    ]);
    setActivePromptPills([]);

    // Simulate AI thinking then respond
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      if (demoStep < DEMO_STEPS.length) {
        addDemoAssistantMessage(DEMO_STEPS[demoStep]);
        setDemoStep((s) => s + 1);
      }
    }, 1200);
  };

  const handleActionPillSelect = (value: string) => {
    // Remove pills immediately
    setActiveActionPills(null);

    // Add user bubble
    const bubbleText = value === "done" ? "Done ✓" : "Won't do";
    setMessages((prev) => [
      ...prev,
      {
        id: `demo-action-${Date.now()}`,
        role: "user",
        content: bubbleText,
        timestamp: new Date().toISOString(),
      },
    ]);

    // Simulate AI response
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      if (value === "done" && demoStep < DEMO_STEPS.length) {
        addDemoAssistantMessage(DEMO_STEPS[demoStep]);
        setDemoStep((s) => s + 1);
      } else if (value === "wont_do") {
        addDemoAssistantMessage(WONT_DO_RESPONSE);
      }
    }, 1000);
  };

  const handlePromptPillSelect = (pill: string) => {
    handleDemoSend(pill);
  };

  const handleSend = async (content: string) => {
    if (DEMO_MODE) {
      handleDemoSend(content);
      return;
    }

    setError(null);
    setIsSending(true);

    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const response = await sendMessage(content);
      const scoring = generateMockScoring();

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
      setScoringMap((prev) => new Map(prev).set(response.id, scoring));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
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
      setMessages((prev) => [...data.messages.reverse(), ...prev]);
      setHasMore(data.has_more);
      setNextCursor(data.next_cursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load more");
    } finally {
      setIsLoading(false);
    }
  }, [hasMore, nextCursor, isLoading]);

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
        <div className="bg-chat-danger-surface border border-chat-danger/20 text-chat-danger px-4 py-2 rounded-xl mx-4 mt-2 text-sm">
          {error}
        </div>
      )}

      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4"
      >
        <div className="mx-auto max-w-3xl space-y-4">
          {isLoading && messages.length === 0 && !DEMO_MODE && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="h-6 w-6 border-2 border-chat-surface border-t-chat-accent rounded-full animate-spin" />
              <p className="mt-3 text-sm text-chat-muted">Loading messages...</p>
            </div>
          )}

          {hasMore && !DEMO_MODE && (
            <button
              onClick={loadMore}
              disabled={isLoading}
              className="w-full text-center text-sm text-chat-accent hover:text-chat-accent-hover py-2 transition-colors"
            >
              {isLoading ? "Loading..." : "Load older messages"}
            </button>
          )}

          {messages.map((msg) =>
            msg.role === "user" ? (
              <CoachUserMessage
                key={msg.id}
                content={msg.content}
                timestamp={msg.timestamp}
              />
            ) : (
              <CoachMessage
                key={msg.id}
                content={msg.content}
                timestamp={msg.timestamp}
                scoring={DEMO_MODE ? undefined : scoringMap.get(msg.id)}
              />
            )
          )}

          {/* DOSE Dashboard — inline after messages */}
          {DEMO_MODE && doseLevels && (
            <DoseDashboard levels={doseLevels} todos={todos} />
          )}

          {/* Action pills (Done / Won't do) */}
          {DEMO_MODE && activeActionPills && (
            <ActionPills
              options={activeActionPills}
              onSelect={handleActionPillSelect}
              disabled={isSending}
            />
          )}

          {isSending && <CoachLoading />}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Prompt pills above input */}
      {DEMO_MODE && activePromptPills.length > 0 && (
        <div className="bg-chat-bg/80 backdrop-blur-sm px-4 pt-3">
          <div className="mx-auto max-w-3xl">
            <PromptPills pills={activePromptPills} onSelect={handlePromptPillSelect} />
          </div>
        </div>
      )}

      <CoachInput
        onSend={handleSend}
        disabled={isSending}
        placeholder={DEMO_MODE ? "How are you feeling today?" : undefined}
      />
    </div>
  );
}
