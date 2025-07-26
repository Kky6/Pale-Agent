import React from 'react';
import { Typography, Spin, Space } from 'antd';
import ReactMarkdown from 'react-markdown';
import styled from 'styled-components';
import type { Message } from '../types';

const { Text } = Typography;

const MessageContainer = styled.div<{ role: string }>`
  display: flex;
  margin-bottom: 24px;
  flex-direction: ${props => props.role === 'user' ? 'row-reverse' : 'row'};
  align-items: flex-start;
`;

const Avatar = styled.div<{ role: string }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: ${props => props.role === 'user' ? '#1890ff' : '#f56a00'};
  color: white;
  font-weight: bold;
  margin: ${props => props.role === 'user' ? '0 0 0 12px' : '0 12px 0 0'};
  flex-shrink: 0;
`;

const MessageContent = styled.div<{ role: string }>`
  max-width: 80%;
  padding: 12px 16px;
  border-radius: 8px;
  background-color: ${props => props.role === 'user' ? '#e6f7ff' : '#f5f5f5'};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  
  p {
    margin: 0 0 8px;
    &:last-child {
      margin-bottom: 0;
    }
  }
  
  pre {
    margin: 8px 0;
    padding: 12px;
    border-radius: 4px;
    background-color: #f0f2f5;
    overflow-x: auto;
  }
  
  code {
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
    font-size: 0.9em;
    padding: 0.2em 0.4em;
    border-radius: 3px;
    background-color: rgba(0, 0, 0, 0.06);
  }
`;

const TimeStamp = styled(Text)`
  font-size: 12px;
  color: #999;
  margin-top: 4px;
  display: block;
`;

interface ChatMessageProps {
  message: Message;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  // 处理思考过程和回复内容的分离显示
  const processMessageContent = (content: string) => {
    // 检查是否包含思考过程 - 修复正则表达式
    const thinkingMatch = content.match(/(> 💭 \*\*思考过程：\*\*[\s\S]*?)\n\n---\n\n([\s\S]*)/); 
    
    if (thinkingMatch) {
      const thinkingSection = thinkingMatch[1];
      const answerSection = thinkingMatch[2];
      
      return (
        <div>
          <div style={{ 
            color: '#666', 
            fontSize: '0.9em', 
            lineHeight: '1.5',
            marginBottom: '16px',
            padding: '12px 16px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            borderLeft: '4px solid #1677ff',
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap'
          }}>
            <ReactMarkdown>{thinkingSection}</ReactMarkdown>
          </div>
          {answerSection && (
            <div>
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p style={{ margin: '10px 0', lineHeight: '1.6', wordBreak: 'break-word' }}>{children}</p>,
                  pre: ({ children }) => (
                    <pre style={{
                      backgroundColor: '#f6f8fa',
                      padding: '16px',
                      borderRadius: '8px',
                      overflow: 'auto',
                      fontSize: '0.9em',
                      marginBottom: '16px',
                      border: '1px solid #e1e4e8'
                    }}>
                      {children}
                    </pre>
                  ),
                  code: ({ children, className, ...props }) => {
                    const isInline = !className?.includes('language-');
                    
                    if (isInline) {
                      return (
                        <code
                          style={{
                            backgroundColor: '#f6f8fa',
                            padding: '3px 5px',
                            borderRadius: '4px',
                            fontSize: '0.9em',
                            fontFamily: 'Monaco, Consolas, "Courier New", monospace'
                          }}
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    }
                    
                    return (
                      <code
                        style={{
                          display: 'block',
                          fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                          fontSize: '0.9em',
                          overflowX: 'auto',
                          padding: '0.5em',
                          backgroundColor: '#282c34',
                          color: '#abb2bf',
                          borderRadius: '4px'
                        }}
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  }
                }}
              >
                {answerSection}
              </ReactMarkdown>
            </div>
          )}
        </div>
      );
    }
    
    // 如果没有思考过程，正常渲染完整内容
    return (
      <ReactMarkdown
        components={{
          p: ({ children }) => <p style={{ margin: '10px 0', lineHeight: '1.6', wordBreak: 'break-word' }}>{children}</p>,
          pre: ({ children }) => (
            <pre style={{
              background: '#f0f2f5', 
              padding: '12px', 
              borderRadius: '4px', 
              overflowX: 'auto',
              marginBottom: '16px'
            }}>
              {children}
            </pre>
          ),
          code: ({ children, className, ...props }) => {
            const isInline = !className?.includes('language-');
            
            if (isInline) {
              return (
                <code style={{
                  background: 'rgba(0, 0, 0, 0.06)', 
                  padding: '0.2em 0.4em', 
                  borderRadius: '3px',
                  fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
                  fontSize: '0.9em'
                }} {...props}>
                  {children}
                </code>
              );
            }
            
            return (
              <code style={{
                display: 'block',
                fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
                fontSize: '0.9em',
                overflowX: 'auto',
                padding: '0.5em',
                backgroundColor: '#282c34',
                color: '#abb2bf',
                borderRadius: '3px'
              }} {...props}>
                {children}
              </code>
            );
          }
        }}
      >
        {content}
      </ReactMarkdown>
    );
  };

  return (
    <MessageContainer role={message.role}>
      <Avatar 
        role={message.role}
        style={{ 
          backgroundColor: message.role === 'user' ? '#1677ff' : '#f56a00',
        }}
      >
        {message.role === 'user' ? 'U' : 'AI'}
      </Avatar>
      <MessageContent role={message.role}>
        {message.isLoading ? (
          <Space>
            <Spin size="small" />
            <Text style={{ color: message.role === 'user' ? '#fff' : 'inherit' }}>思考中...</Text>
          </Space>
        ) : (
          processMessageContent(message.content)
        )}
        <TimeStamp type="secondary">{formatTime(message.timestamp)}</TimeStamp>
      </MessageContent>
    </MessageContainer>
  );
};

export default ChatMessage;