import { AppShell } from "@/components/app-shell";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white text-gray-900 flex flex-col h-screen">
      <AppShell>{children}</AppShell>
    </div>
  );
}
