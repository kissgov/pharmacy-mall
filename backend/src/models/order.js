/**
 * 订单数据模型
 */
const pool = require('../db');
const { generateOrderNo } = require('../utils/helpers');

const Order = {
  /**
   * 创建订单（事务）
   */
  async create({ userId, addressSnapshot, items, totalAmount, discountAmount, freight, payAmount, couponId, userCouponId }) {
    const orderNo = generateOrderNo();
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      // 1. 插入订单（30 分钟支付超时）
      const payExpireAt = new Date(Date.now() + 30 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
      const [orderResult] = await conn.execute(
        `INSERT INTO orders (order_no, user_id, address_snapshot, total_amount,
          discount_amount, freight, pay_amount, coupon_id, status, pay_expire_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [orderNo, userId, addressSnapshot, totalAmount, discountAmount, freight, payAmount, couponId || null, payExpireAt]
      );
      const orderId = orderResult.insertId;

      // 2. 插入订单明细 + 扣库存
      for (const item of items) {
        await conn.execute(
          `INSERT INTO order_items (order_id, product_id, product_name, product_image, price, quantity, subtotal)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [orderId, item.product_id, item.product_name, item.product_image, item.price, item.quantity, item.subtotal]
        );

        const [stockResult] = await conn.execute(
          'UPDATE products SET stock = stock - ?, sales = sales + ? WHERE id = ? AND stock >= ?',
          [item.quantity, item.quantity, item.product_id, item.quantity]
        );
        if (stockResult.affectedRows === 0) {
          throw new Error(`商品 "${item.product_name}" 库存不足`);
        }
      }

      // 3. 清空已下单的购物车项
      const cartIds = items.filter((i) => i.cart_id).map((i) => i.cart_id);
      if (cartIds.length > 0) {
        const placeholders = cartIds.map(() => '?').join(',');
        await conn.execute(`DELETE FROM carts WHERE id IN (${placeholders})`, cartIds);
      }

      // 4. 标记优惠券已使用
      if (userCouponId) {
        await conn.execute(
          "UPDATE user_coupons SET status = 'used', used_at = NOW() WHERE id = ?",
          [userCouponId]
        );
      }
      if (couponId) {
        await conn.execute(
          'UPDATE coupons SET received_count = received_count + 1 WHERE id = ?',
          [couponId]
        );
      }

      await conn.commit();

      return this.findById(orderId);
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  /** 用户订单列表 */
  async listByUser(userId, status, page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;
    let where = 'WHERE o.user_id = ?';
    const params = [userId];

    if (status) {
      where += ' AND o.status = ?';
      params.push(status);
    }

    params.push(pageSize, offset);
    const [list] = await pool.execute(
      `SELECT o.*, COUNT(oi.id) AS item_count
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       ${where}
       GROUP BY o.id
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`,
      params
    );

    const countParams = params.slice(0, -2);
    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS count FROM orders o ${where}`,
      countParams
    );

    return { list, total: totalRows[0].count };
  },

  /** 根据 ID 查找订单 */
  async findById(id) {
    const [orderRows] = await pool.execute('SELECT * FROM orders WHERE id = ?', [id]);
    if (orderRows.length === 0) return null;

    const order = orderRows[0];
    const [items] = await pool.execute('SELECT * FROM order_items WHERE order_id = ?', [id]);
    order.items = items;
    return order;
  },

  /** 根据订单号查找 */
  async findByOrderNo(orderNo) {
    const [orderRows] = await pool.execute('SELECT * FROM orders WHERE order_no = ?', [orderNo]);
    if (orderRows.length === 0) return null;

    const order = orderRows[0];
    const [items] = await pool.execute('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
    order.items = items;
    return order;
  },

  /** 更新订单状态 */
  async updateStatus(id, status) {
    const updates = { status };
    if (status === 'paid') updates.paid_at = new Date().toISOString();

    const fields = Object.keys(updates).map((k) => `${k} = ?`);
    const values = Object.values(updates);
    values.push(id);

    await pool.execute(`UPDATE orders SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  },

  /** 管理后台：订单列表 */
  async list({ status, page = 1, pageSize = 20 } = {}) {
    const offset = (page - 1) * pageSize;
    let where = '';
    const params = [];

    if (status) {
      where = 'WHERE o.status = ?';
      params.push(status);
    }

    params.push(pageSize, offset);
    const [list] = await pool.execute(
      `SELECT o.*, u.nickname AS user_name, u.phone AS user_phone
       FROM orders o
       LEFT JOIN users u ON u.id = o.user_id
       ${where}
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`,
      params
    );

    const countParams = params.slice(0, -2);
    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS count FROM orders o ${where}`,
      countParams
    );

    return { list, total: totalRows[0].count };
  },

  /** 管理后台：发货 */
  async ship(id, { tracking_no, logistics_company }) {
    await pool.execute(
      `UPDATE orders SET status = 'shipped', tracking_no = ?, logistics_company = ? WHERE id = ?`,
      [tracking_no, logistics_company, id]
    );
    return this.findById(id);
  },

  /** 取消订单并恢复库存 */
  async cancel(id) {
    const [orderRows] = await pool.execute('SELECT * FROM orders WHERE id = ?', [id]);
    if (orderRows.length === 0 || orderRows[0].status !== 'pending') {
      throw new Error('只有待支付订单可以取消');
    }

    const order = orderRows[0];
    const conn = await pool.getConnection();

    try {
      await conn.beginTransaction();

      // 恢复库存
      const [items] = await conn.execute('SELECT * FROM order_items WHERE order_id = ?', [id]);
      for (const item of items) {
        await conn.execute(
          'UPDATE products SET stock = stock + ?, sales = sales - ? WHERE id = ?',
          [item.quantity, item.quantity, item.product_id]
        );
      }

      // 恢复优惠券
      if (order.coupon_id) {
        await conn.execute(
          "UPDATE user_coupons SET status = 'unused', used_at = NULL WHERE coupon_id = ? AND user_id = ? AND status = 'used' LIMIT 1",
          [order.coupon_id, order.user_id]
        );
      }

      await conn.execute("UPDATE orders SET status = 'cancelled' WHERE id = ?", [id]);

      await conn.commit();

      return this.findById(id);
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },
};

module.exports = Order;
