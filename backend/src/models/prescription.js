/**
 * 处方数据模型
 */
const pool = require('../db');

const Prescription = {
  /** 用户处方列表 */
  async listByUser(userId) {
    const [rows] = await pool.execute(
      'SELECT * FROM prescriptions WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    return rows;
  },

  /** 根据 ID 获取处方 */
  async findById(id) {
    const [rows] = await pool.execute('SELECT * FROM prescriptions WHERE id = ?', [id]);
    return rows[0] || null;
  },

  /** 创建处方（上传） */
  async create(userId, images) {
    const imagesJson = JSON.stringify(Array.isArray(images) ? images : [images]);
    const [result] = await pool.execute(
      `INSERT INTO prescriptions (user_id, images, status)
       VALUES (?, ?, 'pending')`,
      [userId, imagesJson]
    );
    return this.findById(result.insertId);
  },

  /** 管理后台：处方列表 */
  async list({ status, page = 1, pageSize = 20 } = {}) {
    const offset = (page - 1) * pageSize;
    let where = '';
    const params = [];

    if (status) {
      where = 'WHERE p.status = ?';
      params.push(status);
    }

    params.push(pageSize, offset);
    const [list] = await pool.execute(
      `SELECT p.*, u.nickname AS user_name, u.phone AS user_phone
       FROM prescriptions p
       LEFT JOIN users u ON u.id = p.user_id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      params
    );

    const countParams = params.slice(0, -2);
    const [totalRows] = await pool.execute(
      `SELECT COUNT(*) AS count FROM prescriptions p ${where}`,
      countParams
    );

    return { list, total: totalRows[0].count };
  },

  /** 管理后台：审核处方 */
  async review(id, { status, remark, reviewerId }) {
    await pool.execute(
      `UPDATE prescriptions
       SET status = ?, review_remark = ?, reviewer_id = ?, reviewed_at = NOW()
       WHERE id = ?`,
      [status, remark || null, reviewerId, id]
    );
    return this.findById(id);
  },
};

module.exports = Prescription;
