/**
 * 管理后台优惠券路由
 * GET    /api/admin/coupons        — 优惠券列表
 * GET    /api/admin/coupons/:id    — 优惠券详情
 * POST   /api/admin/coupons        — 创建优惠券
 * PUT    /api/admin/coupons/:id    — 更新优惠券
 * DELETE /api/admin/coupons/:id    — 删除优惠券
 */
const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const Coupon = require('../../models/coupon');
const { success, error } = require('../../utils/response');

const router = Router();

/** 优惠券列表 */
router.get('/', async (req, res) => {
  const list = await Coupon.listAll();
  res.json(success(list));
});

/** 优惠券详情 */
router.get('/:id', async (req, res) => {
  const coupon = await Coupon.findById(parseInt(req.params.id, 10));
  if (!coupon) {
    return res.json(error(404, '优惠券不存在'));
  }
  res.json(success(coupon));
});

/** 创建优惠券 */
router.post('/', [
  body('name').notEmpty().withMessage('请输入优惠券名称'),
  body('value').isFloat({ min: 0 }).withMessage('请输入有效面值'),
  body('valid_from').notEmpty().withMessage('请选择生效时间'),
  body('valid_to').notEmpty().withMessage('请选择失效时间'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ code: 400, message: '参数错误', data: errors.array() });
  }
  const coupon = await Coupon.create(req.body);
  res.json(success(coupon, '优惠券已创建'));
});

/** 更新优惠券 */
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const existing = await Coupon.findById(id);
  if (!existing) {
    return res.json(error(404, '优惠券不存在'));
  }

  const coupon = await Coupon.update(id, req.body);
  res.json(success(coupon, '优惠券已更新'));
});

/** 删除优惠券 */
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await Coupon.delete(id);
  res.json(success(null, '优惠券已删除'));
});

module.exports = router;
