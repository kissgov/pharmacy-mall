import { useState, useEffect } from 'react';
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Button, Typography, Select, MenuItem, FormControl, InputLabel,
  Pagination, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  CircularProgress, Snackbar, Alert, Chip,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { orderAPI } from '../api';
import dayjs from 'dayjs';

const statusLabels = { pending: '待付款', paid: '已付款', shipped: '已发货', completed: '已完成', cancelled: '已取消' };
const statusColors = { pending: 'error', paid: 'info', shipped: 'warning', completed: 'success', cancelled: 'default' };

export default function OrderList() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [shipDialog, setShipDialog] = useState({ open: false, orderId: null, tracking_no: '', logistics_company: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const pageSize = 20;

  const loadOrders = () => {
    setLoading(true);
    const params = { page, page_size: pageSize };
    if (status) params.status = status;
    orderAPI.list(params).then((res) => {
      const data = res.data || res;
      setOrders(data.list || []);
      setTotal(data.total || 0);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { loadOrders(); }, [page, status]);

  const handleShip = () => {
    const { orderId, tracking_no, logistics_company } = shipDialog;
    if (!tracking_no.trim() || !logistics_company.trim()) {
      setSnackbar({ open: true, message: '请填写物流信息', severity: 'error' });
      return;
    }
    orderAPI.ship(orderId, { tracking_no, logistics_company }).then(() => {
      setSnackbar({ open: true, message: '发货成功', severity: 'success' });
      setShipDialog({ open: false, orderId: null, tracking_no: '', logistics_company: '' });
      loadOrders();
    }).catch((err) => {
      setSnackbar({ open: true, message: err?.message || '发货失败', severity: 'error' });
    });
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>订单管理</Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>状态</InputLabel>
          <Select value={status} label="状态" onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <MenuItem value="">全部</MenuItem>
            <MenuItem value="pending">待付款</MenuItem>
            <MenuItem value="paid">已付款</MenuItem>
            <MenuItem value="shipped">已发货</MenuItem>
            <MenuItem value="completed">已完成</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box> : (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>订单号</TableCell>
                  <TableCell>用户</TableCell>
                  <TableCell>金额</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>下单时间</TableCell>
                  <TableCell>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>{o.order_no}</TableCell>
                    <TableCell>{o.user_name || o.user_phone || '-'}</TableCell>
                    <TableCell sx={{ color: '#e53e3e', fontWeight: 'bold' }}>¥{(o.pay_amount || 0).toFixed(2)}</TableCell>
                    <TableCell><Chip label={statusLabels[o.status] || o.status} color={statusColors[o.status] || 'default'} size="small" /></TableCell>
                    <TableCell>{o.created_at ? dayjs(o.created_at).format('MM-DD HH:mm') : '-'}</TableCell>
                    <TableCell>
                      <Button size="small" onClick={() => navigate(`/orders/${o.id}`)}>详情</Button>
                      {o.status === 'paid' && (
                        <Button size="small" color="warning" onClick={() => setShipDialog({ open: true, orderId: o.id, tracking_no: '', logistics_company: '' })}>发货</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {orders.length === 0 && <TableRow><TableCell colSpan={6} align="center">暂无订单</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
          {total > pageSize && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <Pagination count={Math.ceil(total / pageSize)} page={page} onChange={(_, p) => setPage(p)} color="primary" />
            </Box>
          )}
        </Paper>
      )}

      <Dialog open={shipDialog.open} onClose={() => setShipDialog({ ...shipDialog, open: false })}>
        <DialogTitle>发货</DialogTitle>
        <DialogContent>
          <TextField label="物流公司" fullWidth margin="normal" value={shipDialog.logistics_company} onChange={(e) => setShipDialog({ ...shipDialog, logistics_company: e.target.value })} />
          <TextField label="快递单号" fullWidth margin="normal" value={shipDialog.tracking_no} onChange={(e) => setShipDialog({ ...shipDialog, tracking_no: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShipDialog({ ...shipDialog, open: false })}>取消</Button>
          <Button onClick={handleShip} variant="contained" sx={{ bgcolor: '#07c160' }}>确认发货</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
