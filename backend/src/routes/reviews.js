/**
 * 评价路由
 * POST /api/reviews — 发表评价（需登录）
 */
const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const { authUser } = require('../middleware/auth');
const Review = require('../models/review');
const { success, error } = require('../utils/response');

const router = Router();

/** 发表评价（需登录） */
router.post('/', authUser, [
  body('order_id').isInt({ min: 1 }).withMessage('订单 ID 无效'),
  body('product_id').isInt({ min: 1 }).withMessage('商品 ID 无效'),
  body('rating').isInt({ min: 1, max: 5 }).withMessage('评分范围 1-5'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ code: 400, message: '参数错误', data: errors.array() });
  }
  const review = await Review.create({
    user_id: req.user.userId,
    order_id: req.body.order_id,
    product_id: req.body.product_id,
    rating: req.body.rating,
    content: req.body.content,
    images: req.body.images || [],
  });
  res.json(success(review, '评价成功'));
});

module.exports = router;
