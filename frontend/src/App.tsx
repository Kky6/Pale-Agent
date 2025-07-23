import { ConfigProvider, theme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import ChatPage from './pages/ChatPage';
import './App.css';

function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
        },
        algorithm: theme.defaultAlgorithm,
      }}
    >
      <ChatPage />
    </ConfigProvider>
  );
}

export default App;
