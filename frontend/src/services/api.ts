import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器，添加token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 创建会话
export const createChat = async () => {
  const response = await api.get('/chat/generate');
  return response.data;
};

// 发送消息（流式响应）
export const sendMessage = async (text: string, sessionId: string, module?: string, callbacks?: {
  onData: (data: any) => void,
  onError: (error: any) => void,
  onComplete: () => void
}) => {
  try {
    // 使用fetch API代替axios处理流式响应
    const response = await fetch('/api/chat/sendMsg', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        text,
        sessionId,
        module
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    const processStream = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            if (buffer.trim()) {
              processChunk(buffer);
            }
            callbacks?.onComplete();
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          // 处理完整的SSE事件
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || ''; // 保留最后一个不完整的部分

          for (const line of lines) {
            processChunk(line);
          }
        }
      } catch (error) {
        callbacks?.onError(error);
      }
    };

    const processChunk = (chunk: string) => {
      if (!chunk.trim()) return;
      
      // 提取data部分
      const dataMatch = chunk.match(/^data:\s*(.+)$/m);
      if (dataMatch && dataMatch[1]) {
        try {
          const data = JSON.parse(dataMatch[1]);
          callbacks?.onData(data);
        } catch (e) {
          // 如果不是JSON格式，直接传递文本
          callbacks?.onData(dataMatch[1]);
        }
      } else {
        // 如果没有data前缀，直接传递整个文本
        callbacks?.onData(chunk);
      }
    };

    processStream();
    return true;
  } catch (error) {
    callbacks?.onError(error);
    return false;
  }
};

// RAG知识库检索
export const ragSearch = async (query: string, pathList: string[] = [], topK: number = 8, isTeam: boolean = false) => {
  const response = await api.post('/rag/top_k', {
    query,
    pathList,
    topK,
    isTeam
  });
  return response.data;
};

// 设置token
export const setToken = (token: string) => {
  localStorage.setItem('token', token);
};

// 获取token
export const getToken = () => {
  return localStorage.getItem('token');
};

// 清除token
export const clearToken = () => {
  localStorage.removeItem('token');
};

export default api;