// 消息类型
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isLoading?: boolean;
}

// 会话类型
export interface Session {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  model?: string;
}

// RAG检索结果类型
export interface RagResult {
  page_content: string;
  metadata: {
    id: string;
    distance: number;
    document_id: string;
    chunk_id: string;
    chunk_index: number;
    section: string;
    user_id: string;
    text_type: string;
    title: string;
    journal: string;
    year: number | null;
    authors: string[];
  };
  type: string;
}

// API响应类型
export interface ApiResponse<T> {
  code: string;
  msg: string | null;
  data: T;
  traceId: string;
}