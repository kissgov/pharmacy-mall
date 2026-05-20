/**
 * 优惠券路由
 * GET  /api/coupons         — 可领取优惠券列表（公开）
 * GET  /api/coupons/mine    — 我的优惠券（需登录）
 * POST /api/coupons/:id/receive — 领取优惠券（需登录）
 */
const { Router } = require('express');
const { authUser } = require('../middleware/auth');
const Coupon = require('../models/coupon');
const { success, error } = require('../utils/response');

const router = Router();

/** 可领取优惠券列表（公开） */
router.get('/', async (req, res) => {
  const list = await Coupon.listAvailable();
  res.json(success(list));
});

/** 我的优惠券（需登录） */
router.get('/mine', authUser, async (req, res) => {
  const { status } = req.query;
  const list = await Coupon.listByUser(req.user.userId, status);
  res.json(success(list));
});

/** 领取优惠券（需登录） */
router.post('/:id/receive', authUser, async (req, res) => {
  const couponId = parseInt(req.params.id, 10);

  try {
    const userCoupon = await Coupon.receive(req.user.userId, couponId);
    res.json(success(userCoupon, '领取成功'));
  } catch (err) {
    res.json(error(400, err.message));
  }
});

module.exports = router;
