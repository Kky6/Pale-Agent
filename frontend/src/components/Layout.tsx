import React from 'react';
import styled from 'styled-components';

const StyledLayout = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  overflow: hidden;
  background-color: #f5f5f5;
`;

const StyledHeader = styled.div`
  height: 64px;
  background-color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  padding: 0 24px;
  z-index: 10;
  position: sticky;
  top: 0;
`;

const MainContainer = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
  padding: 16px;
  gap: 16px;
`;

const StyledSider = styled.div<{ visible?: boolean }>`
  width: 280px;
  background-color: #fff;
  border-radius: 8px;
  overflow-y: auto;
  height: calc(100vh - 96px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  
  @media (max-width: 768px) {
    position: fixed;
    left: ${props => props.visible ? '0' : '-280px'};
    z-index: 999;
    box-shadow: ${props => props.visible ? '0 0 10px rgba(0, 0, 0, 0.1)' : 'none'};
  }
`;

const StyledContent = styled.div`
  flex: 1;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
`;

interface LayoutProps {
  children: React.ReactNode;
  sider?: React.ReactNode;
  header?: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children, sider, header }) => {
  return (
    <StyledLayout>
      {header && <StyledHeader>{header}</StyledHeader>}
      <MainContainer>
        {sider && <StyledSider>{sider}</StyledSider>}
        <StyledContent>{children}</StyledContent>
      </MainContainer>
    </StyledLayout>
  );
};

export default Layout;