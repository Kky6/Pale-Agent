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

    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let isComplete = false;

    const processStream = async () => {
      try {
        while (!isComplete) {
          const { done, value } = await reader.read();
          
          if (done) {
            // 处理剩余的缓冲区数据
            if (buffer.trim()) {
              processChunk(buffer);
            }
            callbacks?.onComplete();
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          // 检查是否包含结束标记
          if (buffer.includes('<end></end>')) {
            isComplete = true;
          }

          // 处理完整的数据块
          const lines = buffer.split('\n\n');
          
          // 如果没有完成，保留最后一个可能不完整的部分
          if (!isComplete) {
            buffer = lines.pop() || '';
          } else {
            buffer = '';
          }

          for (const line of lines) {
            if (line.trim()) {
              processChunk(line);
            }
          }
        }
      } catch (error) {
        console.error('Stream processing error:', error);
        callbacks?.onError(error);
      }
    };

    const processChunk = (chunk: string) => {
      if (!chunk.trim()) return;
      
      try {
        // 移除SSE前缀
        let cleanChunk = chunk;
        const dataMatch = chunk.match(/^data:\s*(.+)$/m);
        if (dataMatch && dataMatch[1]) {
          cleanChunk = dataMatch[1];
        }
        
        // 尝试解析JSON
        try {
          const data = JSON.parse(cleanChunk);
          callbacks?.onData(data);
        } catch (jsonError) {
          // 如果不是JSON格式，直接传递文本
          callbacks?.onData(cleanChunk);
        }
      } catch (error) {
        console.error('Chunk processing error:', error);
        callbacks?.onData(chunk); // 降级处理
      }
    };

    processStream();
    return true;
  } catch (error) {
    console.error('SendMessage error:', error);
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