import React, { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Input, Button, Space } from 'antd';
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
  }
  
  &:focus {
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
  }
`;

interface ChatInputProps {
  onSend: (message: string) => void;
  onSearch?: (query: string) => void;
  loading?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSend, onSearch, loading = false }) => {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim() && !loading) {
      onSend(message);
      setMessage('');
    }
  };

  const handleSearch = () => {
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
      <Space.Compact style={{ width: '100%' }}>
        <StyledTextArea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息..."
          autoSize={{ minRows: 1, maxRows: 4 }}
          disabled={loading}
        />
        {onSearch && (
          <Button 
            icon={<SearchOutlined />} 
            onClick={handleSearch} 
            disabled={!message.trim() || loading}
            style={{ marginLeft: 8 }}
          >
            检索
          </Button>
        )}
        <Button 
          type="primary" 
          icon={<SendOutlined />} 
          onClick={handleSend} 
          disabled={!message.trim() || loading}
          style={{ marginLeft: 8 }}
        >
          发送
        </Button>
      </Space.Compact>
    </InputContainer>
  );
};

export default ChatInput;