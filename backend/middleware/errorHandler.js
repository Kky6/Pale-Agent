const { v4: uuidv4 } = require('uuid');

// 全局错误处理中间件
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  
  res.status(500).json({
    code: '0001',
    msg: 'system error',
    data: '',
    traceId: uuidv4()
  });
};

module.exports = errorHandler;