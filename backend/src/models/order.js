/**
 * 订单数据模型
 */
const db = require('../db');
const { generateOrderNo } = require('../utils/helpers');

const Order = {
  /**
   * 创建订单（事务）
   * @param {object} params
   * @param {number} params.userId - 用户 ID
   * @param {string} params.addressSnapshot - 收货地址 JSON
   * @param {Array<{product_id, quantity, cart_id}>} params.items - 订单项
   * @param {number} params.totalAmount - 商品总价
   * @param {number} params.discountAmount - 优惠金额
   * @param {number} params.freight - 运费
   * @param {number} params.payAmount - 实付金额
   * @param {number|null} params.couponId - 使用的优惠券 ID
   * @param {number|null} params.userCouponId - 使用的用户优惠券 ID
   */
  create({ userId, addressSnapshot, items, totalAmount, discountAmount, freight, payAmount, couponId, userCouponId }) {
    const orderNo = generateOrderNo();

    const createOrder = db.transaction(() => {
      // 1. 插入订单
      const orderResult = db.prepare(`
        INSERT INTO orders (order_no, user_id, address_snapshot, total_amount,
          discount_amount, freight, pay_amount, coupon_id, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
      `).run(orderNo, userId, addressSnapshot, totalAmount, discountAmount, freight, payAmount, couponId || null);
      const orderId = orderResult.lastInsertRowid;

      // 2. 插入订单明细 + 扣库存
      const insertItem = db.prepare(`
        INSERT INTO order_items (order_id, product_id, product_name, product_image, price, quantity, subtotal)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const decreaseStock = db.prepare(
        'UPDATE products SET stock = stock - ?, sales = sales + ? WHERE id = ? AND stock >= ?'
      );

      for (const item of items) {
        insertItem.run(orderId, item.product_id, item.product_name, item.product_image, item.price, item.quantity, item.subtotal);

        const stockResult = decreaseStock.run(item.quantity, item.quantity, item.product_id, item.quantity);
        if (stockResult.changes === 0) {
          throw new Error(`商品 "${item.product_name}" 库存不足`);
        }
      }

      // 3. 清空已下单的购物车项
      const cartIds = items.filter((i) => i.cart_id).map((i) => i.cart_id);
      if (cartIds.length > 0) {
        const placeholders = cartIds.map(() => '?').join(',');
        db.prepare(`DELETE FROM carts WHERE id IN (${placeholders})`).run(...cartIds);
      }

      // 4. 标记优惠券已使用
      if (userCouponId) {
        db.prepare("UPDATE user_coupons SET status = 'used', used_at = datetime('now') WHERE id = ?")
          .run(userCouponId);
      }
      if (couponId) {
        db.prepare('UPDATE coupons SET received_count = received_count + 1 WHERE id = ?').run(couponId);
      }

      return orderId;
    });

    const orderId = createOrder();
    return this.findById(orderId);
  },

  /** 用户订单列表 */
  listByUser(userId, status, page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;
    let where = 'WHERE o.user_id = ?';
    const params = [userId];

    if (status) {
      where += ' AND o.status = ?';
      params.push(status);
    }

    const list = db.prepare(`
      SELECT o.*, COUNT(oi.id) AS item_count
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      ${where}
      GROUP BY o.id
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset);

    const total = db.prepare(
      `SELECT COUNT(*) AS count FROM orders o ${where}`
    ).get(...params).count;

    return { list, total };
  },

  /** 根据 ID 查找订单 */
  findById(id) {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!order) return null;

    order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);
    return order;
  },

  /** 根据订单号查找 */
  findByOrderNo(orderNo) {
    const order = db.prepare('SELECT * FROM orders WHERE order_no = ?').get(orderNo);
    if (!order) return null;

    order.items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    return order;
  },

  /** 更新订单状态 */
  updateStatus(id, status) {
    const updates = { status };
    if (status === 'paid') updates.paid_at = new Date().toISOString();

    const fields = Object.keys(updates).map((k) => `${k} = ?`).join(', ');
    const values = Object.values(updates);

    db.prepare(`UPDATE orders SET ${fields}, updated_at = datetime('now') WHERE id = ?`).run(...values, id);
    return this.findById(id);
  },

  /** 管理后台：订单列表 */
  list({ status, page = 1, pageSize = 20 } = {}) {
    const offset = (page - 1) * pageSize;
    let where = '';
    const params = [];

    if (status) {
      where = 'WHERE o.status = ?';
      params.push(status);
    }

    const list = db.prepare(`
      SELECT o.*, u.nickname AS user_name, u.phone AS user_phone
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_id
      ${where}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset);

    const total = db.prepare(
      `SELECT COUNT(*) AS count FROM orders o ${where}`
    ).get(...params).count;

    return { list, total };
  },

  /** 管理后台：发货 */
  ship(id, { tracking_no, logistics_company }) {
    db.prepare(`
      UPDATE orders SET status = 'shipped', tracking_no = ?, logistics_company = ?,
      updated_at = datetime('now') WHERE id = ?
    `).run(tracking_no, logistics_company, id);
    return this.findById(id);
  },

  /** 取消订单并恢复库存 */
  cancel(id) {
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
    if (!order || order.status !== 'pending') {
      throw new Error('只有待支付订单可以取消');
    }

    const cancelTx = db.transaction(() => {
      // 恢复库存
      const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(id);
      const restoreStock = db.prepare('UPDATE products SET stock = stock + ?, sales = sales - ? WHERE id = ?');
      for (const item of items) {
        restoreStock.run(item.quantity, item.quantity, item.product_id);
      }

      // 恢复优惠券
      if (order.coupon_id) {
        db.prepare("UPDATE user_coupons SET status = 'unused', used_at = NULL WHERE coupon_id = ? AND user_id = ? AND status = 'used' LIMIT 1")
          .run(order.coupon_id, order.user_id);
      }

      db.prepare("UPDATE orders SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?").run(id);
    });

    cancelTx();
    return this.findById(id);
  },
};

module.exports = Order;
