import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Card, CardContent, Grid, TextField, Button, Typography,
  CircularProgress, Snackbar, Alert,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { bannerAPI, uploadAPI } from '../api';

export default function BannerEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({ title: '', image_url: '', link_url: '', sort: 0 });
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    if (isEdit) {
      setLoading(true);
      bannerAPI.list().then((res) => {
        const data = res.data || res;
        const list = Array.isArray(data) ? data : (data.list || []);
        const b = list.find((item) => item.id === parseInt(id));
        if (b) {
          setForm({ title: b.title || '', image_url: b.image_url || '', link_url: b.link_url || '', sort: b.sort || 0 });
          setImagePreview(b.image_url || '');
        }
      }).finally(() => setLoading(false));
    }
  }, [id]);

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadAPI.upload(file);
      const url = res.data?.url || res.url;
      if (url) {
        setField('image_url', url);
        setImagePreview(url);
      }
    } catch { setSnackbar({ open: true, message: '上传失败', severity: 'error' }); }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.image_url) {
      setSnackbar({ open: true, message: '请填写标题并上传图片', severity: 'error' });
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await bannerAPI.update(id, form);
      } else {
        await bannerAPI.create(form);
      }
      setSnackbar({ open: true, message: '保存成功', severity: 'success' });
      setTimeout(() => navigate('/banners'), 800);
    } catch (err) {
      setSnackbar({ open: true, message: err?.message || '保存失败', severity: 'error' });
    }
    setSaving(false);
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>{isEdit ? '编辑 Banner' : '新增 Banner'}</Typography>
      <Card>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="subtitle2" gutterBottom>Banner 图片</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {imagePreview ? (
                  <Box sx={{ position: 'relative' }}>
                    <img src={imagePreview} alt="" onError={(e) => { e.target.style.display = 'none'; }} style={{ width: 300, height: 140, objectFit: 'cover', borderRadius: 8, border: '1px solid #eee' }} />
                  </Box>
                ) : (
                  <Box sx={{ width: 300, height: 140, bgcolor: '#f5f5f5', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography color="text.secondary">暂无图片</Typography>
                  </Box>
                )}
                <Button component="label" variant="outlined" startIcon={<CloudUploadIcon />} disabled={uploading}>
                  {uploading ? <CircularProgress size={20} /> : '上传图片'}
                  <input type="file" hidden accept="image/*" onChange={handleUpload} />
                </Button>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="标题" fullWidth required value={form.title} onChange={(e) => setField('title', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField label="排序" type="number" fullWidth value={form.sort} onChange={(e) => setField('sort', parseInt(e.target.value) || 0)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="跳转链接（选填）" fullWidth value={form.link_url} onChange={(e) => setField('link_url', e.target.value)} placeholder="如: /pages/product-detail/index?id=1" />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
        <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ bgcolor: '#07c160', '&:hover': { bgcolor: '#06ad56' } }}>
          {saving ? <CircularProgress size={24} color="inherit" /> : '保存'}
        </Button>
        <Button variant="outlined" onClick={() => navigate('/banners')}>取消</Button>
      </Box>
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
