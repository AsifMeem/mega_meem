"use client";

import { useState } from "react";
import { Nav } from "./nav";
import { NewSessionDialog } from "./new-session-dialog";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sessionDialogOpen, setSessionDialogOpen] = useState(false);

  return (
    <>
      <Nav onNewSession={() => setSessionDialogOpen(true)} />
      <main className="flex-1 overflow-hidden">{children}</main>
      <NewSessionDialog
        open={sessionDialogOpen}
        onClose={() => setSessionDialogOpen(false)}
        onCreated={() => {
          setSessionDialogOpen(false);
          window.location.reload();
        }}
      />
    </>
  );
}
