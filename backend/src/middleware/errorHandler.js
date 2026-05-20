/**
 * 全局错误处理中间件
 *
 * 捕获所有路由中抛出的错误，返回统一格式的 JSON 响应。
 * Express 约定：四个参数的中间件即为错误处理中间件。
 */

function errorHandler(err, req, res, _next) {
  // 记录错误日志（生产环境可接入日志系统）
  console.error(`[${new Date().toISOString()}] 服务器错误:`, err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // 处理已知类型的错误
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || '服务器内部错误';

  res.status(statusCode).json({
    code: statusCode,
    data: null,
    message,
  });
}

module.exports = errorHandler;
