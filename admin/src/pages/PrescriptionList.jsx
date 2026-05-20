import { useState, useEffect } from 'react';
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Button, Typography, Chip, Pagination, CircularProgress, Tabs, Tab,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { prescriptionAPI } from '../api';
import dayjs from 'dayjs';

const statusLabels = { pending: '待审核', approved: '已通过', rejected: '已驳回' };
const statusColors = { pending: 'warning', approved: 'success', rejected: 'error' };

export default function PrescriptionList() {
  const navigate = useNavigate();
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);

  const statuses = ['', 'pending', 'approved', 'rejected'];
  const tabLabels = ['全部', '待审核', '已通过', '已驳回'];

  const loadList = () => {
    setLoading(true);
    const params = { page, page_size: 20 };
    const s = statuses[tab];
    if (s) params.status = s;
    prescriptionAPI.list(params).then((res) => {
      const data = res.data || res;
      setList(data.list || []);
      setTotal(data.total || 0);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { loadList(); }, [page, tab]);

  const getFirstImage = (imagesStr) => {
    try { return JSON.parse(imagesStr || '[]')[0] || null; } catch { return null; }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>处方审核</Typography>

      <Tabs value={tab} onChange={(_, v) => { setTab(v); setPage(1); }} sx={{ mb: 2 }}>
        {tabLabels.map((label, i) => <Tab key={i} label={label} />)}
      </Tabs>

      {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box> : (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>用户名</TableCell>
                  <TableCell>处方图片</TableCell>
                  <TableCell>提交时间</TableCell>
                  <TableCell>状态</TableCell>
                  <TableCell>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {list.map((p) => {
                  const img = getFirstImage(p.images);
                  return (
                    <TableRow key={p.id}>
                      <TableCell>{p.id}</TableCell>
                      <TableCell>{p.user_name || p.user_phone || '-'}</TableCell>
                      <TableCell>
                        {img ? (
                          <img
                            src={img} alt=""
                            style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover', cursor: 'pointer' }}
                            onClick={() => window.open(img)}
                          />
                        ) : <Box sx={{ width: 80, height: 80, bgcolor: '#f5f5f5', borderRadius: 1 }} />}
                      </TableCell>
                      <TableCell>{p.created_at ? dayjs(p.created_at).format('MM-DD HH:mm') : '-'}</TableCell>
                      <TableCell><Chip label={statusLabels[p.status] || p.status} color={statusColors[p.status] || 'default'} size="small" /></TableCell>
                      <TableCell>
                        {p.status === 'pending' && (
                          <Button size="small" variant="contained" sx={{ bgcolor: '#07c160' }} onClick={() => navigate(`/prescriptions/${p.id}`)}>
                            审核
                          </Button>
                        )}
                        {p.status !== 'pending' && (
                          <Button size="small" onClick={() => navigate(`/prescriptions/${p.id}`)}>查看</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {list.length === 0 && <TableRow><TableCell colSpan={6} align="center">暂无处方</TableCell></TableRow>}
              </TableBody>
            </Table>
          </TableContainer>
          {total > 20 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <Pagination count={Math.ceil(total / 20)} page={page} onChange={(_, p) => setPage(p)} color="primary" />
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
}
