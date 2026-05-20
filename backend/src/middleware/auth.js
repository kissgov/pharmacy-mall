/**
 * JWT 鉴权中间件
 *
 * 提供三个中间件：
 * - authUser: 小程序端用户鉴权（验证 JWT payload.type === 'user'）
 * - authAdmin: 管理后台鉴权（验证 JWT payload.type === 'admin'）
 * - authOptional: 通用鉴权（同时接受 user 和 admin token，用于上传等场景）
 */

const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * 小程序用户鉴权中间件
 * 从 Authorization: Bearer <token> 中提取并验证 JWT
 */
function authUser(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      code: 401,
      data: null,
      message: '未登录，请先登录',
    });
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, config.jwtSecret);

    if (decoded.type !== 'user') {
      return res.status(403).json({
        code: 403,
        data: null,
        message: '无权访问，请使用用户账号登录',
      });
    }

    req.user = { userId: decoded.userId, openid: decoded.openid };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        code: 401,
        data: null,
        message: '登录已过期，请重新登录',
      });
    }

    return res.status(401).json({
      code: 401,
      data: null,
      message: '无效的登录凭证',
    });
  }
}

/**
 * 管理后台鉴权中间件
 * 从 Authorization: Bearer <token> 中提取并验证 JWT
 */
function authAdmin(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      code: 401,
      data: null,
      message: '未登录，请先登录',
    });
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, config.jwtSecret);

    if (decoded.type !== 'admin') {
      return res.status(403).json({
        code: 403,
        data: null,
        message: '无权访问，请使用管理员账号登录',
      });
    }

    req.admin = { userId: decoded.userId, username: decoded.username };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        code: 401,
        data: null,
        message: '登录已过期，请重新登录',
      });
    }

    return res.status(401).json({
      code: 401,
      data: null,
      message: '无效的登录凭证',
    });
  }
}

/**
 * 通用鉴权中间件（同时接受 user 和 admin token）
 * 用于上传等需要双端都能访问的场景
 */
function authOptional(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      code: 401,
      data: null,
      message: '未登录，请先登录',
    });
  }

  const token = authHeader.slice(7);

  try {
    const decoded = jwt.verify(token, config.jwtSecret);

    if (decoded.type === 'user') {
      req.user = { userId: decoded.userId, openid: decoded.openid };
    } else if (decoded.type === 'admin') {
      req.admin = { userId: decoded.userId, username: decoded.username };
    } else {
      return res.status(403).json({
        code: 403,
        data: null,
        message: '无权访问',
      });
    }

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        code: 401,
        data: null,
        message: '登录已过期，请重新登录',
      });
    }

    return res.status(401).json({
      code: 401,
      data: null,
      message: '无效的登录凭证',
    });
  }
}

module.exports = { authUser, authAdmin, authOptional };
