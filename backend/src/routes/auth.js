/**
 * 用户认证路由
 * POST /api/auth/login  — 微信登录（模拟）
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
 * 微信登录（模拟）
 * 接收 code，模拟微信 code2Session 流程
 * 如果 code 以 "mock_" 开头，用 code 作为 openid；否则生成随机 openid
 */
router.post('/login', [
  body('code').notEmpty().withMessage('缺少登录凭证 code'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ code: 400, message: '参数错误', data: errors.array() });
  }
  const { code, nickname, avatar_url } = req.body;

  // 模拟微信登录：从 code 提取或生成 openid
  let openid;
  if (code && code.startsWith('mock_')) {
    openid = code;
  } else {
    // 生成随机 openid
    openid = 'user_' + Math.random().toString(36).slice(2, 14);
  }

  // 查找或创建用户
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

  // 签发 JWT
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
router.put('/profile', authUser, [
  body('nickname').optional().isString(),
  body('avatar_url').optional().isString(),
  body('phone').optional().isString(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ code: 400, message: '参数错误', data: errors.array() });
  }
  const user = await User.update(req.user.userId, {
    nickname: req.body.nickname,
    avatar_url: req.body.avatar_url,
    phone: req.body.phone,
  });
  res.json(success(user, '更新成功'));
});

module.exports = router;
