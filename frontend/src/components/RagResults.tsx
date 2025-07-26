import React from 'react';
import { Card, Typography, List, Tag, Space, Divider, Button, Progress } from 'antd';
import { FileTextOutlined, UserOutlined, CalendarOutlined, CopyOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import type { RagResult } from '../types';

const { Title, Text, Paragraph } = Typography;

const ResultCard = styled(Card)`
  margin-bottom: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

const ContentPreview = styled(Paragraph)`
  margin-bottom: 0;
  font-size: 14px;
  line-height: 1.6;
`;

const MetadataItem = styled(Text)`
  margin-right: 16px;
  display: inline-flex;
  align-items: center;
  font-size: 13px;
  color: #8c8c8c;
  
  .anticon {
    margin-right: 4px;
  }
`;

interface RagResultsProps {
  results: [RagResult, number][];
  loading?: boolean;
  onSearch?: (query?: string) => Promise<void>;
}

const RagResults: React.FC<RagResultsProps> = ({ results, loading, onSearch }) => {
  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'green';
    if (score >= 0.6) return 'blue';
    if (score >= 0.4) return 'orange';
    return 'red';
  };

  const handleCopyContent = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  return (
    <div>
      {results.length > 0 && (
        <div style={{ marginBottom: 16, padding: '12px 16px', background: '#f6ffed', borderRadius: 8 }}>
          <Text strong>找到 {results.length} 条相关结果</Text>
          <Progress 
            percent={Math.round((results.filter(([, score]) => score > 0.6).length / results.length) * 100)}
            size="small"
            status="active"
            style={{ marginTop: 8 }}
            format={(percent) => `高相关度: ${percent}%`}
          />
        </div>
      )}
      
      <List
        loading={loading}
        dataSource={results}
        renderItem={([result, score]) => (
          <ResultCard>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <Title level={5} style={{ margin: 0, flex: 1 }}>
                {result.metadata.title || '未命名文档'}
              </Title>
              <Tag color={getScoreColor(score)}>
                {(score * 100).toFixed(1)}%
              </Tag>
            </div>
            
            <Space split={<Divider type="vertical" />} style={{ marginBottom: 12 }}>
              <MetadataItem>
                <FileTextOutlined /> {result.metadata.section || '未知章节'}
              </MetadataItem>
              {result.metadata.authors && result.metadata.authors.length > 0 && (
                <MetadataItem>
                  <UserOutlined /> {result.metadata.authors.join(', ')}
                </MetadataItem>
              )}
              {result.metadata.year && (
                <MetadataItem>
                  <CalendarOutlined /> {result.metadata.year}
                </MetadataItem>
              )}
            </Space>
            
            <ContentPreview ellipsis={{ rows: 6, expandable: true, symbol: '展开完整内容' }}>
              {result.page_content}
            </ContentPreview>
            
            <div style={{ marginTop: 12, textAlign: 'right' }}>
              <Button 
                size="small" 
                icon={<CopyOutlined />}
                onClick={() => handleCopyContent(result.page_content)}
              >
                复制内容
              </Button>
            </div>
          </ResultCard>
        )}
        locale={{ emptyText: '暂无检索结果，请在上方搜索框中输入关键词' }}
      />
    </div>
  );
};

export default RagResults;