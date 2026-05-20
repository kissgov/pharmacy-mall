/**
 * 优惠券数据模型
 */
const pool = require('../db');

const Coupon = {
  /** 可领取的优惠券列表（有效期内、未领完、状态为 active） */
  async listAvailable() {
    const [rows] = await pool.execute(
      `SELECT * FROM coupons
       WHERE status = 'active'
         AND valid_from <= NOW()
         AND valid_to >= NOW()
         AND (total_count IS NULL OR received_count < total_count)
       ORDER BY created_at DESC`
    );
    return rows;
  },

  /** 用户优惠券列表 */
  async listByUser(userId, status) {
    let where = 'WHERE uc.user_id = ?';
    const params = [userId];

    if (status) {
      where += ' AND uc.status = ?';
      params.push(status);
    }

    const [rows] = await pool.execute(
      `SELECT uc.*, c.name, c.type, c.value, c.min_amount, c.valid_from, c.valid_to
       FROM user_coupons uc
       JOIN coupons c ON c.id = uc.coupon_id
       ${where}
       ORDER BY uc.created_at DESC`,
      params
    );
    return rows;
  },

  /** 领取优惠券 */
  async receive(userId, couponId) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // 检查优惠券是否存在且可领取
      const [couponRows] = await conn.execute(
        `SELECT * FROM coupons WHERE id = ? AND status = 'active'
         AND valid_from <= NOW()
         AND valid_to >= NOW()`,
        [couponId]
      );

      if (couponRows.length === 0) throw new Error('优惠券不存在或已过期');

      const coupon = couponRows[0];

      if (coupon.total_count !== null && coupon.received_count >= coupon.total_count) {
        throw new Error('优惠券已被领完');
      }

      // 检查是否已领取
      const [existing] = await conn.execute(
        'SELECT id FROM user_coupons WHERE user_id = ? AND coupon_id = ?',
        [userId, couponId]
      );

      if (existing.length > 0) throw new Error('已领取过该优惠券');

      // 更新已领取数量
      await conn.execute('UPDATE coupons SET received_count = received_count + 1 WHERE id = ?', [couponId]);

      // 插入用户优惠券
      const [result] = await conn.execute(
        'INSERT INTO user_coupons (user_id, coupon_id, status) VALUES (?, ?, ?)',
        [userId, couponId, 'unused']
      );

      await conn.commit();

      const [rows] = await pool.execute(
        `SELECT uc.*, c.name, c.type, c.value, c.min_amount, c.valid_from, c.valid_to
         FROM user_coupons uc
         JOIN coupons c ON c.id = uc.coupon_id
         WHERE uc.id = ?`,
        [result.insertId]
      );
      return rows[0] || null;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  },

  /** 根据 ID 查找优惠券 */
  async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM coupons WHERE id = ?', [id]);
    return rows[0] || null;
  },

  /** 管理后台：创建优惠券 */
  async create(data) {
    const [result] = await pool.execute(
      `INSERT INTO coupons (name, type, value, min_amount, total_count, valid_from, valid_to, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.name,
        data.type || 'full_reduction',
        data.value,
        data.min_amount || 0,
        data.total_count || null,
        data.valid_from,
        data.valid_to,
        data.status || 'active',
      ]
    );
    return this.findById(result.insertId);
  },

  /** 管理后台：更新优惠券 */
  async update(id, data) {
    const allowed = ['name', 'type', 'value', 'min_amount', 'total_count', 'valid_from', 'valid_to', 'status'];
    const fields = [];
    const values = [];

    allowed.forEach((key) => {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    });

    if (fields.length === 0) return this.findById(id);
    values.push(id);
    await pool.execute(`UPDATE coupons SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  },

  /** 管理后台：删除优惠券 */
  async delete(id) {
    const [result] = await pool.execute('DELETE FROM coupons WHERE id = ?', [id]);
    return result;
  },

  /** 管理后台：优惠券列表 */
  async listAll() {
    const [rows] = await pool.execute('SELECT * FROM coupons ORDER BY created_at DESC');
    return rows;
  },
};

module.exports = Coupon;
