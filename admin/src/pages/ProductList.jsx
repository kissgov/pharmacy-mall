import { useState, useEffect } from 'react';
import {
  Box, Button, TextField, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Paper, IconButton, Switch, Chip, Typography,
  Pagination, Dialog, DialogTitle, DialogContent, DialogContentText,
  DialogActions, CircularProgress, Snackbar, Alert,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import { productAPI } from '../api';

export default function ProductList() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const pageSize = 20;

  const loadProducts = (p = page, q = search) => {
    setLoading(true);
    const params = { page: p, page_size: pageSize };
    if (q) params.q = q;
    productAPI.list(params).then((res) => {
      const data = res.data || res;
      setProducts(data.list || []);
      setTotal(data.total || 0);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { loadProducts(); }, [page]);

  const handleSearch = () => { setPage(1); loadProducts(1, search); };

  const handleToggleStatus = (id, currentStatus) => {
    const newStatus = currentStatus === 'on' ? 'off' : 'on';
    productAPI.updateStatus(id, newStatus).then(() => {
      setSnackbar({ open: true, message: newStatus === 'on' ? '已上架' : '已下架', severity: 'success' });
      loadProducts();
    });
  };

  const handleDelete = () => {
    if (deleteId == null) return;
    productAPI.remove(deleteId).then(() => {
      setSnackbar({ open: true, message: '已删除', severity: 'success' });
      setDeleteId(null);
      loadProducts();
    });
  };

  const getImage = (imagesStr) => {
    try {
      const arr = JSON.parse(imagesStr || '[]');
      return arr[0] || null;
    } catch { return null; }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>商品管理</Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField size="small" placeholder="搜索商品名称" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
        <Button variant="outlined" onClick={handleSearch}>搜索</Button>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/products/new')} sx={{ bgcolor: '#07c160', '&:hover': { bgcolor: '#06ad56' } }}>
          新增商品
        </Button>
      </Box>

      {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box> : (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>图片</TableCell>
                  <TableCell>名称</TableCell>
                  <TableCell>分类</TableCell>
                  <TableCell>价格</TableCell>
                  <TableCell>库存</TableCell>
                  <TableCell>处方药</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      {getImage(p.images) ? (
                        <img src={getImage(p.images)} alt="" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} style={{ width: 60, height: 60, borderRadius: 8, objectFit: 'cover', background: '#f5f5f5' }} />
                      ) : null}
                      <Box sx={{ width: 60, height: 60, borderRadius: 1, bgcolor: '#f5f5f5', display: getImage(p.images) ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>💊</Box>
                    </TableCell>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>{p.category_name || '-'}</TableCell>
                    <TableCell sx={{ color: '#e53e3e', fontWeight: 'bold' }}>¥{(p.price || 0).toFixed(2)}</TableCell>
                    <TableCell>{p.stock}</TableCell>
                    <TableCell>
                      <Chip label={p.is_prescription ? '是' : '否'} size="small" color={p.is_prescription ? 'warning' : 'default'} />
                    </TableCell>
                    <TableCell>
                      <Chip label={p.status === 'on' ? '上架' : '下架'} size="small" color={p.status === 'on' ? 'success' : 'default'} />
                    </TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => navigate(`/products/${p.id}/edit`)}><EditIcon fontSize="small" /></IconButton>
                      <Switch size="small" checked={p.status === 'on'} onChange={() => handleToggleStatus(p.id, p.status)} />
                      <IconButton size="small" color="error" onClick={() => setDeleteId(p.id)}><DeleteIcon fontSize="small" /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {products.length === 0 && (
                  <TableRow><TableCell colSpan={8} align="center">暂无商品</TableCell></TableRow>
                )}
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

      {/* 删除确认 */}
      <Dialog open={deleteId != null} onClose={() => setDeleteId(null)}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent><DialogContentText>确定要删除该商品吗？此操作不可撤销。</DialogContentText></DialogContent>
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
