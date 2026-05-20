/**
 * 用药提醒数据模型
 */
const db = require('../db');

const Reminder = {
  /** 获取用户提醒列表 */
  listByUser(userId) {
    return db.prepare(
      'SELECT * FROM medication_reminders WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC'
    ).all(userId);
  },

  /** 创建用药提醒 */
  create(data) {
    const stmt = db.prepare(`
      INSERT INTO medication_reminders (user_id, drug_name, dosage, frequency, time, start_date, end_date, is_active)
      VALUES (@user_id, @drug_name, @dosage, @frequency, @time, @start_date, @end_date, @is_active)
    `);
    const result = stmt.run({
      user_id: data.user_id,
      drug_name: data.drug_name,
      dosage: data.dosage || null,
      frequency: data.frequency || null,
      time: data.time || null,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
      is_active: data.is_active !== undefined ? data.is_active : 1,
    });
    return db.prepare('SELECT * FROM medication_reminders WHERE id = ?').get(result.lastInsertRowid);
  },

  /** 更新用药提醒 */
  update(id, data) {
    const allowed = ['drug_name', 'dosage', 'frequency', 'time', 'start_date', 'end_date', 'is_active'];
    const fields = [];
    const values = { id };

    allowed.forEach((key) => {
      if (data[key] !== undefined) {
        fields.push(`${key} = @${key}`);
        values[key] = data[key];
      }
    });

    if (fields.length === 0) {
      return db.prepare('SELECT * FROM medication_reminders WHERE id = ?').get(id);
    }

    db.prepare(`UPDATE medication_reminders SET ${fields.join(', ')} WHERE id = @id`).run(values);
    return db.prepare('SELECT * FROM medication_reminders WHERE id = ?').get(id);
  },

  /** 删除用药提醒 */
  delete(id) {
    return db.prepare('DELETE FROM medication_reminders WHERE id = ?').run(id);
  },
};

module.exports = Reminder;
