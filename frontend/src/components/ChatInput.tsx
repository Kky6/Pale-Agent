import React, { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Input, Button, Space, Tooltip } from 'antd';
import { SendOutlined, SearchOutlined } from '@ant-design/icons';
import styled from 'styled-components';

const { TextArea } = Input;

const InputContainer = styled.div`
  position: sticky;
  bottom: 0;
  background-color: #fff;
  padding: 16px 0;
  border-top: 1px solid #f0f0f0;
  z-index: 10;
`;

const StyledTextArea = styled(Input.TextArea)`
  border-radius: 8px;
  resize: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
  
  &.ant-input {
    padding: 12px 16px;
    font-size: 14px;
    line-height: 1.6;
    min-height: 40px;
  }
  
  &:focus {
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
  }
`;

// 创建统一的按钮基础样式
const BaseButton = styled(Button)`
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s ease;
  padding: 0 16px;
  
  &:hover {
    transform: translateY(-1px);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const RagButton = styled(BaseButton)`
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
  
  &:hover {
    background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }
  
  &:disabled {
    background: #f5f5f5;
    color: #bfbfbf;
    transform: none;
    box-shadow: none;
  }
`;

const SendButton = styled(BaseButton)`
  background: #1677ff;
  border: 1px solid #1677ff;
  color: white;
  
  &:hover {
    background: #4096ff;
    border-color: #4096ff;
    color: white;
    box-shadow: 0 4px 12px rgba(22, 119, 255, 0.3);
  }
  
  &:disabled {
    background: #f5f5f5;
    border-color: #d9d9d9;
    color: #bfbfbf;
    transform: none;
    box-shadow: none;
  }
`;

interface ChatInputProps {
  onSend: (message: string) => void;
  onSearch?: (query: string) => void;
  onInputChange?: (value: string) => void;
  loading?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, onSearch, onInputChange, loading = false }) => {
  const [message, setMessage] = useState('');

  const handleMessageChange = (value: string) => {
    setMessage(value);
    if (onInputChange) {
      onInputChange(value);
    }
  };

  const handleSend = () => {
    if (message.trim() && !loading) {
      onSend(message);
      setMessage('');
    }
  };

  const handleRagSearch = () => {
    if (message.trim() && !loading && onSearch) {
      onSearch(message);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <InputContainer>
      <Space.Compact style={{ width: '100%', display: 'flex', alignItems: 'stretch' }}>
        <StyledTextArea
          value={message}
          onChange={(e) => handleMessageChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入问题，使用RAG检索获得更准确的答案..."
          autoSize={{ minRows: 1, maxRows: 4 }}
          disabled={loading}
          style={{ flex: 1 }}
        />
        {onSearch && (
          <Tooltip title="RAG智能检索 - 基于知识库提供精准答案">
            <RagButton 
              icon={<SearchOutlined />} 
              onClick={handleRagSearch}
              disabled={!message.trim() || loading}
              style={{ marginLeft: 8 }}
            >
              RAG检索
            </RagButton>
          </Tooltip>
        )}
        <SendButton 
          icon={<SendOutlined />} 
          onClick={handleSend} 
          disabled={!message.trim() || loading}
          style={{ marginLeft: 8 }}
        >
          发送
        </SendButton>
      </Space.Compact>
    </InputContainer>
  );
};

export default ChatInput;