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
const db = require('../../db');
const { success, error } = require('../../utils/response');

const router = Router();

/** Banner 列表 */
router.get('/', (req, res) => {
  const list = db.prepare('SELECT * FROM banners ORDER BY sort ASC, created_at DESC').all();
  res.json(success(list));
});

/** Banner 详情 */
router.get('/:id', (req, res) => {
  const banner = db.prepare('SELECT * FROM banners WHERE id = ?').get(parseInt(req.params.id, 10));
  if (!banner) {
    return res.json(error(404, 'Banner 不存在'));
  }
  res.json(success(banner));
});

/** 创建 Banner */
router.post('/', [
  body('title').notEmpty().withMessage('请输入标题'),
  body('image_url').notEmpty().withMessage('请上传图片'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ code: 400, message: '参数错误', data: errors.array() });
  }
  const stmt = db.prepare(`
    INSERT INTO banners (title, image_url, link_url, sort, status)
    VALUES (@title, @image_url, @link_url, @sort, @status)
  `);
  const result = stmt.run({
    title: req.body.title,
    image_url: req.body.image_url,
    link_url: req.body.link_url || null,
    sort: req.body.sort || 0,
    status: req.body.status || 'active',
  });

  const banner = db.prepare('SELECT * FROM banners WHERE id = ?').get(result.lastInsertRowid);
  res.json(success(banner, 'Banner 已创建'));
});

/** 更新 Banner */
router.put('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const existing = db.prepare('SELECT * FROM banners WHERE id = ?').get(id);
  if (!existing) {
    return res.json(error(404, 'Banner 不存在'));
  }

  const fields = [];
  const values = { id };
  ['title', 'image_url', 'link_url', 'sort', 'status'].forEach((key) => {
    if (req.body[key] !== undefined) {
      fields.push(`${key} = @${key}`);
      values[key] = req.body[key];
    }
  });

  if (fields.length > 0) {
    db.prepare(`UPDATE banners SET ${fields.join(', ')} WHERE id = @id`).run(values);
  }

  const banner = db.prepare('SELECT * FROM banners WHERE id = ?').get(id);
  res.json(success(banner, 'Banner 已更新'));
});

/** 删除 Banner */
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  db.prepare('DELETE FROM banners WHERE id = ?').run(id);
  res.json(success(null, 'Banner 已删除'));
});

module.exports = router;
