/**
 * 订单路由（需登录）
 * POST /api/orders           — 创建订单
 * GET  /api/orders           — 订单列表
 * GET  /api/orders/:id       — 订单详情
 * PUT  /api/orders/:id/pay    — 模拟支付
 * PUT  /api/orders/:id/cancel — 取消订单
 * PUT  /api/orders/:id/confirm — 确认收货
 */
const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const { authUser } = require('../middleware/auth');
const Order = require('../models/order');
const Cart = require('../models/cart');
const Address = require('../models/address');
const Coupon = require('../models/coupon');
const Product = require('../models/product');
const { success, error, paginated } = require('../utils/response');

const router = Router();
router.use(authUser);

/** 创建订单 */
router.post('/', [
  body('address_id').isInt({ min: 1 }).withMessage('请选择收货地址'),
  body('cart_item_ids').isArray({ min: 1 }).withMessage('请选择商品'),
  body('coupon_id').optional({ nullable: true }).isInt(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ code: 400, message: '参数错误', data: errors.array() });
  }
  const userId = req.user.userId;
  const { address_id, cart_item_ids, coupon_id } = req.body;

  try {
    // 1. 校验收货地址
    const address = await Address.findById(address_id);
    if (!address || address.user_id !== userId) {
      return res.json(error(400, '收货地址无效'));
    }
    const addressSnapshot = JSON.stringify({
      name: address.name, phone: address.phone,
      province: address.province, city: address.city,
      district: address.district, detail: address.detail,
    });

    // 2. 获取购物车项并校验
    const cartItems = await Cart.findByIds(cart_item_ids, userId);
    if (cartItems.length === 0) {
      return res.json(error(400, '购物车项无效'));
    }

    // 3. 构建订单项
    const items = [];
    let totalAmount = 0;

    for (const ci of cartItems) {
      // 使用会员价（如果有）
      const price = ci.member_price || ci.price;

      if (ci.stock < ci.quantity) {
        return res.json(error(400, `商品 "${ci.product_name}" 库存不足`));
      }

      const subtotal = parseFloat((price * ci.quantity).toFixed(2));
      totalAmount += subtotal;

      // 获取商品第一张图
      let productImage = null;
      try {
        const images = JSON.parse(ci.product_images || '[]');
        productImage = images[0] || null;
      } catch { /* ignore */ }

      items.push({
        product_id: ci.product_id,
        product_name: ci.product_name,
        product_image: productImage,
        price,
        quantity: ci.quantity,
        subtotal,
        cart_id: ci.id,
      });
    }

    // 4. 处理优惠券
    let discountAmount = 0;
    let userCouponId = null;

    if (coupon_id) {
      const userCoupons = await Coupon.listByUser(userId, 'unused');
      const uc = userCoupons.find((c) => c.coupon_id === coupon_id);

      if (!uc) {
        return res.json(error(400, '优惠券无效或已使用'));
      }

      if (totalAmount < uc.min_amount) {
        return res.json(error(400, `满 ${uc.min_amount} 元才可使用该优惠券`));
      }

      userCouponId = uc.id;

      if (uc.type === 'full_reduction') {
        discountAmount = parseFloat(Math.min(uc.value, totalAmount).toFixed(2));
      }
    }

    const freight = 0; // 满额免运费，暂不计算
    const payAmount = parseFloat((totalAmount - discountAmount + freight).toFixed(2));

    // 5. 创建订单（事务）
    const order = await Order.create({
      userId,
      addressSnapshot,
      items,
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      discountAmount,
      freight,
      payAmount,
      couponId: coupon_id || null,
      userCouponId,
    });

    res.json(success(order, '下单成功'));
  } catch (err) {
    if (err.message && err.message.includes('库存不足')) {
      return res.json(error(400, err.message));
    }
    console.error('创建订单失败:', err);
    res.json(error(500, '下单失败，请稍后重试'));
  }
});

/** 订单列表 */
router.get('/', async (req, res) => {
  const { status, page, page_size } = req.query;
  const result = await Order.listByUser(
    req.user.userId,
    status,
    page ? parseInt(page, 10) : 1,
    page_size ? parseInt(page_size, 10) : 20
  );
  res.json(paginated(result.list, result.total));
});

/** 订单详情 */
router.get('/:id', async (req, res) => {
  const order = await Order.findById(parseInt(req.params.id, 10));
  if (!order || order.user_id !== req.user.userId) {
    return res.json(error(404, '订单不存在'));
  }
  res.json(success(order));
});

/** 模拟支付 */
router.put('/:id/pay', async (req, res) => {
  const orderId = parseInt(req.params.id, 10);
  const order = await Order.findById(orderId);
  if (!order || order.user_id !== req.user.userId) {
    return res.json(error(404, '订单不存在'));
  }
  if (order.status !== 'pending') {
    return res.json(error(400, '当前订单状态不可支付'));
  }

  const updated = await Order.updateStatus(orderId, 'paid');
  res.json(success(updated, '支付成功'));
});

/** 取消订单 */
router.put('/:id/cancel', async (req, res) => {
  const orderId = parseInt(req.params.id, 10);
  const order = await Order.findById(orderId);
  if (!order || order.user_id !== req.user.userId) {
    return res.json(error(404, '订单不存在'));
  }

  try {
    const updated = await Order.cancel(orderId);
    res.json(success(updated, '订单已取消'));
  } catch (err) {
    res.json(error(400, err.message));
  }
});

/** 确认收货 */
router.put('/:id/confirm', async (req, res) => {
  const orderId = parseInt(req.params.id, 10);
  const order = await Order.findById(orderId);
  if (!order || order.user_id !== req.user.userId) {
    return res.json(error(404, '订单不存在'));
  }
  if (order.status !== 'shipped') {
    return res.json(error(400, '当前订单状态不可确认收货'));
  }

  const updated = await Order.updateStatus(orderId, 'completed');
  res.json(success(updated, '已确认收货'));
});

module.exports = router;
