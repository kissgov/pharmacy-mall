import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Button, Chip, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Snackbar, Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { prescriptionAPI } from '../api';
import dayjs from 'dayjs';

const statusLabels = { pending: '待审核', approved: '已通过', rejected: '已驳回' };
const statusColors = { pending: 'warning', approved: 'success', rejected: 'error' };

export default function PrescriptionReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [prescription, setPrescription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rejectDialog, setRejectDialog] = useState({ open: false, remark: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const load = () => {
    setLoading(true);
    prescriptionAPI.detail(id).then((res) => {
      setPrescription(res.data || res);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handleApprove = () => {
    prescriptionAPI.review(id, { status: 'approved', remark: '' }).then(() => {
      setSnackbar({ open: true, message: '已通过', severity: 'success' });
      load();
    });
  };

  const handleReject = () => {
    prescriptionAPI.review(id, { status: 'rejected', remark: rejectDialog.remark }).then(() => {
      setRejectDialog({ open: false, remark: '' });
      setSnackbar({ open: true, message: '已驳回', severity: 'success' });
      load();
    });
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  if (!prescription) return <Typography>处方不存在</Typography>;

  let images = [];
  try { images = JSON.parse(prescription.images || '[]'); } catch { /* ignore */ }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/prescriptions')}>返回</Button>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>处方审核</Typography>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box>
              <Typography variant="body2" color="text.secondary">用户: {prescription.user_name || '-'}</Typography>
              <Typography variant="body2" color="text.secondary">手机: {prescription.user_phone || '-'}</Typography>
              <Typography variant="body2" color="text.secondary">提交时间: {prescription.created_at ? dayjs(prescription.created_at).format('YYYY-MM-DD HH:mm') : '-'}</Typography>
            </Box>
            <Chip label={statusLabels[prescription.status] || prescription.status} color={statusColors[prescription.status] || 'default'} />
          </Box>
          {prescription.review_remark && (
            <Typography variant="body2" color="error" sx={{ mt: 1 }}>审核备注: {prescription.review_remark}</Typography>
          )}
        </CardContent>
      </Card>

      <Typography variant="subtitle1" sx={{ mb: 2 }}>处方图片</Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        {images.map((img, i) => (
          <img
            key={i} src={img} alt=""
            style={{ width: 200, height: 200, objectFit: 'cover', borderRadius: 12, cursor: 'pointer', border: '1px solid #eee' }}
            onClick={() => window.open(img)}
          />
        ))}
        {images.length === 0 && <Typography color="text.secondary">暂无图片</Typography>}
      </Box>

      {prescription.status === 'pending' && (
        <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
          <Button variant="contained" onClick={handleApprove} sx={{ bgcolor: '#07c160', '&:hover': { bgcolor: '#06ad56' } }}>
            通过
          </Button>
          <Button variant="contained" color="error" onClick={() => setRejectDialog({ open: true, remark: '' })}>
            驳回
          </Button>
        </Box>
      )}

      <Dialog open={rejectDialog.open} onClose={() => setRejectDialog({ ...rejectDialog, open: false })}>
        <DialogTitle>驳回原因</DialogTitle>
        <DialogContent>
          <TextField label="备注原因" fullWidth multiline rows={3} margin="normal" value={rejectDialog.remark} onChange={(e) => setRejectDialog({ ...rejectDialog, remark: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectDialog({ ...rejectDialog, open: false })}>取消</Button>
          <Button onClick={handleReject} color="error" variant="contained">确认驳回</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
