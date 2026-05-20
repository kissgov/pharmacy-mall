/**
 * 图片上传路由（纯 COS 对象存储，无本地磁盘依赖）
 * POST /api/upload            — multipart 上传图片 → COS
 * POST /api/upload/avatar-base64 — JSON base64 上传（云托管 callContainer 专用）
 */
const { Router } = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { authOptional } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { uploadFile } = require('../utils/cos');
const { success, error } = require('../utils/response');

const router = Router();

/** 图片上传（multipart） */
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

/** 头像 base64 上传（云托管 callContainer 专用，不走 wx.uploadFile） */
router.post('/avatar-base64', authOptional, async (req, res) => {
  try {
    const { file, filename } = req.body;
    if (!file) {
      return res.json(error(400, '缺少 file 字段（base64 字符串）'));
    }

    // 去除可能的 data:image/...;base64, 前缀
    const base64Data = file.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length > 10 * 1024 * 1024) {
      return res.json(error(400, '文件大小不能超过 10MB'));
    }

    const ext = path.extname(filename || 'avatar.png') || '.png';
    const tempName = `avatar_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`;
    const tempPath = path.join(os.tmpdir(), tempName);
    const cloudPath = `avatars/${tempName}`;

    fs.writeFileSync(tempPath, buffer);

    const cosUrl = await uploadFile(cloudPath, tempPath);

    try { fs.unlinkSync(tempPath); } catch (_) { /* ignore */ }

    if (cosUrl) {
      return res.json(success({ url: cosUrl }, '上传成功'));
    }
    return res.json(error(500, '上传到云存储失败，请稍后重试'));
  } catch (err) {
    console.log('base64 上传失败:', err.message);
    return res.json(error(500, '上传失败'));
  }
});

module.exports = router;
