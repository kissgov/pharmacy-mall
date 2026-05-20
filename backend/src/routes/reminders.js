/**
 * 用药提醒路由（需登录）
 * GET    /api/reminders     — 列表
 * POST   /api/reminders     — 创建
 * PUT    /api/reminders/:id — 更新
 * DELETE /api/reminders/:id — 删除
 */
const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const { authUser } = require('../middleware/auth');
const Reminder = require('../models/reminder');
const { success, error } = require('../utils/response');

const router = Router();
router.use(authUser);

/** 提醒列表 */
router.get('/', (req, res) => {
  const list = Reminder.listByUser(req.user.userId);
  res.json(success(list));
});

/** 创建提醒 */
router.post('/', [
  body('drug_name').notEmpty().withMessage('请输入药品名称'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ code: 400, message: '参数错误', data: errors.array() });
  }
  const reminder = Reminder.create({
    user_id: req.user.userId,
    drug_name: req.body.drug_name,
    dosage: req.body.dosage,
    frequency: req.body.frequency,
    time: req.body.time,
    start_date: req.body.start_date,
    end_date: req.body.end_date,
  });
  res.json(success(reminder, '提醒已创建'));
});

/** 更新提醒 */
router.put('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const reminder = Reminder.update(id, {
    drug_name: req.body.drug_name,
    dosage: req.body.dosage,
    frequency: req.body.frequency,
    time: req.body.time,
    start_date: req.body.start_date,
    end_date: req.body.end_date,
    is_active: req.body.is_active,
  });
  res.json(success(reminder, '提醒已更新'));
});

/** 删除提醒 */
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  Reminder.delete(id);
  res.json(success(null, '提醒已删除'));
});

module.exports = router;
