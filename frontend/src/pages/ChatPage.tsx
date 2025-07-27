import React, { useState, useEffect, useRef } from 'react';
import { message, Button, Modal, Input, Form, Switch, Drawer, Typography, Space } from 'antd';
import { SearchOutlined, SettingOutlined } from '@ant-design/icons';
import styled from 'styled-components';
// 需要先安装uuid依赖: npm install @types/uuid uuid
import { v4 as uuidv4 } from 'uuid';

import Layout from '../components/Layout';
import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
import SessionList from '../components/SessionList';
import ModelSelector from '../components/ModelSelector';
import RagResults from '../components/RagResults';

import { createChat, sendMessage, ragSearch, setToken } from '../services/api';
import type { Session, Message, RagResult } from '../types';

const { Title, Text } = Typography;

// 工具函数移到组件外部，避免重复定义
const safeDecodeURIComponent = (str: string): string => {
  if (!str) return '';
  
  let decoded = str;
  let attempts = 0;
  const maxAttempts = 10;
  
  while (attempts < maxAttempts) {
    try {
      const newDecoded = decodeURIComponent(decoded);
      if (newDecoded === decoded) {
        break;
      }
      decoded = newDecoded;
      attempts++;
    } catch (e) {
      console.warn(`解码失败 (尝试 ${attempts + 1}):`, e);
      try {
        decoded = decoded
          .replace(/%20/g, ' ')
          .replace(/%22/g, '"')
          .replace(/%7B/g, '{')
          .replace(/%7D/g, '}')
          .replace(/%5B/g, '[')
          .replace(/%5D/g, ']')
          .replace(/%3A/g, ':')
          .replace(/%2C/g, ',')
          .replace(/%0A/g, '\n');
      } catch (replaceError) {
        console.error('替换编码字符失败:', replaceError);
      }
      break;
    }
  }
  
  return decoded;
};

const isValidJSON = (str: string): boolean => {
  if (!str || typeof str !== 'string') return false;
  
  try {
    const trimmed = str.trim();
    if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) {
      return false;
    }
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
};

const ChatContainerWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 64px - 80px);
  overflow-y: auto;
  padding: 16px 0;
  background: #f9f9f9;
  border-radius: 8px;
`;

const HeaderContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  margin-bottom: 16px;
  padding: 0 16px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
`;

const ControlsContainer = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  
  @media (max-width: 768px) {
    width: 100%;
    justify-content: space-between;
  }
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0 16px;
  margin-bottom: 16px;
  height: calc(100vh - 64px - 120px);
  display: flex;
  flex-direction: column;
`;

const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  background: #f9f9f9;
  border-radius: 8px;
  box-shadow: inset 0 0 6px rgba(0, 0, 0, 0.05);
`;

const InputContainer = styled.div`
  padding: 0 16px 16px;
  background: #fff;
  border-top: 1px solid #f0f0f0;
  position: sticky;
  bottom: 0;
  z-index: 10;
`;

