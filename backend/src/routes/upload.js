/**
 * 图片上传路由（需登录）
 * POST /api/upload — 上传图片
 */
const { Router } = require('express');
const { authOptional } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { success, error } = require('../utils/response');

const router = Router();

/** 上传图片 */
router.post('/', authOptional, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.json(error(400, '文件大小不能超过 10MB'));
      }

      if (err.message && err.message.includes('仅支持')) {
        return res.json(error(400, err.message));
      }

      return res.json(error(500, '上传失败'));
    }

    if (!req.file) {
      return res.json(error(400, '请选择文件'));
    }

    // 确定子目录
    const type = req.query.type || (req.body && req.body.type) || 'products';
    const url = `/uploads/${type}/${req.file.filename}`;

    res.json(success({ url, filename: req.file.filename }, '上传成功'));
  });
});

module.exports = router;
