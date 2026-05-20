/**
 * Multer 文件上传中间件（临时磁盘，上传后即删）
 * 文件先存到 OS 临时目录，上传 COS 后立即删除
 */

const multer = require('multer');
const path = require('path');
const os = require('os');

const TMP_DIR = os.tmpdir();
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, TMP_DIR);
  },
  filename(req, file, cb) {
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `upload_${timestamp}_${random}${ext}`);
  },
});

function fileFilter(req, file, cb) {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('仅支持 jpg、jpeg、png、gif、webp 格式的图片'), false);
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE },
});

module.exports = upload;
