/**
 * 购物车数据模型
 */
const pool = require('../db');

const Cart = {
  /** 获取用户购物车列表（JOIN 商品表获取最新信息） */
  async listByUser(userId) {
    const [rows] = await pool.execute(
      `SELECT c.id, c.quantity, c.product_id,
              p.name AS product_name, p.images AS product_images,
              p.price, p.member_price, p.stock, p.status, p.is_prescription
       FROM carts c
       JOIN products p ON p.id = c.product_id
       WHERE c.user_id = ?
       ORDER BY c.id DESC`,
      [userId]
    );
    return rows;
  },

  /** 加入购物车（已存在则更新数量） */
  async add(userId, productId, quantity = 1) {
    const [existing] = await pool.execute(
      'SELECT id, quantity FROM carts WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );

    if (existing.length > 0) {
      await pool.execute(
        'UPDATE carts SET quantity = quantity + ? WHERE id = ?',
        [quantity, existing[0].id]
      );
    } else {
      await pool.execute(
        'INSERT INTO carts (user_id, product_id, quantity) VALUES (?, ?, ?)',
        [userId, productId, quantity]
      );
    }

    const [rows] = await pool.execute(
      'SELECT id, user_id, product_id, quantity FROM carts WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );
    return rows[0] || null;
  },

  /** 修改购物车项数量 */
  async updateQty(id, quantity) {
    if (quantity <= 0) {
      const [result] = await pool.execute('DELETE FROM carts WHERE id = ?', [id]);
      return result;
    }
    const [result] = await pool.execute('UPDATE carts SET quantity = ? WHERE id = ?', [quantity, id]);
    return result;
  },

  /** 删除指定购物车项 */
  async remove(id) {
    const [result] = await pool.execute('DELETE FROM carts WHERE id = ?', [id]);
    return result;
  },

  /** 清空用户购物车 */
  async clearByUser(userId) {
    const [result] = await pool.execute('DELETE FROM carts WHERE user_id = ?', [userId]);
    return result;
  },

  /** 根据 ID 获取购物车项 */
  async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM carts WHERE id = ?', [id]);
    return rows[0] || null;
  },

  /** 批量获取购物车项（用于下单） */
  async findByIds(ids, userId) {
    const placeholders = ids.map(() => '?').join(',');
    const [rows] = await pool.execute(
      `SELECT c.*, p.name AS product_name, p.images AS product_images,
              p.price, p.member_price, p.stock, p.status, p.is_prescription
       FROM carts c
       JOIN products p ON p.id = c.product_id
       WHERE c.id IN (${placeholders}) AND c.user_id = ?`,
      [...ids, userId]
    );
    return rows;
  },
};

module.exports = Cart;
