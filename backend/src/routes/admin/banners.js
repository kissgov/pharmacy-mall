/**
 * 管理后台 Banner 路由
 * GET    /api/admin/banners        — Banner 列表
 * GET    /api/admin/banners/:id    — Banner 详情
 * POST   /api/admin/banners        — 创建 Banner
 * PUT    /api/admin/banners/:id    — 更新 Banner
 * DELETE /api/admin/banners/:id    — 删除 Banner
 */
const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../../db');
const { success, error } = require('../../utils/response');

const router = Router();

/** Banner 列表 */
router.get('/', async (req, res) => {
  const [list] = await pool.execute('SELECT * FROM banners ORDER BY sort ASC, created_at DESC');
  res.json(success(list));
});

/** Banner 详情 */
router.get('/:id', async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM banners WHERE id = ?', [parseInt(req.params.id, 10)]);
  if (rows.length === 0) {
    return res.json(error(404, 'Banner 不存在'));
  }
  res.json(success(rows[0]));
});

/** 创建 Banner */
router.post('/', [
  body('title').notEmpty().withMessage('请输入标题'),
  body('image_url').notEmpty().withMessage('请上传图片'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ code: 400, message: '参数错误', data: errors.array() });
  }
  const [result] = await pool.execute(
    `INSERT INTO banners (title, image_url, link_url, sort, status)
     VALUES (?, ?, ?, ?, ?)`,
    [
      req.body.title,
      req.body.image_url,
      req.body.link_url || null,
      req.body.sort || 0,
      req.body.status || 'active',
    ]
  );

  const [rows] = await pool.execute('SELECT * FROM banners WHERE id = ?', [result.insertId]);
  res.json(success(rows[0], 'Banner 已创建'));
});

/** 更新 Banner */
router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const [existing] = await pool.execute('SELECT * FROM banners WHERE id = ?', [id]);
  if (existing.length === 0) {
    return res.json(error(404, 'Banner 不存在'));
  }

  const fields = [];
  const values = [];
  ['title', 'image_url', 'link_url', 'sort', 'status'].forEach((key) => {
    if (req.body[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(req.body[key]);
    }
  });

  if (fields.length > 0) {
    values.push(id);
    await pool.execute(`UPDATE banners SET ${fields.join(', ')} WHERE id = ?`, values);
  }

  const [rows] = await pool.execute('SELECT * FROM banners WHERE id = ?', [id]);
  res.json(success(rows[0], 'Banner 已更新'));
});

/** 删除 Banner */
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  await pool.execute('DELETE FROM banners WHERE id = ?', [id]);
  res.json(success(null, 'Banner 已删除'));
});

module.exports = router;
