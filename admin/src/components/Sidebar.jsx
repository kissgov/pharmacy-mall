import { useLocation, useNavigate } from 'react-router-dom';
import {
  Drawer, List, ListItemButton, ListItemIcon, ListItemText,
  Divider, Box, Typography,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import InventoryIcon from '@mui/icons-material/Inventory';
import ReceiptIcon from '@mui/icons-material/Receipt';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import PeopleIcon from '@mui/icons-material/People';
import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import ViewCarouselIcon from '@mui/icons-material/ViewCarousel';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../context/AuthContext';

const DRAWER_WIDTH = 240;

const menuItems = [
  { path: '/dashboard', label: '仪表盘', icon: <DashboardIcon /> },
  { path: '/products', label: '商品管理', icon: <InventoryIcon /> },
  { path: '/orders', label: '订单管理', icon: <ReceiptIcon /> },
  { path: '/prescriptions', label: '处方审核', icon: <LocalHospitalIcon /> },
  { path: '/users', label: '用户管理', icon: <PeopleIcon /> },
  { path: '/coupons', label: '优惠券管理', icon: <CardGiftcardIcon /> },
  { path: '/banners', label: 'Banner 管理', icon: <ViewCarouselIcon /> },
];

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  const isActive = (path) => {
    if (path === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(path);
  };

  const handleNav = (path) => {
    navigate(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          bgcolor: '#1a1a2e',
          color: '#fff',
        },
      }}
    >
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ color: '#07c160', fontWeight: 'bold' }}>
          药店管理后台
        </Typography>
      </Box>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
      <List sx={{ flex: 1 }}>
        {menuItems.map((item) => (
          <ListItemButton
            key={item.path}
            onClick={() => handleNav(item.path)}
            sx={{
              mx: 1,
              borderRadius: 1,
              mb: 0.5,
              color: isActive(item.path) ? '#07c160' : 'rgba(255,255,255,0.7)',
              bgcolor: isActive(item.path) ? 'rgba(7,193,96,0.12)' : 'transparent',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
            }}
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14 }} />
          </ListItemButton>
        ))}
      </List>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
      <ListItemButton
        onClick={handleLogout}
        sx={{ mx: 1, borderRadius: 1, my: 1, color: 'rgba(255,255,255,0.7)', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' } }}
      >
        <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
          <LogoutIcon />
        </ListItemIcon>
        <ListItemText primary="退出登录" primaryTypographyProps={{ fontSize: 14 }} />
      </ListItemButton>
    </Drawer>
  );
}
