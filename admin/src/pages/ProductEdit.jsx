import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Card, CardContent, Grid, TextField, Button, Typography,
  Switch, FormControlLabel, Select, MenuItem, FormControl, InputLabel,
  IconButton, CircularProgress, Snackbar, Alert,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { productAPI, uploadAPI, categoryAPI } from '../api';

export default function ProductEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    name: '', category_id: '', brand: '', manufacturer: '', specification: '',
    approval_number: '', price: '', member_price: '', stock: '',
    is_prescription: false, usage_dosage: '', contraindications: '',
    images: [],
  });
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    categoryAPI.getTree().then((res) => {
      const data = res.data || res;
      setCategories(data || []);
    }).catch(() => {});

    if (isEdit) {
      setLoading(true);
      productAPI.list({}).then((res) => {
        const data = res.data || res;
        const list = data.list || [];
        const found = list.find((p) => p.id === parseInt(id));
        if (found) {
          let images = [];
          try { images = JSON.parse(found.images || '[]'); } catch { /* ignore */ }
          setForm({
            name: found.name || '',
            category_id: found.category_id || '',
            brand: found.brand || '',
            manufacturer: found.manufacturer || '',
            specification: found.specification || '',
            approval_number: found.approval_number || '',
            price: found.price || '',
            member_price: found.member_price || '',
            stock: found.stock || '',
            is_prescription: !!found.is_prescription,
            usage_dosage: found.usage_dosage || '',
            contraindications: found.contraindications || '',
            images,
          });
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
        setForm((prev) => ({ ...prev, images: [...prev.images, url] }));
      }
    } catch { setSnackbar({ open: true, message: '上传失败', severity: 'error' }); }
    setUploading(false);
  };

  const handleRemoveImage = (index) => {
    setForm((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setSnackbar({ open: true, message: '请输入商品名称', severity: 'error' });
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      category_id: parseInt(form.category_id, 10) || 0,
      price: parseFloat(form.price) || 0,
      member_price: form.member_price ? parseFloat(form.member_price) : null,
      stock: parseInt(form.stock, 10) || 0,
      is_prescription: form.is_prescription ? 1 : 0,
      images: JSON.stringify(form.images),
    };
    try {
      if (isEdit) {
        await productAPI.update(id, payload);
      } else {
        await productAPI.create(payload);
      }
      setSnackbar({ open: true, message: '保存成功', severity: 'success' });
      setTimeout(() => navigate('/products'), 800);
    } catch (err) {
      setSnackbar({ open: true, message: err?.message || '保存失败', severity: 'error' });
    }
    setSaving(false);
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>{isEdit ? '编辑商品' : '新增商品'}</Typography>
      <Card>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField label="商品名称" fullWidth required value={form.name} onChange={(e) => setField('name', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>所属分类</InputLabel>
                <Select value={form.category_id} label="所属分类" onChange={(e) => setField('category_id', e.target.value)}>
                  {categories.map((cat) => [
                    <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>,
                    ...(cat.children || []).map((sub) => (
                      <MenuItem key={sub.id} value={sub.id} sx={{ pl: 4 }}>{sub.name}</MenuItem>
                    )),
                  ])}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="品牌" fullWidth value={form.brand} onChange={(e) => setField('brand', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="生产厂家" fullWidth value={form.manufacturer} onChange={(e) => setField('manufacturer', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="规格" fullWidth value={form.specification} onChange={(e) => setField('specification', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="批准文号" fullWidth value={form.approval_number} onChange={(e) => setField('approval_number', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="价格" type="number" fullWidth value={form.price} onChange={(e) => setField('price', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="会员价" type="number" fullWidth value={form.member_price} onChange={(e) => setField('member_price', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="库存" type="number" fullWidth value={form.stock} onChange={(e) => setField('stock', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={<Switch checked={form.is_prescription} onChange={(e) => setField('is_prescription', e.target.checked)} />}
                label="处方药"
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>商品图片</Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {form.images.map((img, i) => (
                  <Box key={i} sx={{ position: 'relative', width: 80, height: 80 }}>
                    <img src={img} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} />
                    <IconButton size="small" sx={{ position: 'absolute', top: -8, right: -8, bgcolor: '#fff' }} onClick={() => handleRemoveImage(i)}>
                      <DeleteIcon fontSize="small" color="error" />
                    </IconButton>
                  </Box>
                ))}
                <Button component="label" variant="outlined" startIcon={<CloudUploadIcon />} disabled={uploading} sx={{ width: 80, height: 80, minWidth: 0 }}>
                  {uploading ? <CircularProgress size={20} /> : '上传'}
                  <input type="file" hidden accept="image/*" onChange={handleUpload} />
                </Button>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="用法用量" multiline rows={3} fullWidth value={form.usage_dosage} onChange={(e) => setField('usage_dosage', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="禁忌" multiline rows={3} fullWidth value={form.contraindications} onChange={(e) => setField('contraindications', e.target.value)} />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
        <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ bgcolor: '#07c160', '&:hover': { bgcolor: '#06ad56' } }}>
          {saving ? <CircularProgress size={24} color="inherit" /> : '保存'}
        </Button>
        <Button variant="outlined" onClick={() => navigate('/products')}>取消</Button>
      </Box>
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
