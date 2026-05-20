/**
 * 鉴权中间件（支持云托管内网 + JWT 双模式）
 *
 * 云托管模式：小程序通过 wx.cloud.callContainer 访问时，
 * 请求头自动携带 x-wx-openid，无需手动登录。
 *
 * JWT 模式：管理后台和旧版小程序通过 Authorization: Bearer <token> 鉴权。
 */

const jwt = require('jsonwebtoken');
const config = require('../config');
const pool = require('../db');

/**
 * 小程序用户鉴权中间件
 * 优先读取云托管自动传入的 x-wx-openid（内网模式）
 * 回退到 Authorization Bearer token（JWT 模式）
 */
async function authUser(req, res, next) {
  try {
    // 1. 云托管内网模式：自动携带用户 openid
    const openid = req.headers['x-wx-openid'] || req.headers['X-WX-OPENID'];
    const cloudOpenid = openid || req.headers['x-wx-openid'];

    if (cloudOpenid) {
      // 通过云托管内网访问，自动获取/创建用户
      let [userRows] = await pool.execute('SELECT * FROM users WHERE openid = ?', [cloudOpenid]);
      let user;
      if (userRows.length === 0) {
        const [result] = await pool.execute('INSERT INTO users (openid) VALUES (?)', [cloudOpenid]);
        user = { id: result.insertId, openid: cloudOpenid, member_level: 'normal', points: 0 };
      } else {
        user = userRows[0];
      }
      req.user = { userId: user.id, openid: user.openid };
      return next();
    }

    // 2. JWT 模式：兼容旧版和管理后台调用
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ code: 401, data: null, message: '未登录' });
    }

    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, config.jwtSecret);
    if (decoded.type !== 'user') {
      return res.status(403).json({ code: 403, data: null, message: '无权访问' });
    }
    req.user = { userId: decoded.userId, openid: decoded.openid };
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ code: 401, data: null, message: '登录已过期' });
    }
    return res.status(500).json({ code: 500, data: null, message: '用户初始化失败' });
  }
}

/**
 * 管理后台鉴权中间件（仅 JWT）
 */
function authAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ code: 401, data: null, message: '未登录' });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    if (decoded.type !== 'admin') {
      return res.status(403).json({ code: 403, data: null, message: '无权访问' });
    }
    req.admin = { userId: decoded.userId, username: decoded.username };
    next();
  } catch (err) {
    return res.status(401).json({ code: 401, data: null, message: '登录已过期' });
  }
}

/**
 * 通用鉴权中间件（上传等场景，支持 user/admin/cloud 三种来源）
 */
async function authOptional(req, res, next) {
  try {
    // 1. 云托管 openid
    const cloudOpenid = req.headers['x-wx-openid'] || req.headers['X-WX-OPENID'];
    if (cloudOpenid) {
      return authUser(req, res, next);
    }

    // 2. JWT token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ code: 401, data: null, message: '未登录' });
    }

    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, config.jwtSecret);
    if (decoded.type === 'user') {
      req.user = { userId: decoded.userId, openid: decoded.openid };
    } else if (decoded.type === 'admin') {
      req.admin = { userId: decoded.userId, username: decoded.username };
    } else {
      return res.status(403).json({ code: 403, data: null, message: '无权访问' });
    }
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ code: 401, data: null, message: '登录已过期' });
    }
    return res.status(401).json({ code: 401, data: null, message: '未登录' });
  }
}

module.exports = { authUser, authAdmin, authOptional };
