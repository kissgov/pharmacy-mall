/**
 * 收货地址路由（需登录）
 * GET    /api/addresses          — 地址列表
 * POST   /api/addresses          — 新增地址
 * GET    /api/addresses/:id      — 地址详情
 * PUT    /api/addresses/:id      — 更新地址
 * DELETE /api/addresses/:id      — 删除地址
 * PUT    /api/addresses/:id/default — 设为默认
 */
const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const { authUser } = require('../middleware/auth');
const Address = require('../models/address');
const { success, error } = require('../utils/response');

const router = Router();
router.use(authUser);

/** 地址列表 */
router.get('/', async (req, res) => {
  const list = await Address.listByUser(req.user.userId);
  res.json(success(list));
});

/** 地址详情 */
router.get('/:id', async (req, res) => {
  const addr = await Address.findById(parseInt(req.params.id, 10));
  if (!addr || addr.user_id !== req.user.userId) {
    return res.json(error(404, '地址不存在'));
  }
  res.json(success(addr));
});

/** 新增地址 */
router.post('/', [
  body('name').notEmpty().withMessage('请输入收货人姓名'),
  body('phone').notEmpty().withMessage('请输入收货人电话'),
  body('detail').notEmpty().withMessage('请输入详细地址'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ code: 400, message: '参数错误', data: errors.array() });
  }
  const addr = await Address.create({
    user_id: req.user.userId,
    name: req.body.name,
    phone: req.body.phone,
    province: req.body.province,
    city: req.body.city,
    district: req.body.district,
    detail: req.body.detail,
    is_default: req.body.is_default || 0,
  });
  res.json(success(addr, '地址已保存'));
});

/** 更新地址 */
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const addr = await Address.findById(id);
  if (!addr || addr.user_id !== req.user.userId) {
    return res.json(error(404, '地址不存在'));
  }

  const updated = await Address.update(id, {
    name: req.body.name,
    phone: req.body.phone,
    province: req.body.province,
    city: req.body.city,
    district: req.body.district,
    detail: req.body.detail,
  });
  res.json(success(updated, '地址已更新'));
});

/** 删除地址 */
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const addr = await Address.findById(id);
  if (!addr || addr.user_id !== req.user.userId) {
    return res.json(error(404, '地址不存在'));
  }
  await Address.delete(id);
  res.json(success(null, '地址已删除'));
});

/** 设为默认地址 */
router.put('/:id/default', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const addr = await Address.findById(id);
  if (!addr || addr.user_id !== req.user.userId) {
    return res.json(error(404, '地址不存在'));
  }
  const updated = await Address.setDefault(req.user.userId, id);
  res.json(success(updated, '已设为默认地址'));
});

module.exports = router;
