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
import type { Session } from '../types';
import type { Message } from '../types';

const { Title, Text } = Typography;

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
        
        setSessions([newSession, ...sessions]);
        setActiveSessionId(newSession.id);
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
    setActiveSessionId(sessionId);
  };

  const handleSendMessage = async (content: string) => {
    if (!activeSessionId) {
      message.warning('请先创建会话');
      return;
    }
  
    // 添加用户消息
    const userMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content,
      timestamp: Date.now()
    };
  
    // 添加临时的AI消息（加载中）
    const tempAiMessage: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isLoading: true
    };
    
    const updatedMessages = [...messages, userMessage, tempAiMessage];
    setMessages(updatedMessages);
  
    // 更新会话
    const updatedSessions = sessions.map(session => {
      if (session.id === activeSessionId) {
        return {
          ...session,
          messages: updatedMessages,
          updatedAt: Date.now()
        };
      }
      return session;
    });
    setSessions(updatedSessions);
  
    try {
      setLoading(true);
      let accumulatedData = ''; // 累积所有原始数据
      let lastThinkingContent = '';
      let lastMarkdownContent = '';
      let updateTimer: ReturnType<typeof setTimeout> | null = null; // 防抖定时器
  
      await sendMessage(content, activeSessionId, model, {
        onData: (data) => {
          try {
            if (typeof data === 'string') {
              // 累积所有数据，移除可能的引号
              accumulatedData += data.replace(/^"|"\$/g, '');
              
              // 清除之前的定时器
              if (updateTimer) {
                clearTimeout(updateTimer);
              }
              
              // 设置防抖定时器，避免频繁更新UI
              updateTimer = setTimeout(() => {
                // 尝试提取完整的markdown标签内容
                const markdownMatches = accumulatedData.match(/<markdown>([^<]*)<\/markdown>/g);
                if (markdownMatches && markdownMatches.length > 0) {
                  // 处理最新的markdown内容
                  const latestMatch = markdownMatches[markdownMatches.length - 1];
                  const markdownContent = latestMatch.match(/<markdown>([^<]*)<\/markdown>/)?.[1];
                  
                  if (markdownContent) {
                    try {
                      // 更严格的URI编码完整性检查
                      const hasIncompleteEncoding = /%(?![0-9A-Fa-f]{2})/g.test(markdownContent) || 
                                                   /%[0-9A-Fa-f]$/g.test(markdownContent);
                      
                      if (hasIncompleteEncoding) {
                        // URI编码不完整，跳过这次处理
                        console.log('URI编码不完整，等待更多数据');
                        return;
                      }
                      
                      // 尝试解码，如果失败则使用原始内容
                      let decodedContent;
                      try {
                        decodedContent = decodeURIComponent(markdownContent);
                      } catch (decodeError) {
                        console.warn('URI解码失败，使用原始内容:', decodeError);
                        decodedContent = markdownContent;
                      }
                      
                      // 尝试解析JSON
                      let jsonContent;
                      try {
                        jsonContent = JSON.parse(decodedContent);
                      } catch (jsonError) {
                        console.warn('JSON解析失败，使用文本内容:', jsonError);
                        // 如果不是有效的JSON，直接显示文本内容
                        setMessages(prevMessages => 
                          prevMessages.map(msg => 
                            msg.id === tempAiMessage.id 
                              ? { ...msg, content: decodedContent, isLoading: false }
                              : msg
                          )
                        );
                        return;
                      }
                      
                      if (Array.isArray(jsonContent)) {
                        let currentThinking = '';
                        let currentMarkdown = '';
                        
                        jsonContent.forEach(item => {
                          if (item && item.type === 'Thinking') {
                            // 处理思考过程
                            if (item.content && item.content.content) {
                              try {
                                // 尝试解码思考内容
                                let thinkingText;
                                try {
                                  thinkingText = decodeURIComponent(item.content.content);
                                } catch (thinkingDecodeError) {
                                  console.warn('思考内容解码失败:', thinkingDecodeError);
                                  thinkingText = item.content.content;
                                }
                                
                                // 格式化思考文本
                                thinkingText = thinkingText
                                  .replace(/\\n/g, ' ')  // 将\n替换为空格
                                  .replace(/\n/g, ' ')   // 将换行符替换为空格
                                  .trim();               // 去除首尾空格
                                  
                                const status = item.content.status || 'running';
                                const time = item.content.time || '';
                                
                                if (status === 'running') {
                                  currentThinking = `🤔 思考中... ${time}\n${thinkingText}`;
                                } else {
                                  currentThinking = `💭 思考过程 ${time}\n${thinkingText}`;
                                }
                              } catch (thinkingError) {
                                console.warn('处理思考内容失败:', thinkingError);
                                // 如果处理失败，尝试直接使用原始内容
                                const rawContent = item.content.content || '';
                                currentThinking = `💭 思考过程\n${rawContent}`;
                              }
                            }
                          } else if (item && item.type === 'MarkDown') {
                            // 处理回复内容
                            if (item.content) {
                              try {
                                // 尝试解码回复内容
                                let markdownText;
                                try {
                                  markdownText = decodeURIComponent(item.content);
                                } catch (markdownDecodeError) {
                                  console.warn('回复内容解码失败:', markdownDecodeError);
                                  markdownText = item.content;
                                }
                                
                                currentMarkdown = markdownText
                                  .replace(/\\n/g, '\n')  // 保留回复内容的换行
                                  .trim();
                              } catch (markdownError) {
                                console.warn('处理回复内容失败:', markdownError);
                                currentMarkdown = item.content;
                              }
                            }
                          }
                        });
                        
                        // 只有当内容真正发生变化时才更新UI
                        if (currentThinking !== lastThinkingContent || currentMarkdown !== lastMarkdownContent) {
                          lastThinkingContent = currentThinking;
                          lastMarkdownContent = currentMarkdown;
                          
                          let displayContent = '';
                          if (currentThinking) {
                            displayContent += currentThinking;
                          }
                          if (currentMarkdown) {
                            if (displayContent) displayContent += '\n\n---\n\n';
                            displayContent += currentMarkdown;
                          }
                          
                          if (displayContent) {
                            setMessages(prevMessages => 
                              prevMessages.map(msg => 
                                msg.id === tempAiMessage.id 
                                  ? { 
                                      ...msg, 
                                      content: displayContent, 
                                      isLoading: currentThinking.includes('思考中') && !currentMarkdown
                                    }
                                  : msg
                              )
                            );
                          }
                        }
                      }
                    } catch (parseError) {
                      // 解析失败，可能是数据还不完整，继续等待更多数据
                      console.warn('解析数据失败，等待更多数据:', (parseError as Error).message);
                    }
                  }
                }
              }, 200); // 增加防抖时间，减少UI更新频率
            } else if (data && typeof data === 'object') {
              if (data.content) {
                setMessages(prevMessages => 
                  prevMessages.map(msg => 
                    msg.id === tempAiMessage.id 
                      ? { ...msg, content: data.content, isLoading: false }
                      : msg
                  )
                );
              }
            }
          } catch (error) {
            console.error('处理响应数据错误:', error);
          }
        },
          onError: (error) => {
            console.error('发送消息错误:', error);
            message.error('发送消息失败，请重试');
            
            setMessages(prevMessages => 
              prevMessages.map(msg => 
                msg.id === tempAiMessage.id 
                  ? { ...msg, content: '抱歉，发送消息时出现错误，请重试。', isLoading: false }
                  : msg
              )
            );
          },
          onComplete: () => {
            setLoading(false);
            
            // 完成时移除加载状态
            setMessages(prevMessages => {
              const updatedMessages = prevMessages.map(msg => 
                msg.id === tempAiMessage.id 
                  ? { ...msg, isLoading: false }
                  : msg
              );
              
              // 同时更新会话
              const finalSessions = sessions.map(session => {
                if (session.id === activeSessionId) {
                  return {
                    ...session,
                    messages: updatedMessages,
                    updatedAt: Date.now()
                  };
                }
                return session;
              });
              setSessions(finalSessions);
              
              return updatedMessages;
            });
          }
        });
      } catch (error) {
        console.error('发送消息错误:', error);
        message.error('发送消息失败，请重试');
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

    const handleRagSearch = async (query: string) => {
      try {
        setRagLoading(true);
        setRagDrawerVisible(true);
        
        const response = await ragSearch(query);
        if (response.code === '00000' && response.data && response.data.final) {
          setRagResults(response.data.final);
        } else {
          message.error(`检索失败: ${response.msg}`);
          setRagResults([]);
        }
      } catch (error) {
        console.error('RAG检索错误:', error);
        message.error('检索失败，请重试');
        setRagResults([]);
      } finally {
        setRagLoading(false);
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
          />
        }
        header={
          <HeaderContainer>
            <Title level={4} style={{ margin: 0 }}>GeoGPT 聊天</Title>
            <ControlsContainer>
              <ModelSelector
                value={model}
                onChange={handleModelChange}
                disabled={loading}
              />
              <Button
                icon={<SearchOutlined />}
                onClick={() => setRagDrawerVisible(true)}
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
                loading={loading}
              />
            </InputContainer>
          </>
        ) : (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            maxWidth: '800px',
            margin: '0 auto',
            backgroundColor: '#fff',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
          }}>
            <Title level={2} style={{ marginBottom: '24px', color: '#1677ff' }}>欢迎使用 GeoGPT 聊天</Title>
            
            <div style={{ 
              marginBottom: '40px', 
              padding: '20px', 
              backgroundColor: '#f0f7ff',
              borderRadius: '8px',
              textAlign: 'left'
            }}>
              <Title level={4}>使用指南：</Title>
              <ul style={{ textAlign: 'left', lineHeight: '2' }}>
                <li>点击下方的<strong>创建新会话</strong>按钮开始一个新的对话</li>
                <li>您可以询问任何地理相关的问题，GeoGPT 将为您提供专业解答</li>
                <li>使用知识库功能可以检索相关的专业资料</li>
                <li>对话过程中会显示 AI 的思考过程，帮助您理解回答的推理过程</li>
              </ul>
            </div>
            
            <div style={{ 
              marginBottom: '40px',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '20px'
            }}>
              <div style={{ 
                width: '280px', 
                padding: '20px', 
                backgroundColor: '#f9f9f9',
                borderRadius: '8px',
                textAlign: 'left',
                border: '1px solid #eee'
              }}>
                <Title level={5}>地理数据分析</Title>
                <Text>「请帮我分析中国西部地区的地形特点及其对气候的影响」</Text>
              </div>
              
              <div style={{ 
                width: '280px', 
                padding: '20px', 
                backgroundColor: '#f9f9f9',
                borderRadius: '8px',
                textAlign: 'left',
                border: '1px solid #eee'
              }}>
                <Title level={5}>地质知识咨询</Title>
                <Text>「请解释板块构造理论及其对地震活动的影响」</Text>
              </div>
            </div>
            
            <Button 
              type="primary" 
              size="large" 
              onClick={handleNewSession} 
              style={{ 
                marginTop: '16px',
                height: '48px',
                fontSize: '16px',
                padding: '0 32px'
              }}
            >
              创建新会话
            </Button>
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
              <Input.Password placeholder="请输入GeoGPT访问令牌" />
            </Form.Item>
            <Form.Item name="useRag" valuePropName="checked" label="个人知识库RAG">
              <Switch />
            </Form.Item>
            <Form.Item name="useCommonRag" valuePropName="checked" label="公共知识库RAG">
              <Switch />
            </Form.Item>
          </Form>
        </Modal>

        {/* RAG检索结果抽屉 */}
        <Drawer
          title="知识库检索结果"
          placement="right"
          width={400}
          onClose={() => setRagDrawerVisible(false)}
          open={ragDrawerVisible}
        >
          <RagResults results={ragResults} loading={ragLoading} />
        </Drawer>
      </Layout>
    );
  };

  export default ChatPage;