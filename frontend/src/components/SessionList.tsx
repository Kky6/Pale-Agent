import React from 'react';
import { List, Button, Typography, Space, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, MessageOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import type { Session } from '../types';

const { Text } = Typography;

interface SessionListProps {
  sessions: Session[];
  activeSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
}

const SessionContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  backdrop-filter: blur(10px);
`;

const HeaderContainer = styled.div`
  padding: 20px;
  background: rgba(255, 255, 255, 0.9);
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
  backdrop-filter: blur(10px);
`;

const ListContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(226, 232, 240, 0.3);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: rgba(148, 163, 184, 0.5);
    border-radius: 3px;
    
    &:hover {
      background: rgba(148, 163, 184, 0.7);
    }
  }
`;

const SessionItem = styled.div<{ active: boolean }>`
  padding: 16px;
  margin-bottom: 8px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  background: ${props => props.active 
    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
    : 'rgba(255, 255, 255, 0.8)'};
  border: 1px solid ${props => props.active 
    ? 'rgba(102, 126, 234, 0.3)' 
    : 'rgba(226, 232, 240, 0.6)'};
  box-shadow: ${props => props.active 
    ? '0 8px 32px rgba(102, 126, 234, 0.3)' 
    : '0 2px 8px rgba(0, 0, 0, 0.04)'};
  
  &:hover {
    transform: translateY(-2px);
    background: ${props => props.active 
      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
      : 'rgba(255, 255, 255, 0.95)'};
    box-shadow: ${props => props.active 
      ? '0 12px 40px rgba(102, 126, 234, 0.4)' 
      : '0 8px 24px rgba(0, 0, 0, 0.1)'};
    border-color: ${props => props.active 
      ? 'rgba(102, 126, 234, 0.5)' 
      : 'rgba(148, 163, 184, 0.3)'};
    
    .delete-btn {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  .delete-btn {
    opacity: 0;
    transform: scale(0.8);
    transition: all 0.2s ease;
  }
`;

const SessionHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 8px;
`;

const SessionIcon = styled.div<{ active: boolean }>`
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  background: ${props => props.active 
    ? 'rgba(255, 255, 255, 0.2)' 
    : 'rgba(102, 126, 234, 0.1)'};
  color: ${props => props.active ? '#fff' : '#667eea'};
  font-size: 14px;
  transition: all 0.3s ease;
`;

const SessionTitle = styled(Typography.Text)<{ active: boolean }>`
  flex: 1;
  font-weight: 600;
  font-size: 14px;
  color: ${props => props.active ? '#fff' : '#1e293b'} !important;
  line-height: 1.4;
`;

const SessionMeta = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
`;

const SessionTime = styled(Typography.Text)<{ active: boolean }>`
  font-size: 12px;
  color: ${props => props.active ? 'rgba(255, 255, 255, 0.8)' : '#64748b'} !important;
`;

const MessageCount = styled.div<{ active: boolean }>`
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
  background: ${props => props.active 
    ? 'rgba(255, 255, 255, 0.2)' 
    : 'rgba(102, 126, 234, 0.1)'};
  color: ${props => props.active ? '#fff' : '#667eea'};
  font-weight: 500;
`;

const DeleteButton = styled(Button)<{ active: boolean }>`
  position: absolute;
  top: 12px;
  right: 12px;
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.2s ease;
  width: 28px;
  height: 28px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: ${props => props.active ? 'rgba(255, 255, 255, 0.2)' : '#fff'} !important;
  border: 1px solid ${props => props.active ? 'rgba(255, 77, 79, 0.3)' : 'rgba(226, 232, 240, 0.6)'} !important;
  
  &:hover {
    background: #ff4d4f !important;
    border-color: #ff4d4f !important;
    
    .anticon {
      color: #fff !important;
    }
  }
  
  .anticon {
    color: #ff4d4f;
    font-size: 12px;
  }
`;

const NewSessionButton = styled(Button)`
  height: 48px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 14px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  border: none !important;
  color: #fff !important;
  box-shadow: 0 4px 16px rgba(102, 126, 234, 0.3);
  
  &:hover {
    background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%) !important;
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  .anticon {
    color: #fff;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: #64748b;
`;

const EmptyIcon = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(102, 126, 234, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px;
  font-size: 24px;
  color: #667eea;
`;

const SessionList: React.FC<SessionListProps> = ({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession
}) => {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) {
      return '刚刚';
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}分钟前`;
    } else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}小时前`;
    } else if (diff < 86400000 * 7) {
      return `${Math.floor(diff / 86400000)}天前`;
    } else {
      return date.toLocaleDateString('zh-CN', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    console.log('删除会话:', sessionId); // 添加调试日志
  };

  const handleConfirmDelete = (sessionId: string) => {
    console.log('确认删除会话:', sessionId); // 添加调试日志
    onDeleteSession(sessionId);
  };

  return (
    <SessionContainer>
      <HeaderContainer>
        <NewSessionButton 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={onNewSession}
          block
        >
          新建会话
        </NewSessionButton>
      </HeaderContainer>
      
      <ListContainer>
        {sessions.map((session) => {
          const isActive = session.id === activeSessionId;
          const messageCount = session.messages?.length || 0;
          
          return (
            <SessionItem
              key={session.id}
              active={isActive}
              onClick={() => onSelectSession(session.id)}
            >
              <SessionHeader>
                <SessionIcon active={isActive}>
                  <MessageOutlined />
                </SessionIcon>
                <SessionTitle 
                  active={isActive}
                  ellipsis={{ tooltip: session.title }}
                >
                  {session.title}
                </SessionTitle>
              </SessionHeader>
              
              <SessionMeta>
                <SessionTime active={isActive}>
                  {formatTime(session.updatedAt)}
                </SessionTime>
                {messageCount > 0 && (
                  <MessageCount active={isActive}>
                    {messageCount} 条消息
                  </MessageCount>
                )}
              </SessionMeta>
              
              <Popconfirm
                title="删除会话"
                description="确定要删除这个会话吗？删除后无法恢复。"
                onConfirm={() => handleConfirmDelete(session.id)}
                okText="确定"
                cancelText="取消"
                placement="left"
              >
                <DeleteButton
                  active={isActive}
                  className="delete-btn"
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={(e) => handleDeleteClick(e, session.id)}
                  title="删除会话"
                />
              </Popconfirm>
            </SessionItem>
          );
        })}
        
        {sessions.length === 0 && (
          <EmptyState>
            <EmptyIcon>
              <MessageOutlined />
            </EmptyIcon>
            <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '16px', fontWeight: 500 }}>
              暂无会话
            </Text>
            <br />
            <Text style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
              点击上方按钮创建新会话
            </Text>
          </EmptyState>
        )}
      </ListContainer>
    </SessionContainer>
  );
};

export default SessionList;