/**
 * 用户认证路由
 * POST /api/auth/login  — 云托管自动登录（x-wx-openid）/ 兼容旧版 code 登录
 * GET  /api/auth/profile — 获取用户信息
 * PUT  /api/auth/profile — 更新用户信息
 */
const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { authUser } = require('../middleware/auth');
const User = require('../models/user');
const { success, error } = require('../utils/response');

const router = Router();

/**
 * 用户登录（支持两种模式）
 * 模式1（云托管）：通过 x-wx-openid 头自动识别，无需传参
 * 模式2（兼容）：传入 code 模拟登录
 */
router.post('/login', async (req, res) => {
  // 云托管模式：从请求头获取 openid
  const cloudOpenid = req.headers['x-wx-openid'] || req.headers['X-WX-OPENID'];

  if (cloudOpenid) {
    let user = await User.findByOpenid(cloudOpenid);
    if (!user) {
      user = await User.create({ openid: cloudOpenid, nickname: `用户${Date.now().toString(36)}` });
    }
    const token = jwt.sign(
      { userId: user.id, openid: user.openid, type: 'user' },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );
    return res.json(success({ token, user }, '登录成功'));
  }

  // 兼容模式：通过 code 模拟登录
  const { code, nickname, avatar_url } = req.body;
  let openid;
  if (code && code.startsWith('mock_')) {
    openid = code;
  } else if (code) {
    openid = 'user_' + Math.random().toString(36).slice(2, 14);
  } else {
    // 无 openid 且无 code — 本地开发模式，生成临时用户
    openid = 'dev_user_' + Math.random().toString(36).slice(2, 10);
  }

  let user = await User.findByOpenid(openid);
  if (!user) {
    user = await User.create({
      openid,
      nickname: nickname || `用户${Date.now().toString(36)}`,
      avatar_url: avatar_url || null,
    });
  } else if (nickname || avatar_url) {
    user = await User.update(user.id, { nickname, avatar_url });
  }

  const token = jwt.sign(
    { userId: user.id, openid: user.openid, type: 'user' },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
  res.json(success({ token, user }, '登录成功'));
});

/** 获取当前用户信息 */
router.get('/profile', authUser, async (req, res) => {
  const user = await User.findById(req.user.userId);
  if (!user) {
    return res.json(error(404, '用户不存在'));
  }
  res.json(success(user));
});

/** 更新当前用户信息 */
router.put('/profile', authUser, async (req, res) => {
  const { nickname, avatar_url, phone } = req.body;
  const user = await User.update(req.user.userId, { nickname, avatar_url, phone });
  res.json(success(user, '更新成功'));
});

module.exports = router;
