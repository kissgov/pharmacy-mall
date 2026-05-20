import { useState, useEffect } from 'react';
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Button, Typography, Chip, IconButton,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  CircularProgress, Snackbar, Alert,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import { couponAPI } from '../api';
import dayjs from 'dayjs';

export default function CouponList() {
  const navigate = useNavigate();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const loadCoupons = () => {
    setLoading(true);
    couponAPI.list().then((res) => {
      const data = res.data || res;
      setCoupons(Array.isArray(data) ? data : (data.list || []));
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { loadCoupons(); }, []);

  const handleDelete = () => {
    if (!deleteId) return;
    couponAPI.remove(deleteId).then(() => {
      setSnackbar({ open: true, message: '已删除', severity: 'success' });
      setDeleteId(null);
      loadCoupons();
    });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>优惠券管理</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/coupons/new')} sx={{ bgcolor: '#07c160', '&:hover': { bgcolor: '#06ad56' } }}>
          新增优惠券
        </Button>
      </Box>

      {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box> : (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>名称</TableCell>
                  <TableCell>类型</TableCell>
                  <TableCell>面值</TableCell>
                  <TableCell>使用门槛</TableCell>
                  <TableCell>已领取/总量</TableCell>
                  <TableCell>有效期</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {coupons.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.name}</TableCell>
                    <TableCell>{c.type === 'full_reduction' ? '满减' : '折扣'}</TableCell>
                    <TableCell sx={{ color: '#e53e3e', fontWeight: 'bold' }}>¥{(c.value || 0).toFixed(2)}</TableCell>
                    <TableCell>¥{(c.min_amount || 0).toFixed(2)}</TableCell>
                    <TableCell>{c.received_count || 0}/{c.total_count || '不限'}</TableCell>
                    <TableCell>
                      {c.valid_from ? dayjs(c.valid_from).format('MM/DD') : '-'} ~ {c.valid_to ? dayjs(c.valid_to).format('MM/DD') : '-'}
                    </TableCell>
                    <TableCell><Chip label={c.status === 'active' ? '有效' : '失效'} color={c.status === 'active' ? 'success' : 'default'} size="small" /></TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => navigate(`/coupons/${c.id}/edit`)}><EditIcon fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => setDeleteId(c.id)}><DeleteIcon fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {coupons.length === 0 && <TableRow><TableCell colSpan={8} align="center">暂无优惠券</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      <Dialog open={deleteId != null} onClose={() => setDeleteId(null)}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent><DialogContentText>确定要删除该优惠券吗？</DialogContentText></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>取消</Button>
          <Button onClick={handleDelete} color="error">删除</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
