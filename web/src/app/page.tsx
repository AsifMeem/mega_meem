import { Chat } from "@/components/chat";

export default function Home() {
  return (
    <div className="flex h-screen flex-col bg-white dark:bg-gray-900">
      <header className="border-b px-4 py-3 dark:border-gray-700">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          Future Asif
        </h1>
        <p className="text-sm text-gray-500">
          Talk to a wiser version of yourself
        </p>
      </header>
      <main className="flex-1 overflow-hidden">
        <Chat />
      </main>
    </div>
  );
}
