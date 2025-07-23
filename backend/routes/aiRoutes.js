const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');

// 创建会话接口
router.get('/chat/generate', aiController.generateChat);

// 发送消息接口
router.post('/chat/sendMsg', aiController.sendMessage);

// RAG知识库检索接口
router.post('/rag/top_k', aiController.ragSearch);

module.exports = router;