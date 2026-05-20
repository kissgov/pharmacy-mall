import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box, Card, CardContent, Grid, TextField, Button, Typography,
  Select, MenuItem, FormControl, InputLabel, CircularProgress, Snackbar, Alert,
} from '@mui/material';
import { couponAPI } from '../api';

export default function CouponEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    name: '', type: 'full_reduction', value: '', min_amount: '',
    total_count: '', valid_from: '', valid_to: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  useEffect(() => {
    if (isEdit) {
      setLoading(true);
      couponAPI.list().then((res) => {
        const data = res.data || res;
        const list = Array.isArray(data) ? data : (data.list || []);
        const c = list.find((item) => item.id === parseInt(id));
        if (c) {
          setForm({
            name: c.name || '',
            type: c.type || 'full_reduction',
            value: c.value || '',
            min_amount: c.min_amount || '',
            total_count: c.total_count || '',
            valid_from: c.valid_from ? c.valid_from.slice(0, 16) : '',
            valid_to: c.valid_to ? c.valid_to.slice(0, 16) : '',
          });
        }
      }).finally(() => setLoading(false));
    }
  }, [id]);

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      setSnackbar({ open: true, message: '请输入名称', severity: 'error' });
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      value: parseFloat(form.value) || 0,
      min_amount: parseFloat(form.min_amount) || 0,
      total_count: form.total_count ? parseInt(form.total_count, 10) : null,
    };
    try {
      if (isEdit) {
        await couponAPI.update(id, payload);
      } else {
        await couponAPI.create(payload);
      }
      setSnackbar({ open: true, message: '保存成功', severity: 'success' });
      setTimeout(() => navigate('/coupons'), 800);
    } catch (err) {
      setSnackbar({ open: true, message: err?.message || '保存失败', severity: 'error' });
    }
    setSaving(false);
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>{isEdit ? '编辑优惠券' : '新增优惠券'}</Typography>
      <Card>
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField label="优惠券名称" fullWidth required value={form.name} onChange={(e) => setField('name', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>类型</InputLabel>
                <Select value={form.type} label="类型" onChange={(e) => setField('type', e.target.value)}>
                  <MenuItem value="full_reduction">满减</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="面值(元)" type="number" fullWidth value={form.value} onChange={(e) => setField('value', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="使用门槛(元)" type="number" fullWidth value={form.min_amount} onChange={(e) => setField('min_amount', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField label="发放总量(留空不限)" type="number" fullWidth value={form.total_count} onChange={(e) => setField('total_count', e.target.value)} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="有效期开始" type="datetime-local" fullWidth value={form.valid_from} onChange={(e) => setField('valid_from', e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField label="有效期结束" type="datetime-local" fullWidth value={form.valid_to} onChange={(e) => setField('valid_to', e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
        <Button variant="contained" onClick={handleSave} disabled={saving} sx={{ bgcolor: '#07c160', '&:hover': { bgcolor: '#06ad56' } }}>
          {saving ? <CircularProgress size={24} color="inherit" /> : '保存'}
        </Button>
        <Button variant="outlined" onClick={() => navigate('/coupons')}>取消</Button>
      </Box>
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}