const ChatPage: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [model, setModel] = useState('GeoGPT-R1-Preview');
  const [token, setTokenState] = useState('');
  const [tokenModalVisible, setTokenModalVisible] = useState(false);
  const [ragDrawerVisible, setRagDrawerVisible] = useState(false);
  const [ragResults, setRagResults] = useState<any[]>([]);
  const [ragLoading, setRagLoading] = useState(false);
  const [useRag, setUseRag] = useState(false);
  const [useCommonRag, setUseCommonRag] = useState(false);
  const [currentInput, setCurrentInput] = useState('');
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [form] = Form.useForm();

  // 初始化检查token
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    if (!savedToken) {
      setTokenModalVisible(true);
    } else {
      setTokenState(savedToken);
    }

    // 从localStorage加载会话
    const savedSessions = localStorage.getItem('sessions');
    if (savedSessions) {
      setSessions(JSON.parse(savedSessions));
    }
  }, []);

  // 保存会话到localStorage
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('sessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  // 当activeSessionId变化时，更新消息
  useEffect(() => {
    if (activeSessionId) {
      const session = sessions.find(s => s.id === activeSessionId);
      if (session) {
        setMessages(session.messages);
        setModel(session.model || 'GeoGPT-R1-Preview');
      }
    } else {
      setMessages([]);
    }
  }, [activeSessionId, sessions]);

  // 滚动到底部
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // 同步消息到会话的函数
  const syncMessagesToSession = (messagesToSync: Message[]) => {
    if (activeSessionId && messagesToSync.length > 0) {
      setSessions(prevSessions => 
        prevSessions.map(session => 
          session.id === activeSessionId
            ? { ...session, messages: [...messagesToSync], updatedAt: Date.now() }
            : session
        )
      );
    }
  };

  const handleTokenSubmit = () => {
    form.validateFields().then(values => {
      setToken(values.token);
      setTokenState(values.token);
      setTokenModalVisible(false);
      message.success('Token设置成功');
    });
  };

  const handleNewSession = async () => {
    try {
      setLoading(true);
      
      // 在创建新会话前，先保存当前会话的消息
      if (activeSessionId && messages.length > 0) {
        setSessions(prevSessions => {
          const updatedSessions = prevSessions.map(session => 
            session.id === activeSessionId
              ? { ...session, messages: [...messages], updatedAt: Date.now() }
              : session
          );
          
          // 保存到localStorage
          localStorage.setItem('sessions', JSON.stringify(updatedSessions));
          
          return updatedSessions;
        });
      }
      
      const response = await createChat();
      
      if (response.code === '00000') {
        const newSession: Session = {
          id: response.data,
          title: `新会话 ${sessions.length + 1}`,
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          model
        };
        
        setSessions(prevSessions => {
          const updatedSessions = [newSession, ...prevSessions];
          // 保存到localStorage
          localStorage.setItem('sessions', JSON.stringify(updatedSessions));
          return updatedSessions;
        });
        
        setActiveSessionId(newSession.id);
        setMessages([]);
        message.success('创建会话成功');
      } else {
        message.error(`创建会话失败: ${response.msg}`);
      }
    } catch (error) {
      console.error('创建会话错误:', error);
      message.error('创建会话失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSession = (sessionId: string) => {
    // 如果是同一个会话，直接返回
    if (activeSessionId === sessionId) {
      return;
    }

    // 在切换前保存当前会话的消息
    if (activeSessionId && messages.length > 0) {
      setSessions(prevSessions => {
        const updatedSessions = prevSessions.map(session => 
          session.id === activeSessionId
            ? { ...session, messages: [...messages], updatedAt: Date.now() }
            : session
        );
        
        // 保存到localStorage
        localStorage.setItem('sessions', JSON.stringify(updatedSessions));
        
        return updatedSessions;
      });
    }
    
    // 直接切换会话ID，让useEffect处理消息加载
    setActiveSessionId(sessionId);
  };

  // 修复删除会话功能
  const handleDeleteSession = (sessionId: string) => {
    console.log('ChatPage: 删除会话', sessionId); // 添加调试日志
    
    setSessions(prevSessions => {
      const newSessions = prevSessions.filter(session => session.id !== sessionId);
      
      // 如果删除的是当前激活的会话
      if (sessionId === activeSessionId) {
        if (newSessions.length > 0) {
          // 切换到第一个会话
          setActiveSessionId(newSessions[0].id);
        } else {
          // 没有会话了，清空状态
          setActiveSessionId('');
          setMessages([]);
        }
      }
      
      // 更新localStorage
      if (newSessions.length === 0) {
        localStorage.removeItem('sessions');
      } else {
        localStorage.setItem('sessions', JSON.stringify(newSessions));
      }
      
      return newSessions;
    });
    
    message.success('会话已删除');
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || loading) return;
  
    // 为普通对话添加中文回答提示
    const enhancedContent = content.includes('请') || content.includes('中文') || content.includes('用中文') 
      ? content 
      : `请用中文详细回答以下问题：\n\n${content}`;
  
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: content.trim(), // 显示原始用户输入
      timestamp: Date.now()
    };
  
    const tempAiMessage: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: '🤔 正在思考...',
      timestamp: Date.now(),
      isLoading: true
    };
    
    const updatedMessages = [...messages, userMessage, tempAiMessage];
    setMessages(updatedMessages);
  
    try {
      setLoading(true);
      let accumulatedContent = '';
      let currentThinkingContent = '';
      let currentAnswerContent = '';
      let lastThinkingLength = 0;
      let lastAnswerLength = 0;
      let isInAnswerMode = false;
      let thinkingComplete = false;
      let thinkingStartTime = Date.now();
  
      // 添加实时更新计时器
      const updateTimer = setInterval(() => {
        if (!thinkingComplete && currentThinkingContent) {
          const thinkingTime = Math.floor((Date.now() - thinkingStartTime) / 1000);
          const formattedThinking = currentThinkingContent.replace(/\n/g, '\n> ');
          const displayContent = `🤔 **正在思考中... (${thinkingTime}s)**\n\n> 💭 ${formattedThinking}`;
          
          setMessages(prevMessages => 
            prevMessages.map(msg => 
              msg.id === tempAiMessage.id 
                ? { ...msg, content: displayContent }
                : msg
            )
          );
        }
      }, 500); // 每500ms更新一次
  
      await sendMessage(enhancedContent, activeSessionId, model, {
        onData: (data) => {
          try {
            if (typeof data === 'string') {
              accumulatedContent += data;
              
              let displayContent = '';
              let shouldUpdate = false;
              
              // 提取所有markdown标签内容
              const markdownMatches = accumulatedContent.match(/<markdown>([^<]*)<\/markdown>/g);
              
              if (markdownMatches && markdownMatches.length > 0) {
                // 获取最新的markdown内容
                const latestMarkdown = markdownMatches[markdownMatches.length - 1];
                const encodedContent = latestMarkdown.match(/<markdown>([^<]*)<\/markdown>/)?.[1];
                
                if (encodedContent) {
                  try {
                    // 安全解码
                    const decodedContent = safeDecodeURIComponent(encodedContent);
                    console.log('解码后内容:', decodedContent);
                    
                    // 验证是否为有效JSON
                    if (!isValidJSON(decodedContent)) {
                      console.warn('解码后的内容不是有效的JSON，尝试直接显示');
                      // 如果不是有效JSON，尝试直接作为文本显示
                      if (decodedContent.length > 0) {
                        displayContent = decodedContent;
                        shouldUpdate = true;
                      }
                    } else {
                      // 解析JSON
                      const jsonData = JSON.parse(decodedContent);
                      
                      if (Array.isArray(jsonData) && jsonData.length > 0) {
                        // 处理所有数据项
                        for (const item of jsonData) {
                          if (item.type === 'Thinking' && item.content) {
                            const thinkingContent = item.content;
                            
                            if (thinkingContent.status === 'running' || thinkingContent.status === 'done') {
                              // 安全解码思考内容
                              let actualContent = safeDecodeURIComponent(thinkingContent.content || '');
                              
                              // 只有内容增长时才更新（实现真正的流式效果）
                              if (actualContent.length > lastThinkingLength) {
                                currentThinkingContent = actualContent;
                                lastThinkingLength = actualContent.length;
                                shouldUpdate = true;
                              }
                              
                              if (thinkingContent.status === 'done') {
                                thinkingComplete = true;
                                isInAnswerMode = true;
                                clearInterval(updateTimer);
                                shouldUpdate = true;
                              }
                            }
                            
                          } else if ((item.type === 'MarkDown' || item.type === 'markdown') && item.content) {
                            // 处理回答内容
                            let answerContent = safeDecodeURIComponent(item.content || '');
                            
                            // 美化回答格式
                            answerContent = answerContent
                              .replace(/\\n\\n/g, '\n\n')
                              .replace(/\\n/g, '\n')
                              .replace(/\\t/g, '\t')
                              .trim();
                            
                            if (answerContent.startsWith('\n')) {
                              answerContent = answerContent.substring(1);
                            }
                            
                            // 只有内容增长时才更新
                            if (answerContent.length > lastAnswerLength) {
                              currentAnswerContent = answerContent;
                              lastAnswerLength = answerContent.length;
                              isInAnswerMode = true;
                              shouldUpdate = true;
                            }
                          }
                        }
                      }
                    }
                    
                    // 构建最终显示内容 - 使用纯Markdown格式
                    if (isInAnswerMode && currentAnswerContent) {
                      // 回答模式：显示完整思考 + 流式回答
                      const thinkingDisplay = currentThinkingContent ? 
                        `> 💭 **思考过程：**\n> \n> ${currentThinkingContent.replace(/\n/g, '\n> ')}\n\n---\n\n` : '';
                      
                      displayContent = thinkingDisplay + currentAnswerContent;
                      shouldUpdate = true; // 确保回答内容总是更新
                      
                    } else if (currentThinkingContent && !thinkingComplete) {
                      // 思考模式：流式显示思考过程
                      const thinkingTime = Math.floor((Date.now() - thinkingStartTime) / 1000);
                      const formattedThinking = currentThinkingContent.replace(/\n/g, '\n> ');
                      displayContent = `🤔 **正在思考中... (${thinkingTime}s)**\n\n> 💭 ${formattedThinking}`;
                      shouldUpdate = true; // 确保思考内容总是更新
                      
                    } else if (thinkingComplete && !currentAnswerContent) {
                      // 思考完成，等待回答
                      const thinkingDisplay = currentThinkingContent ? 
                        `> 💭 **思考过程：**\n> \n> ${currentThinkingContent.replace(/\n/g, '\n> ')}\n\n---\n\n` : '';
                      
                      displayContent = thinkingDisplay + '✅ **思考完成，正在生成回答...**';
                      shouldUpdate = true;
                    }
                    
                  } catch (parseError) {
                    console.error('解析错误:', parseError);
                    
                    // 降级处理：直接显示原始内容
                    if (encodedContent && encodedContent.length > 0) {
                      displayContent = `🤔 正在处理内容...\n\n${encodedContent.substring(0, 200)}${encodedContent.length > 200 ? '...' : ''}`;
                      shouldUpdate = true;
                    }
                  }
                }
              }
              
              // 检查是否完成
              const isComplete = accumulatedContent.includes('<end></end>');
              
              // 强制更新UI - 移除shouldUpdate限制，确保实时显示
              setMessages(prevMessages => 
                prevMessages.map(msg => 
                  msg.id === tempAiMessage.id 
                    ? { 
                        ...msg, 
                        content: displayContent || '🤔 正在思考...',
                        isLoading: !isComplete
                      }
                    : msg
                )
              );
            }
          } catch (error) {
            console.error('onData处理错误:', error);
            // 确保即使出错也能显示一些内容
            setMessages(prevMessages => 
              prevMessages.map(msg => 
                msg.id === tempAiMessage.id 
                  ? { 
                      ...msg, 
                      content: '⚠️ 内容处理中遇到问题，请稍候...',
                      isLoading: true
                    }
                  : msg
              )
            );
          }
        },
        onError: (error) => {
          console.error('发送消息错误:', error);
          message.error('发送消息失败，请重试');
          
          setMessages(prevMessages => 
            prevMessages.map(msg => 
              msg.id === tempAiMessage.id 
                ? { ...msg, content: '❌ 发送失败，请重试', isLoading: false }
                : msg
            )
          );
          setLoading(false);
        },
        onComplete: () => {
          console.log('流式传输完成');
          setLoading(false);
          
          const finalMessages = [...messages, userMessage, {
            ...tempAiMessage,
            content: currentAnswerContent || currentThinkingContent || '回答完成',
            isLoading: false
          }];
          
          setMessages(finalMessages);
          
          // 立即同步到会话并保存到localStorage
          if (activeSessionId) {
            setSessions(prevSessions => {
              const updatedSessions = prevSessions.map(session => 
                session.id === activeSessionId
                  ? { ...session, messages: finalMessages, updatedAt: Date.now() }
                  : session
              );
              
              // 立即保存到localStorage
              localStorage.setItem('sessions', JSON.stringify(updatedSessions));
              
              return updatedSessions;
            });
          }
        }
      });
    } catch (error) {
      console.error('发送消息失败:', error);
      message.error('发送消息失败，请重试');
      
      setMessages(prevMessages => 
        prevMessages.map(msg => 
          msg.id === tempAiMessage.id 
            ? { ...msg, content: '❌ 发送失败，请重试', isLoading: false }
            : msg
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const handleModelChange = (value: string) => {
    setModel(value);
    
    // 更新当前会话的模型
    if (activeSessionId) {
      const updatedSessions = sessions.map(session => {
        if (session.id === activeSessionId) {
          return {
            ...session,
            model: value
          };
        }
        return session;
      });
      setSessions(updatedSessions);
    }
  };

  // 修复的RAG检索函数 - 自动引用检索内容作为提示
  const handleRagSearch = async (query: string) => {
    if (!query.trim() || loading) return;
    
    try {
      setLoading(true);
      
      // 先进行RAG检索
      const ragResponse = await ragSearch(query);
      
      if (ragResponse.code === '00000' && ragResponse.data && ragResponse.data.final) {
        const ragResults = ragResponse.data.final;
        
        if (ragResults.length > 0) {
          // 取前3个最相关的结果（按用户要求）
          const topResults = ragResults.slice(0, 3);
          
          // 构建引用内容 - 移除内容截断限制
          const references = topResults.map(([result, score]: [RagResult, number], index: number) => {
            // 直接使用完整内容，不进行截断
            let content = result.page_content || '';
            
            // 如果内容为空，记录错误并使用备用文本
            if (!content || content.trim() === '') {
              console.error(`引用${index + 1}的内容为空:`, result);
              content = '内容获取失败，请检查数据源';
            }
            // 移除内容长度限制，保持完整性
            
            // 安全获取元数据
            const metadata = result.metadata || {};
            const title = metadata.title || '未命名文档';
            const section = metadata.section || '未知章节';
            const authors = metadata.authors || [];
            const year = metadata.year || '未知';
            
            return `[引用${index + 1}] 《${title}》- ${section}
作者: ${Array.isArray(authors) ? authors.join(', ') : '未知'}
年份: ${year}
相关度: ${(score * 100).toFixed(1)}%

内容摘要:
${content}

---`;
          }).join('\n\n');
          
          // 构建RAG增强的提示
          const ragPrompt = `请基于以下知识库内容详细回答问题。请仔细阅读所有引用资料，综合分析后给出准确、全面的回答。

【知识库参考资料】
${references}

【用户问题】
${query}

【回答要求】
1. 请根据上述参考资料并结合你的知识用中文详细回答问题
2. 在回答中适当引用具体的资料内容
3. 在回答末尾明确标注所引用的资料来源
4. 如果资料中有不同观点，请进行对比分析
5. 如果资料不足以完全回答问题，请说明局限性`;
          
          // 发送RAG增强的消息
          await handleSendMessage(ragPrompt);
          
          message.success(`已基于 ${topResults.length} 条知识库内容生成详细回答`);
        } else {
          message.warning('未找到相关知识库内容，将使用普通模式回答');
          await handleSendMessage(query);
        }
      } else {
        message.error(`检索失败: ${ragResponse.msg}，将使用普通模式回答`);
        await handleSendMessage(query);
      }
    } catch (error) {
      console.error('RAG检索错误:', error);
      message.error('检索失败，将使用普通模式回答');
      await handleSendMessage(query);
    } finally {
      setLoading(false);
    }
  };

  // 知识库浏览功能 - 仅用于查看检索结果
  const handleKnowledgeBaseSearch = async (query?: string) => {
    try {
      setRagLoading(true);
      setRagDrawerVisible(true);
      
      if (query) {
        const response = await ragSearch(query);
        if (response.code === '00000' && response.data && response.data.final) {
          setRagResults(response.data.final);
        } else {
          message.error(`检索失败: ${response.msg}`);
          setRagResults([]);
        }
      }
    } catch (error) {
      console.error('知识库检索错误:', error);
      message.error('检索失败，请重试');
      setRagResults([]);
    } finally {
      setRagLoading(false);
    }
  };

  // 在handleKnowledgeBaseSearch函数之后添加
  const handleKnowledgeBaseClick = async () => {
    if (currentInput.trim()) {
      // 如果有输入内容，进行RAG检索并显示结果
      await handleKnowledgeBaseSearch(currentInput.trim());
    } else {
      // 如果没有输入内容，只打开抽屉
      setRagDrawerVisible(true);
    }
  };

  return (
    <Layout
      sider={
        <SessionList
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={handleSelectSession}
          onNewSession={handleNewSession}
          onDeleteSession={handleDeleteSession}
        />
      }
      header={
        <HeaderContainer>
          <Title level={4} style={{ margin: 0 }}>GeoGPT 古生物智能体</Title>
          <ControlsContainer>
            <ModelSelector
              value={model}
              onChange={handleModelChange}
              disabled={loading}
            />
            <Button
              icon={<SearchOutlined />}
              onClick={handleKnowledgeBaseClick}
              disabled={!activeSessionId}
            >
              知识库
            </Button>
            <Button
              icon={<SettingOutlined />}
              onClick={() => setTokenModalVisible(true)}
            >
              设置
            </Button>
          </ControlsContainer>
        </HeaderContainer>
      }
    >
      {activeSessionId ? (
        <>
          <MessagesContainer>
            <ChatContainer ref={chatContainerRef}>
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                />
              ))}
            </ChatContainer>
          </MessagesContainer>
          <InputContainer>
            
            <ChatInput
              onSend={handleSendMessage}
              onSearch={handleRagSearch}
              onInputChange={setCurrentInput}
              loading={loading}
            />
          </InputContainer>
        </>
      ) : (
        <div style={{ 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '30px 20px',
          background: 'linear-gradient(135deg, #faf8f5 0%, #f0ede8 30%, #e8e0d6 70%, #ddd4c8 100%)',
          position: 'relative',
          overflow: 'auto',
          animation: 'fadeIn 1s ease-in-out'
        }}>
          {/* 动态背景装饰 */}
          <div style={{
            position: 'absolute',
            top: '8%',
            left: '5%',
            width: '120px',
            height: '120px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle, rgba(139, 69, 19, 0.15) 0%, rgba(139, 69, 19, 0.08) 50%, rgba(139, 69, 19, 0.03) 80%, transparent 100%)',
            borderRadius: '50%',
            zIndex: 0,
            animation: 'dinoFloat 4s ease-in-out infinite, dinoRotate 8s linear infinite',
            boxShadow: '0 8px 25px rgba(139, 69, 19, 0.2), inset 0 2px 8px rgba(255, 255, 255, 0.3)',
            border: '2px solid rgba(139, 69, 19, 0.2)',
            backdropFilter: 'blur(5px)'
          }}>
            <div style={{
              fontSize: '48px',
              animation: 'dinoWiggle 2s ease-in-out infinite alternate',
              filter: 'drop-shadow(2px 2px 4px rgba(139, 69, 19, 0.3))',
              transform: 'rotate(-10deg)'
            }}>
              🦕
            </div>
          </div>
          <div style={{
            position: 'absolute',
            bottom: '12%',
            right: '8%',
            width: '160px',
            height: '160px',
            background: 'radial-gradient(circle, rgba(212, 184, 150, 0.12) 0%, rgba(212, 184, 150, 0.06) 70%, transparent 100%)',
            borderRadius: '50%',
            zIndex: 0,
            animation: 'float 8s ease-in-out infinite reverse'
          }} />
          <div style={{
            position: 'absolute',
            top: '20%',
            right: '15%',
            width: '80px',
            height: '80px',
            background: 'radial-gradient(circle, rgba(160, 82, 45, 0.08) 0%, transparent 70%)',
            borderRadius: '50%',
            zIndex: 0,
            animation: 'pulse 4s ease-in-out infinite'
          }} />
          
          <div style={{ 
            maxWidth: '900px',
            width: '100%',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '24px',
            boxShadow: '0 12px 40px rgba(139, 69, 19, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1)',
            padding: '40px 35px',
            backdropFilter: 'blur(15px)',
            border: '1px solid rgba(212, 184, 150, 0.3)',
            position: 'relative',
            zIndex: 1,
            maxHeight: 'calc(100vh - 160px)',
            overflowY: 'auto',
            animation: 'slideUp 0.8s ease-out'
          }}>
            {/* 标题区域 */}
            <div style={{ textAlign: 'center', marginBottom: '35px' }}>
              <Title level={1} style={{ 
                marginBottom: '12px', 
                color: '#8B4513',
                fontSize: '2.2rem',
                fontWeight: 'bold',
                textShadow: '2px 2px 4px rgba(139, 69, 19, 0.1)',
                animation: 'titleGlow 3s ease-in-out infinite alternate'
              }}>
                🦕 GeoGPT 古生物智能体
              </Title>
              <Text style={{ 
                fontSize: '16px', 
                color: '#5d4e37',
                display: 'block',
                fontStyle: 'italic',
                opacity: 0.9
              }}>
                探索远古生命的奥秘，解读地球生物演化的历史
              </Text>
            </div>
            
            {/* 指南区域 */}
            <div style={{ 
              marginBottom: '35px', 
              padding: '25px', 
              backgroundColor: '#f5f3f0',
              borderRadius: '16px',
              textAlign: 'left',
              border: '2px solid #d4b896',
              boxShadow: '0 4px 16px rgba(139, 69, 19, 0.08)',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              cursor: 'default'
            }}>
              <Title level={3} style={{ color: '#8B4513', marginBottom: '16px', fontSize: '18px' }}>
                🔍 探索指南
              </Title>
              <ul style={{ 
                textAlign: 'left', 
                lineHeight: '1.8', 
                color: '#5d4e37',
                fontSize: '15px',
                paddingLeft: '20px',
                margin: 0
              }}>
                <li style={{ marginBottom: '8px', transition: 'color 0.3s ease' }}>
                  点击<strong>创建新会话</strong>开始古生物探索之旅
                </li>
                <li style={{ marginBottom: '8px', transition: 'color 0.3s ease' }}>
                  询问古生物学、地质年代、化石相关的专业问题
                </li>
                <li style={{ marginBottom: '8px', transition: 'color 0.3s ease' }}>
                  使用知识库功能检索专业文献和化石资料
                </li>
                <li style={{ transition: 'color 0.3s ease' }}>
                  AI将展示详细推理过程，助您深入理解古生物学知识
                </li>
              </ul>
            </div>
            
            {/* 示例卡片 */}
            <div style={{ 
              marginBottom: '35px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '20px'
            }}>
              <div style={{ 
                padding: '20px', 
                backgroundColor: '#faf8f5',
                borderRadius: '16px',
                textAlign: 'left',
                border: '1px solid #d4b896',
                boxShadow: '0 4px 12px rgba(139, 69, 19, 0.1)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(45deg, transparent 0%, rgba(139, 69, 19, 0.05) 50%, transparent 100%)',
                  transform: 'translateX(-100%)',
                  transition: 'transform 0.6s ease'
                }} />
                <Title level={4} style={{ color: '#8B4513', marginBottom: '10px', fontSize: '16px', position: 'relative', zIndex: 1 }}>
                  🦴 化石分析
                </Title>
                <Text style={{ color: '#5d4e37', fontSize: '14px', lineHeight: '1.5', position: 'relative', zIndex: 1 }}>
                  「请帮我分析三叶虫化石的形态特征及其在寒武纪的生态意义」
                </Text>
              </div>
              
              <div style={{ 
                padding: '20px', 
                backgroundColor: '#faf8f5',
                borderRadius: '16px',
                textAlign: 'left',
                border: '1px solid #d4b896',
                boxShadow: '0 4px 12px rgba(139, 69, 19, 0.1)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(45deg, transparent 0%, rgba(139, 69, 19, 0.05) 50%, transparent 100%)',
                  transform: 'translateX(-100%)',
                  transition: 'transform 0.6s ease'
                }} />
                <Title level={4} style={{ color: '#8B4513', marginBottom: '10px', fontSize: '16px', position: 'relative', zIndex: 1 }}>
                  🌍 地质年代
                </Title>
                <Text style={{ color: '#5d4e37', fontSize: '14px', lineHeight: '1.5', position: 'relative', zIndex: 1 }}>
                  「请解释白垩纪末期大灭绝事件的成因及其对生物演化的影响」
                </Text>
              </div>
              
              <div style={{ 
                padding: '20px', 
                backgroundColor: '#faf8f5',
                borderRadius: '16px',
                textAlign: 'left',
                border: '1px solid #d4b896',
                boxShadow: '0 4px 12px rgba(139, 69, 19, 0.1)',
                transition: 'all 0.3s ease',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'linear-gradient(45deg, transparent 0%, rgba(139, 69, 19, 0.05) 50%, transparent 100%)',
                  transform: 'translateX(-100%)',
                  transition: 'transform 0.6s ease'
                }} />
                <Title level={4} style={{ color: '#8B4513', marginBottom: '10px', fontSize: '16px', position: 'relative', zIndex: 1 }}>
                  🧬 演化研究
                </Title>
                <Text style={{ color: '#5d4e37', fontSize: '14px', lineHeight: '1.5', position: 'relative', zIndex: 1 }}>
                  「请分析恐龙向鸟类演化的关键证据和过渡化石」
                </Text>
              </div>
            </div>
            
            {/* 按钮区域 */}
            <div style={{ textAlign: 'center' }}>
              <Button 
                type="primary" 
                size="large" 
                onClick={handleNewSession} 
                style={{ 
                  height: '52px',
                  fontSize: '17px',
                  padding: '0 40px',
                  borderRadius: '26px',
                  background: 'linear-gradient(135deg, #8B4513 0%, #A0522D 50%, #8B4513 100%)',
                  border: 'none',
                  boxShadow: '0 6px 20px rgba(139, 69, 19, 0.3)',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px) scale(1.02)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(139, 69, 19, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(139, 69, 19, 0.3)';
                }}
              >
                <span style={{ position: 'relative', zIndex: 1 }}>🚀 开始探索古生物世界</span>
              </Button>
            </div>
          </div>
          
          {/* CSS动画样式 */}
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            
            @keyframes slideUp {
              from { 
                opacity: 0;
                transform: translateY(30px);
              }
              to { 
                opacity: 1;
                transform: translateY(0);
              }
            }
            
            @keyframes float {
              0%, 100% { transform: translateY(0px) rotate(0deg); }
              50% { transform: translateY(-20px) rotate(180deg); }
            }
            
            @keyframes dinoFloat {
              0%, 100% { transform: translateY(0px); }
              50% { transform: translateY(-15px); }
            }
            
            @keyframes dinoRotate {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            
            @keyframes dinoWiggle {
              0% { transform: rotate(-10deg) scale(1); }
              100% { transform: rotate(-5deg) scale(1.1); }
            }
            
            @keyframes pulse {
              0%, 100% { transform: scale(1); opacity: 0.8; }
              50% { transform: scale(1.1); opacity: 1; }
            }
            
            @keyframes titleGlow {
              from { text-shadow: 2px 2px 4px rgba(139, 69, 19, 0.1); }
              to { text-shadow: 2px 2px 8px rgba(139, 69, 19, 0.2), 0 0 10px rgba(139, 69, 19, 0.1); }
            }
            
            /* 卡片悬停效果 */
            div[style*="cursor: pointer"]:hover {
              transform: translateY(-5px) !important;
              box-shadow: 0 8px 25px rgba(139, 69, 19, 0.2) !important;
            }
            
            div[style*="cursor: pointer"]:hover > div {
              transform: translateX(0%) !important;
            }
            
            /* 指南区域悬停效果 */
            div[style*="cursor: default"]:hover {
              transform: scale(1.02) !important;
              box-shadow: 0 6px 20px rgba(139, 69, 19, 0.12) !important;
            }
            
            div[style*="cursor: default"]:hover li {
              color: #8B4513 !important;
            }
          `}</style>
        </div>
      )}

      {/* Token设置弹窗 */}
      <Modal
        title="访问令牌设置"
        open={tokenModalVisible}
        onOk={handleTokenSubmit}
        onCancel={() => setTokenModalVisible(false)}
      >
        <Form form={form} layout="vertical" initialValues={{ token, useRag, useCommonRag }}>
          <Form.Item
            name="token"
            label="访问令牌"
            rules={[{ required: true, message: '请输入访问令牌' }]}
          >
            <Input.Password placeholder="请输入访问令牌" />
          </Form.Item>
          <Form.Item name="useRag" valuePropName="checked">
            <Switch /> 启用RAG检索
          </Form.Item>
          <Form.Item name="useCommonRag" valuePropName="checked">
            <Switch /> 启用通用RAG
          </Form.Item>
        </Form>
      </Modal>

      {/* RAG检索结果抽屉 */}
      <Drawer
        title="知识库检索结果"
        placement="right"
        onClose={() => setRagDrawerVisible(false)}
        open={ragDrawerVisible}
        width={600}
      >
        <RagResults
          results={ragResults}
          loading={ragLoading}
          onSearch={handleKnowledgeBaseSearch}
        />
      </Drawer>
    </Layout>
  );
};

export default ChatPage;
