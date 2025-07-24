const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// 创建会话接口
exports.generateChat = async (req, res) => {
  try {
    // 从请求头获取token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        code: '0002',
        msg: 'Unauthorized: No token provided',
        data: '',
        traceId: uuidv4()
      });
    }

    const token = authHeader.split(' ')[1];
    
    // 调用GeoGPT API创建会话
    try {
      const response = await axios.get(
        'https://geogpt.zero2x.org.cn/be-api/service/api/geoChat/generate',
        {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          timeout: 10000
        }
      );

      // 返回API响应
      return res.status(200).json({
        code: '00000',
        msg: null,
        data: response.data.data,
        traceId: uuidv4()
      });
    } catch (apiError) {
      console.error('GeoGPT API Error:', apiError.message);
      return res.status(apiError.response?.status || 500).json({
        code: '0001',
        msg: apiError.response?.data?.msg || 'External API error',
        data: '',
        traceId: uuidv4()
      });
    }
  } catch (error) {
    console.error('Server Error:', error.message);
    return res.status(500).json({
      code: '0001',
      msg: 'system error',
      data: '',
      traceId: uuidv4()
    });
  }
};

// 发送消息接口（流式响应）
exports.sendMessage = async (req, res) => {
  try {
    // 验证请求体
    const { text, sessionId, module, isRAG, isRAGCommon } = req.body;
    
    if (!text || !sessionId) {
      return res.status(400).json({
        code: '0003',
        msg: 'Bad request: Missing required parameters',
        data: '',
        traceId: uuidv4()
      });
    }

    // 从请求头获取token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        code: '0002',
        msg: 'Unauthorized: No token provided',
        data: '',
        traceId: uuidv4()
      });
    }

    const token = authHeader.split(' ')[1];
    
    // 设置响应头，支持流式传输
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // 禁用Nginx缓冲
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');

    // 准备请求体
    const requestBody = {
      text,
      sessionId,
      ...(module && { module }),
      ...(isRAG !== undefined && { isRAG }),
      ...(isRAGCommon !== undefined && { isRAGCommon })
    };

    // 调用GeoGPT API发送消息
    try {
      const response = await axios({
        method: 'post',
        url: 'https://geogpt.zero2x.org.cn/be-api/service/api/geoChat/sendMsg',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: requestBody,
        responseType: 'stream',
        timeout: 60000 // 增加超时时间
      });

      let buffer = '';
      
      // 将API响应流式传输给客户端
      response.data.on('data', (chunk) => {
        try {
          const chunkStr = chunk.toString('utf-8');
          buffer += chunkStr;
          
          // 处理完整的数据块
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || ''; // 保留最后一个可能不完整的部分
          
          for (const line of lines) {
            if (line.trim()) {
              // 确保数据格式正确
              if (line.trim().startsWith('data:')) {
                res.write(`${line}\n\n`);
              } else {
                res.write(`data: ${line}\n\n`);
              }
            }
          }
        } catch (error) {
          console.error('Data processing error:', error);
        }
      });

      response.data.on('end', () => {
        // 处理剩余的缓冲区数据
        if (buffer.trim()) {
          if (buffer.trim().startsWith('data:')) {
            res.write(`${buffer}\n\n`);
          } else {
            res.write(`data: ${buffer}\n\n`);
          }
        }
        
        // 发送结束标记
        res.write(`data: <end></end>\n\n`);
        res.end();
      });

      response.data.on('error', (err) => {
        console.error('Stream error:', err);
        res.write(`data: ${JSON.stringify({
          error: true,
          message: err.message,
          code: '0001'
        })}\n\n`);
        res.end();
      });

    } catch (apiError) {
      console.error('GeoGPT API Error:', apiError.message);
      res.write(`data: ${JSON.stringify({
        error: true,
        message: apiError.message,
        code: '0001'
      })}\n\n`);
      res.end();
    }
  } catch (error) {
    console.error('Server Error:', error.message);
    if (!res.headersSent) {
      res.write(`data: ${JSON.stringify({
        error: true,
        message: 'Internal server error',
        code: '0001'
      })}\n\n`);
    }
    res.end();
  }
};

// RAG知识库检索接口
exports.ragSearch = async (req, res) => {
  try {
    // 验证请求体
    const { query, pathList, topK, isTeam } = req.body;
    
    if (!query) {
      return res.status(400).json({
        code: '0003',
        msg: 'Bad request: Missing required parameter: query',
        data: '',
        traceId: uuidv4()
      });
    }

    // 从请求头获取token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        code: '0002',
        msg: 'Unauthorized: No token provided',
        data: '',
        traceId: uuidv4()
      });
    }

    // 从请求头获取token，如果没有则使用环境变量中的默认值
    const token = authHeader ? authHeader.split(' ')[1] : process.env.OPENAI_API_KEY;
    
    // 准备请求体
    const requestBody = {
      query,
      ...(pathList && { pathList }),
      ...(topK !== undefined && { topK }),
      ...(isTeam !== undefined && { isTeam })
    };

    // 调用GeoGPT API进行RAG检索
    try {
      const response = await axios({
        method: 'post',
        url: 'https://geogpt.zero2x.org.cn/be-api/service/api/rag/top_k',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: requestBody,
        timeout: 30000 // 增加超时时间，因为知识库检索可能需要更长时间
      });

      // 返回API响应
      return res.status(200).json({
        code: response.data.code || '00000',
        msg: response.data.msg,
        data: response.data.data,
        traceId: uuidv4()
      });
    } catch (apiError) {
      console.error('GeoGPT RAG API Error:', apiError.message);
      return res.status(apiError.response?.status || 500).json({
        code: '0001',
        msg: apiError.response?.data?.msg || 'External API error',
        data: '',
        traceId: uuidv4()
      });
    }
  } catch (error) {
    console.error('Server Error:', error.message);
    return res.status(500).json({
      code: '0001',
      msg: 'system error',
      data: '',
      traceId: uuidv4()
    });
  }
};
