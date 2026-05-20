/**
 * 处方数据模型
 */
const db = require('../db');

const Prescription = {
  /** 用户处方列表 */
  listByUser(userId) {
    return db.prepare(
      'SELECT * FROM prescriptions WHERE user_id = ? ORDER BY created_at DESC'
    ).all(userId);
  },

  /** 根据 ID 获取处方 */
  findById(id) {
    return db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(id);
  },

  /** 创建处方（上传） */
  create(userId, images) {
    const imagesJson = JSON.stringify(Array.isArray(images) ? images : [images]);
    const stmt = db.prepare(`
      INSERT INTO prescriptions (user_id, images, status)
      VALUES (?, ?, 'pending')
    `);
    const result = stmt.run(userId, imagesJson);
    return this.findById(result.lastInsertRowid);
  },

  /** 管理后台：处方列表 */
  list({ status, page = 1, pageSize = 20 } = {}) {
    const offset = (page - 1) * pageSize;
    let where = '';
    const params = [];

    if (status) {
      where = 'WHERE p.status = ?';
      params.push(status);
    }

    const list = db.prepare(`
      SELECT p.*, u.nickname AS user_name, u.phone AS user_phone
      FROM prescriptions p
      LEFT JOIN users u ON u.id = p.user_id
      ${where}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset);

    const total = db.prepare(
      `SELECT COUNT(*) AS count FROM prescriptions p ${where}`
    ).get(...params).count;

    return { list, total };
  },

  /** 管理后台：审核处方 */
  review(id, { status, remark, reviewerId }) {
    db.prepare(`
      UPDATE prescriptions
      SET status = ?, review_remark = ?, reviewer_id = ?, reviewed_at = datetime('now')
      WHERE id = ?
    `).run(status, remark || null, reviewerId, id);
    return this.findById(id);
  },
};

module.exports = Prescription;
