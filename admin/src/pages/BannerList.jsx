import { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardMedia, CardContent, CardActions, Typography,
  Button, IconButton, Switch, Dialog, DialogTitle, DialogContent,
  DialogContentText, DialogActions, CircularProgress, Snackbar, Alert,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { useNavigate } from 'react-router-dom';
import { bannerAPI } from '../api';

export default function BannerList() {
  const navigate = useNavigate();
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const loadBanners = () => {
    setLoading(true);
    bannerAPI.list().then((res) => {
      const data = res.data || res;
      setBanners(Array.isArray(data) ? data : (data.list || []));
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { loadBanners(); }, []);

  const handleToggleStatus = (b) => {
    const newStatus = b.status === 'active' ? 'inactive' : 'active';
    bannerAPI.update(b.id, { status: newStatus }).then(() => loadBanners());
  };

  const handleDelete = () => {
    if (!deleteId) return;
    bannerAPI.remove(deleteId).then(() => {
      setSnackbar({ open: true, message: '已删除', severity: 'success' });
      setDeleteId(null);
      loadBanners();
    });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>Banner 管理</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/banners/new')} sx={{ bgcolor: '#07c160', '&:hover': { bgcolor: '#06ad56' } }}>
          新增 Banner
        </Button>
      </Box>

      {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box> : (
        <Grid container spacing={3}>
          {banners.map((b) => (
            <Grid item xs={12} sm={6} md={4} key={b.id}>
              <Card>
                <CardMedia component="img" height="140" image={b.image_url} alt={b.title} sx={{ objectFit: 'cover', bgcolor: '#f5f5f5' }} />
                <CardContent sx={{ pb: 0 }}>
                  <Typography variant="subtitle1" fontWeight="bold">{b.title}</Typography>
                  <Typography variant="body2" color="text.secondary">排序: {b.sort}</Typography>
                </CardContent>
                <CardActions>
                  <Switch size="small" checked={b.status === 'active'} onChange={() => handleToggleStatus(b)} />
                  <Typography variant="caption" color={b.status === 'active' ? 'success.main' : 'text.secondary'}>
                    {b.status === 'active' ? '启用' : '禁用'}
                  </Typography>
                  <Box sx={{ flex: 1 }} />
                  <IconButton size="small" onClick={() => navigate(`/banners/${b.id}/edit`)}><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => setDeleteId(b.id)}><DeleteIcon fontSize="small" /></IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
          {banners.length === 0 && (
            <Grid item xs={12}>
              <Typography color="text.secondary" sx={{ textAlign: 'center', py: 8 }}>暂无 Banner</Typography>
            </Grid>
          )}
        </Grid>
      )}

      <Dialog open={deleteId != null} onClose={() => setDeleteId(null)}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent><DialogContentText>确定要删除该 Banner 吗？</DialogContentText></DialogContent>
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
