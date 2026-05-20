/**
 * 图片上传路由（纯 COS 对象存储，无本地磁盘依赖）
 * POST /api/upload — 上传图片 → COS → 返回 CDN URL
 */
const { Router } = require('express');
const fs = require('fs');
const { authOptional } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { uploadFile } = require('../utils/cos');
const { success, error } = require('../utils/response');

const router = Router();

/** 上传图片 */
router.post('/', authOptional, (req, res) => {
  upload.single('file')(req, res, async (err) => {
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

    const type = req.query.type || (req.body && req.body.type) || 'products';
    const localPath = req.file.path;
    const cloudPath = `${type}/${req.file.filename}`;

    // 上传到 COS
    const cosUrl = await uploadFile(cloudPath, localPath);

    // 删除本地临时文件
    try { fs.unlinkSync(localPath); } catch (_) { /* ignore */ }

    if (cosUrl) {
      return res.json(success({ url: cosUrl }, '上传成功'));
    }

    return res.json(error(500, '上传到云存储失败，请稍后重试'));
  });
});

module.exports = router;
