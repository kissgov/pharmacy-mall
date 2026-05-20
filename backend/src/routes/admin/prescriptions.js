/**
 * 管理后台处方路由
 * GET /api/admin/prescriptions        — 处方列表
 * GET /api/admin/prescriptions/:id    — 处方详情
 * PUT /api/admin/prescriptions/:id/review — 审核处方
 */
const { Router } = require('express');
const { body, validationResult } = require('express-validator');
const Prescription = require('../../models/prescription');
const { success, error, paginated } = require('../../utils/response');

const router = Router();

/** 处方列表 */
router.get('/', (req, res) => {
  const { status, page, page_size } = req.query;
  const result = Prescription.list({
    status,
    page: page ? parseInt(page, 10) : 1,
    pageSize: page_size ? parseInt(page_size, 10) : 20,
  });
  res.json(paginated(result.list, result.total));
});

/** 处方详情 */
router.get('/:id', (req, res) => {
  const prescription = Prescription.findById(parseInt(req.params.id, 10));
  if (!prescription) {
    return res.json(error(404, '处方不存在'));
  }
  res.json(success(prescription));
});

/** 审核处方 */
router.put('/:id/review', [
  body('status').isIn(['approved', 'rejected']).withMessage('审核结果无效'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ code: 400, message: '参数错误', data: errors.array() });
  }
  const id = parseInt(req.params.id, 10);
  const prescription = Prescription.findById(id);
  if (!prescription) {
    return res.json(error(404, '处方不存在'));
  }

  const updated = Prescription.review(id, {
    status: req.body.status,
    remark: req.body.remark,
    reviewerId: req.admin.userId,
  });
  res.json(success(updated, req.body.status === 'approved' ? '处方已通过' : '处方已驳回'));
});

module.exports = router;
