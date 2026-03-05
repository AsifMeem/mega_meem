"use client";

import { useState } from "react";
import { ChatNav } from "@/components/chat-nav";
import { NewSessionDialog } from "@/components/new-session-dialog";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);

  return (
    <div className="bg-chat-bg text-chat-text font-[family-name:var(--font-inter)] flex flex-col h-dvh">
      <ChatNav onNewSession={() => setSessionDialogOpen(true)} />
      <main className="flex-1 overflow-hidden">{children}</main>
      <NewSessionDialog
        open={sessionDialogOpen}
        onClose={() => setSessionDialogOpen(false)}
        onCreated={() => {
          setSessionDialogOpen(false);
          window.location.reload();
        }}
        dark
      />
    </div>
  );
}
