/**
 * 管理后台订单路由
 * GET /api/admin/orders       — 订单列表
 * GET /api/admin/orders/:id   — 订单详情
 * PUT /api/admin/orders/:id/ship — 发货
 */
const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const Order = require('../../models/order');
const { success, error, paginated } = require('../../utils/response');

const router = Router();

/** 订单列表 */
router.get('/', (req, res) => {
  const { status, page, page_size } = req.query;
  const result = Order.list({
    status,
    page: page ? parseInt(page, 10) : 1,
    pageSize: page_size ? parseInt(page_size, 10) : 20,
  });
  res.json(paginated(result.list, result.total));
});

/** 订单详情 */
router.get('/:id', (req, res) => {
  const order = Order.findById(parseInt(req.params.id, 10));
  if (!order) {
    return res.json(error(404, '订单不存在'));
  }
  res.json(success(order));
});

/** 发货 */
router.put('/:id/ship', [
  body('tracking_no').notEmpty().withMessage('请输入物流单号'),
  body('logistics_company').notEmpty().withMessage('请输入物流公司'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ code: 400, message: '参数错误', data: errors.array() });
  }
  const orderId = parseInt(req.params.id, 10);
  const order = Order.findById(orderId);

  if (!order) {
    return res.json(error(404, '订单不存在'));
  }
  if (order.status !== 'paid') {
    return res.json(error(400, '当前订单状态不可发货'));
  }

  const updated = Order.ship(orderId, {
    tracking_no: req.body.tracking_no,
    logistics_company: req.body.logistics_company,
  });
  res.json(success(updated, '发货成功'));
});

module.exports = router;
