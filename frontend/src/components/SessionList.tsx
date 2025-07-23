import React from 'react';
import { List, Button, Typography, Divider } from 'antd';
import { PlusOutlined, MessageOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import type { Session } from '../types';

const { Text } = Typography;

const SessionContainer = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f0f5ff;
  border-radius: 0 8px 8px 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const SessionHeader = styled.div`
  padding: 16px;
  background-color: #fff;
  border-bottom: 1px solid #e6f0ff;
  border-radius: 0 8px 0 0;
`;

const SessionItem = styled(List.Item)<{ active?: boolean }>`
  padding: 12px 16px;
  cursor: pointer;
  transition: all 0.3s;
  border-radius: 6px;
  margin: 8px 12px;
  background-color: ${props => props.active ? '#e6f7ff' : 'transparent'};
  border: ${props => props.active ? '1px solid #91d5ff' : '1px solid transparent'};
  box-shadow: ${props => props.active ? '0 2px 6px rgba(24, 144, 255, 0.1)' : 'none'};
  
  &:hover {
    background-color: ${props => props.active ? '#e6f7ff' : '#f0f0f0'};
    transform: translateY(-2px);
  }
`;

const SessionTitle = styled(Text)`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #333;
`;

const SessionTime = styled(Text)`
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 4px;
`;

interface SessionListProps {
  sessions: Session[];
  activeSessionId?: string;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
}

const SessionList: React.FC<SessionListProps> = ({ 
  sessions, 
  activeSessionId, 
  onSelectSession, 
  onNewSession 
}) => {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  };

  return (
    <SessionContainer>
      <SessionHeader>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={onNewSession}
          block
        >
          新建会话
        </Button>
      </SessionHeader>
      <Divider style={{ margin: '0 0 16px' }} />
      <List
        dataSource={sessions}
        renderItem={(session) => (
          <SessionItem 
            active={session.id === activeSessionId}
            onClick={() => onSelectSession(session.id)}
          >
            <List.Item.Meta
              avatar={<MessageOutlined />}
              title={<SessionTitle strong={session.id === activeSessionId}>{session.title}</SessionTitle>}
              description={<SessionTime type="secondary">{formatDate(session.updatedAt)}</SessionTime>}
            />
          </SessionItem>
        )}
        style={{ overflow: 'auto', flex: 1 }}
        locale={{ emptyText: '暂无会话' }}
      />
    </SessionContainer>
  );
};

export default SessionList;