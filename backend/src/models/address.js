/**
 * 收货地址数据模型
 */
const pool = require('../db');

const Address = {
  /** 获取用户地址列表 */
  async listByUser(userId) {
    const [rows] = await pool.execute(
      'SELECT * FROM user_addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC',
      [userId]
    );
    return rows;
  },

  /** 根据 ID 获取地址 */
  async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM user_addresses WHERE id = ?', [id]);
    return rows[0] || null;
  },

  /** 创建地址 */
  async create(data) {
    // 如果是第一个地址，自动设为默认
    const [countRows] = await pool.execute(
      'SELECT COUNT(*) AS count FROM user_addresses WHERE user_id = ?',
      [data.user_id]
    );
    const isDefault = countRows[0].count === 0 ? 1 : (data.is_default || 0);

    // 如果设为默认，先取消其他默认
    if (isDefault) {
      await pool.execute('UPDATE user_addresses SET is_default = 0 WHERE user_id = ?', [data.user_id]);
    }

    const [result] = await pool.execute(
      `INSERT INTO user_addresses (user_id, name, phone, province, city, district, detail, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.user_id,
        data.name,
        data.phone,
        data.province || null,
        data.city || null,
        data.district || null,
        data.detail,
        isDefault,
      ]
    );
    return this.findById(result.insertId);
  },

  /** 更新地址 */
  async update(id, data) {
    const fields = [];
    const values = [];

    ['name', 'phone', 'province', 'city', 'district', 'detail'].forEach((key) => {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    });

    if (fields.length === 0) return this.findById(id);
    values.push(id);

    await pool.execute(`UPDATE user_addresses SET ${fields.join(', ')} WHERE id = ?`, values);
    return this.findById(id);
  },

  /** 删除地址 */
  async delete(id) {
    const [result] = await pool.execute('DELETE FROM user_addresses WHERE id = ?', [id]);
    return result;
  },

  /** 设为默认地址 */
  async setDefault(userId, id) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.execute('UPDATE user_addresses SET is_default = 0 WHERE user_id = ?', [userId]);
      await conn.execute('UPDATE user_addresses SET is_default = 1 WHERE id = ? AND user_id = ?', [id, userId]);
      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
    return this.findById(id);
  },
};

module.exports = Address;
