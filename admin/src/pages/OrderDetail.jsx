import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Button, Chip,
  CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar, Alert,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { orderAPI } from '../api';
import dayjs from 'dayjs';

const statusLabels = { pending: '待付款', paid: '已付款', shipped: '已发货', completed: '已完成', cancelled: '已取消' };
const statusColors = { pending: 'error', paid: 'info', shipped: 'warning', completed: 'success', cancelled: 'default' };

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shipDialog, setShipDialog] = useState({ open: false, tracking_no: '', logistics_company: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const loadOrder = () => {
    setLoading(true);
    orderAPI.detail(id).then((res) => {
      setOrder(res.data || res);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { loadOrder(); }, [id]);

  const handleShip = () => {
    const { tracking_no, logistics_company } = shipDialog;
    if (!tracking_no.trim() || !logistics_company.trim()) {
      setSnackbar({ open: true, message: '请填写物流信息', severity: 'error' });
      return;
    }
    orderAPI.ship(id, { tracking_no, logistics_company }).then(() => {
      setSnackbar({ open: true, message: '发货成功', severity: 'success' });
      setShipDialog({ open: false, tracking_no: '', logistics_company: '' });
      loadOrder();
    });
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  if (!order) return <Typography>订单不存在</Typography>;

  const items = order.items || [];

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/orders')}>返回</Button>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>订单详情</Typography>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="body2" color="text.secondary">订单号: {order.order_no}</Typography>
              <Typography variant="body2" color="text.secondary">下单时间: {order.created_at ? dayjs(order.created_at).format('YYYY-MM-DD HH:mm') : '-'}</Typography>
            </Box>
            <Chip label={statusLabels[order.status] || order.status} color={statusColors[order.status] || 'default'} />
          </Box>
        </CardContent>
      </Card>

      {/* 物流 */}
      {order.tracking_no && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>物流信息</Typography>
            <Typography>{order.logistics_company} — {order.tracking_no}</Typography>
          </CardContent>
        </Card>
      )}

      {/* 收货地址 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom>收货地址</Typography>
          <Typography variant="body2">
            {(() => { try { const a = JSON.parse(order.address_snapshot || '{}'); return `${a.name} ${a.phone} ${a.province || ''}${a.city || ''}${a.district || ''} ${a.detail || ''}`; } catch { return order.address_snapshot || '-'; } })()}
          </Typography>
        </CardContent>
      </Card>

      {/* 商品 */}
      <Paper sx={{ mb: 3 }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>商品</TableCell>
                <TableCell>单价</TableCell>
                <TableCell>数量</TableCell>
                <TableCell>小计</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {item.product_image && <img src={item.product_image} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />}
                      <Typography variant="body2">{item.product_name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>¥{(item.price || 0).toFixed(2)}</TableCell>
                  <TableCell>{item.quantity}</TableCell>
                  <TableCell>¥{(item.subtotal || 0).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 金额明细 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}><Typography variant="body2">商品总额</Typography><Typography>¥{(order.total_amount || 0).toFixed(2)}</Typography></Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}><Typography variant="body2" color="error">优惠</Typography><Typography color="error">-¥{(order.discount_amount || 0).toFixed(2)}</Typography></Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}><Typography variant="body2">运费</Typography><Typography>免运费</Typography></Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderTop: '1px solid #eee', mt: 1 }}>
            <Typography variant="subtitle1" fontWeight="bold">实付</Typography>
            <Typography variant="subtitle1" fontWeight="bold" color="#e53e3e">¥{(order.pay_amount || 0).toFixed(2)}</Typography>
          </Box>
        </CardContent>
      </Card>

      {/* 操作 */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        {order.status === 'paid' && (
          <Button variant="contained" onClick={() => setShipDialog({ open: true, tracking_no: '', logistics_company: '' })} sx={{ bgcolor: '#dd6b20' }}>
            发货
          </Button>
        )}
      </Box>

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
