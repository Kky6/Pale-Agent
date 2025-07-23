import React from 'react';
import { Card, Typography, List, Tag, Space, Divider } from 'antd';
import { FileTextOutlined, UserOutlined, CalendarOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import type { RagResult } from '../types';

const { Title, Text, Paragraph } = Typography;

const ResultCard = styled(Card)`
  margin-bottom: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: transform 0.3s;
  
  &:hover {
    transform: translateY(-2px);
  }
`;

const ContentPreview = styled(Paragraph)`
  margin-bottom: 0;
  font-size: 14px;
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
}

const RagResults: React.FC<RagResultsProps> = ({ results, loading }) => {
  return (
    <List
      loading={loading}
      dataSource={results}
      renderItem={([result, score]) => (
        <ResultCard>
          <Title level={5}>{result.metadata.title || '未命名文档'}</Title>
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
            <Tag color="blue">相关度: {(score * 100).toFixed(2)}%</Tag>
          </Space>
          <ContentPreview ellipsis={{ rows: 3, expandable: true, symbol: '展开' }}>
            {result.page_content}
          </ContentPreview>
        </ResultCard>
      )}
      locale={{ emptyText: '暂无检索结果' }}
    />
  );
};

export default RagResults;