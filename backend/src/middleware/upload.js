/**
 * Multer 文件上传中间件
 *
 * 根据请求中的 type 字段，将图片存储到对应的子目录：
 * - products → uploads/products/
 * - prescriptions → uploads/prescriptions/
 * - banners → uploads/banners/
 */

const multer = require('multer');
const path = require('path');
const fs = require('fs');

const UPLOADS_DIR = path.resolve(__dirname, '..', '..', 'uploads');
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

// 确保各子目录存在
['products', 'prescriptions', 'banners'].forEach((dir) => {
  const fullPath = path.join(UPLOADS_DIR, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination(req, file, cb) {
    // 从 query 或 body 中获取上传类型
    const type = req.query.type || (req.body && req.body.type) || 'products';
    const validTypes = ['products', 'prescriptions', 'banners'];
    const dir = validTypes.includes(type) ? type : 'products';
    cb(null, path.join(UPLOADS_DIR, dir));
  },
  filename(req, file, cb) {
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${timestamp}_${random}${ext}`);
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
