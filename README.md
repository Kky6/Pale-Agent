# Pale Agent

一个基于GeoGPT提供的RAG（检索增强生成）技术的智能对话系统。

## 技术栈

### 前端
- **React 18** + **TypeScript** - 现代化前端框架
- **Vite** - 快速构建工具
- **Ant Design** - 企业级UI组件库

### 后端
- **Node.js** + **Express** - 服务端运行环境和框架
- **CORS** - 跨域资源共享
- **Axios** - API请求处理
- **UUID** - 唯一标识符生成

### 外部服务
- **GeoGPT API** - 核心AI对话和RAG检索服务

## 快速开始

### 环境要求
- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装依赖

```bash
# 安装前端依赖
cd frontend
npm install

# 安装后端依赖
cd ../backend
npm install
```

### 环境配置

在 `backend` 目录下创建 `.env` 文件：

```env
PORT=3001
GEOGPT_API_KEY=your_api_key
```

### 启动应用

```bash
# 启动后端服务
cd backend
npm run dev

# 启动前端应用（新终端）
cd frontend
npm run dev
```

访问 `http://localhost:5173` 即可使用应用。

## 使用说明

### 基本对话
1. 在输入框中输入您的问题
2. 点击发送按钮或按Enter键
3. 系统将返回AI生成的回答

### RAG检索增强
1. 点击"知识库"按钮进行专门的知识库检索
2. 系统会检索相关的古生物学文献
3. 基于检索结果生成更准确的专业回答

### 会话管理
- **新建会话**：点击"新对话"按钮
- **切换会话**：在左侧会话列表中选择
- **删除会话**：在会话列表中点击删除按钮

### 模型选择
- 在顶部模型选择器中切换不同的AI模型
- 不同模型具有不同的特性和适用场景

## 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

**Pale Agent** - 让古生物学知识触手可及 🦕