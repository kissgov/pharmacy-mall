import { useState, useEffect } from 'react';
import {
  Box, Grid, Paper, Typography, Card, CardContent, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, CircularProgress,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import PeopleIcon from '@mui/icons-material/People';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { dashboardAPI, orderAPI } from '../api';
import dayjs from 'dayjs';

function StatCard({ title, value, icon, color, prefix }) {
  return (
    <Card>
      <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="body2" color="text.secondary">{title}</Typography>
          <Typography variant="h4" sx={{ fontWeight: 'bold', mt: 0.5 }}>
            {prefix}{typeof value === 'number' ? value.toLocaleString() : value}
          </Typography>
        </Box>
        <Box sx={{ width: 56, height: 56, borderRadius: '50%', bgcolor: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {icon}
        </Box>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      dashboardAPI.get(),
      orderAPI.list({ page_size: 5 }),
    ]).then(([dashData, orderData]) => {
      setStats(dashData.data || dashData);
      setRecentOrders((orderData.data?.list || orderData.list || []).slice(0, 5));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;
  }

  const s = stats || {};

  const chartData = (s.weeklySales || []).map((item) => ({
    date: item.date ? dayjs(item.date).format('MM/DD') : '',
    amount: item.amount || 0,
  }));

  const statusLabels = { pending: '待付款', paid: '已付款', shipped: '已发货', completed: '已完成', cancelled: '已取消' };
  const statusColors = { pending: '#e53e3e', paid: '#3182ce', shipped: '#dd6b20', completed: '#38a169', cancelled: '#999' };

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 3 }}>仪表盘</Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="今日订单数" value={s.todayOrders || 0} icon={<ShoppingCartIcon sx={{ color: '#fff' }} />} color="#3182ce" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="今日销售额" value={(s.todaySales || 0).toFixed(2)} icon={<TrendingUpIcon sx={{ color: '#fff' }} />} color="#38a169" prefix="¥" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="待审核处方" value={s.pendingPrescriptions || 0} icon={<LocalHospitalIcon sx={{ color: '#fff' }} />} color="#dd6b20" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard title="用户总数" value={s.totalUsers || 0} icon={<PeopleIcon sx={{ color: '#fff' }} />} color="#805ad5" />
        </Grid>
      </Grid>

      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>近 7 日销售趋势</Typography>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(v) => [`¥${Number(v).toFixed(2)}`, '销售额']} />
              <Area type="monotone" dataKey="amount" stroke="#07c160" fill="#07c160" fillOpacity={0.15} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <Typography color="text.secondary" sx={{ textAlign: 'center', py: 6 }}>暂无销售数据</Typography>
        )}
      </Paper>

      <Paper sx={{ mt: 3 }}>
        <Typography variant="h6" sx={{ p: 3, pb: 0 }}>最近订单</Typography>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>订单号</TableCell>
                <TableCell>用户</TableCell>
                <TableCell>金额</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>时间</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentOrders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>{o.order_no}</TableCell>
                  <TableCell>{o.user_name || o.user_phone || '-'}</TableCell>
                  <TableCell>¥{(o.pay_amount || 0).toFixed(2)}</TableCell>
                  <TableCell>
                    <Box component="span" sx={{ color: statusColors[o.status] || '#999', fontWeight: 'bold', fontSize: 13 }}>
                      {statusLabels[o.status] || o.status}
                    </Box>
                  </TableCell>
                  <TableCell>{o.created_at ? dayjs(o.created_at).format('MM-DD HH:mm') : '-'}</TableCell>
                </TableRow>
              ))}
              {recentOrders.length === 0 && (
                <TableRow><TableCell colSpan={5} align="center">暂无订单</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
