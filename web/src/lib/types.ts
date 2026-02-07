export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface ChatResponse {
  id: string;
  response: string;
  timestamp: string;
}

export interface HistoryResponse {
  messages: Message[];
  has_more: boolean;
  next_cursor: string | null;
}

export interface ArchiveResponse {
  archived_count: number;
  archived_at: string;
}
