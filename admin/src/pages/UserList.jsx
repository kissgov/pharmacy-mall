import { useState, useEffect } from 'react';
import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, Typography, Chip, Pagination, CircularProgress, TextField, Button,
  Avatar,
} from '@mui/material';
import { userAPI } from '../api';
import dayjs from 'dayjs';

const levelLabels = { normal: '普通会员', silver: '银卡会员', gold: '金卡会员', diamond: '钻石会员' };
const levelColors = { normal: 'default', silver: 'info', gold: 'warning', diamond: 'error' };

export default function UserList() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadUsers = (p = page) => {
    setLoading(true);
    const params = { page: p, page_size: 20 };
    if (search.trim()) params.q = search.trim();
    userAPI.list(params).then((res) => {
      const data = res.data || res;
      setUsers(data.list || []);
      setTotal(data.total || 0);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { loadUsers(); }, [page]);

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>用户管理</Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField size="small" placeholder="搜索昵称或手机号" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (setPage(1), loadUsers(1))} />
        <Button variant="outlined" onClick={() => { setPage(1); loadUsers(1); }}>搜索</Button>
      </Box>

      {loading ? <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box> : (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>头像</TableCell>
                  <TableCell>昵称</TableCell>
                  <TableCell>手机号</TableCell>
                  <TableCell>会员等级</TableCell>
                  <TableCell>积分</TableCell>
                  <TableCell>注册时间</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <Avatar src={u.avatar_url} sx={{ width: 40, height: 40 }} />
                    </TableCell>
                    <TableCell>{u.nickname || '-'}</TableCell>
                    <TableCell>{u.phone || '-'}</TableCell>
                    <TableCell><Chip label={levelLabels[u.member_level] || u.member_level} color={levelColors[u.member_level] || 'default'} size="small" /></TableCell>
                    <TableCell>{u.points}</TableCell>
                    <TableCell>{u.created_at ? dayjs(u.created_at).format('YYYY-MM-DD') : '-'}</TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && <TableRow><TableCell colSpan={6} align="center">暂无用户</TableCell></TableRow>}
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
