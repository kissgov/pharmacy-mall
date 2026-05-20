/**
 * 图片上传路由
 * POST /api/upload — 上传图片（本地临时 → COS 存储 → 返回公网 URL）
 */
const { Router } = require('express');
const fs = require('fs');
const path = require('path');
const { authOptional } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { uploadFile, getCOSUrl } = require('../utils/cos');
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
      return res.json(success({ url: cosUrl, filename: req.file.filename }, '上传成功'));
    }

    // COS 不可用时回退到本地路径
    const localUrl = `/uploads/${type}/${req.file.filename}`;
    // 将文件移回永久目录
    const permDir = path.join(__dirname, '..', '..', 'uploads', type);
    const permPath = path.join(permDir, req.file.filename);
    try {
      if (!fs.existsSync(permDir)) fs.mkdirSync(permDir, { recursive: true });
      fs.renameSync(localPath, permPath);
    } catch (_) { /* ignore */ }
    res.json(success({ url: localUrl, filename: req.file.filename }, '上传成功'));
  });
});

module.exports = router;
