/**
 * 处方路由（需登录）
 * GET  /api/prescriptions — 处方列表
 * POST /api/prescriptions — 上传处方
 */
const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const { authUser } = require('../middleware/auth');
const Prescription = require('../models/prescription');
const { success, error, paginated } = require('../utils/response');

const router = Router();
router.use(authUser);

/** 处方列表 */
router.get('/', async (req, res) => {
  const list = await Prescription.listByUser(req.user.userId);
  res.json(success(list));
});

/** 上传处方 */
router.post('/', [
  body('images').isArray({ min: 1 }).withMessage('请上传处方图片'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ code: 400, message: '参数错误', data: errors.array() });
  }
  const prescription = await Prescription.create(req.user.userId, req.body.images);
  res.json(success(prescription, '处方上传成功'));
});

module.exports = router;
