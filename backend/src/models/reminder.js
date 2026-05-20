/**
 * 用药提醒数据模型
 */
const pool = require('../db');

const Reminder = {
  /** 获取用户提醒列表 */
  async listByUser(userId) {
    const [rows] = await pool.execute(
      'SELECT * FROM medication_reminders WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC',
      [userId]
    );
    return rows;
  },

  /** 创建用药提醒 */
  async create(data) {
    const [result] = await pool.execute(
      `INSERT INTO medication_reminders (user_id, drug_name, dosage, frequency, time, start_date, end_date, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.user_id,
        data.drug_name,
        data.dosage || null,
        data.frequency || null,
        data.time || null,
        data.start_date || null,
        data.end_date || null,
        data.is_active !== undefined ? data.is_active : 1,
      ]
    );
    const [rows] = await pool.execute('SELECT * FROM medication_reminders WHERE id = ?', [result.insertId]);
    return rows[0] || null;
  },

  /** 更新用药提醒 */
  async update(id, data) {
    const allowed = ['drug_name', 'dosage', 'frequency', 'time', 'start_date', 'end_date', 'is_active'];
    const fields = [];
    const values = [];

    allowed.forEach((key) => {
      if (data[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(data[key]);
      }
    });

    if (fields.length === 0) {
      const [rows] = await pool.execute('SELECT * FROM medication_reminders WHERE id = ?', [id]);
      return rows[0] || null;
    }

    values.push(id);
    await pool.execute(`UPDATE medication_reminders SET ${fields.join(', ')} WHERE id = ?`, values);

    const [rows] = await pool.execute('SELECT * FROM medication_reminders WHERE id = ?', [id]);
    return rows[0] || null;
  },

  /** 删除用药提醒 */
  async delete(id) {
    const [result] = await pool.execute('DELETE FROM medication_reminders WHERE id = ?', [id]);
    return result;
  },
};

module.exports = Reminder;
