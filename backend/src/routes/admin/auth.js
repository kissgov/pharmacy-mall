/**
 * 管理后台登录路由
 * POST /api/admin/auth/login — 管理员登录
 */
const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../db');
const config = require('../../config');
const { success, error } = require('../../utils/response');

const router = Router();

/** 管理员登录 */
router.post('/login', [
  body('username').notEmpty().withMessage('请输入用户名'),
  body('password').notEmpty().withMessage('请输入密码'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ code: 400, message: '参数错误', data: errors.array() });
  }
  const { username, password } = req.body;

  const admin = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username);
  if (!admin) {
    return res.json(error(401, '用户名或密码错误'));
  }

  const valid = bcrypt.compareSync(password, admin.password_hash);
  if (!valid) {
    return res.json(error(401, '用户名或密码错误'));
  }

  const token = jwt.sign(
    { userId: admin.id, username: admin.username, role: admin.role, type: 'admin' },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );

  res.json(success({
    token,
    admin: { id: admin.id, username: admin.username, role: admin.role },
  }, '登录成功'));
});

module.exports = router;
