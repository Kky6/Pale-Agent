const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const errorHandler = require('./middleware/errorHandler');

// 加载环境变量
dotenv.config();

const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// 路由 - 添加/api前缀以匹配前端请求
app.use('/api', require('./routes/aiRoutes'));

// 错误处理中间件
app.use(errorHandler);

module.exports = app;