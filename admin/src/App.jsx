import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './context/AuthContext';
import AdminLayout from './components/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProductList from './pages/ProductList';
import ProductEdit from './pages/ProductEdit';
import OrderList from './pages/OrderList';
import OrderDetail from './pages/OrderDetail';
import PrescriptionList from './pages/PrescriptionList';
import PrescriptionReview from './pages/PrescriptionReview';
import UserList from './pages/UserList';
import CouponList from './pages/CouponList';
import CouponEdit from './pages/CouponEdit';
import BannerList from './pages/BannerList';
import BannerEdit from './pages/BannerEdit';

const theme = createTheme({
  palette: {
    primary: { main: '#07c160' },
  },
});

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AdminLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/products" element={<ProductList />} />
              <Route path="/products/new" element={<ProductEdit />} />
              <Route path="/products/:id/edit" element={<ProductEdit />} />
              <Route path="/orders" element={<OrderList />} />
              <Route path="/orders/:id" element={<OrderDetail />} />
              <Route path="/prescriptions" element={<PrescriptionList />} />
              <Route path="/prescriptions/:id" element={<PrescriptionReview />} />
              <Route path="/users" element={<UserList />} />
              <Route path="/coupons" element={<CouponList />} />
              <Route path="/coupons/new" element={<CouponEdit />} />
              <Route path="/coupons/:id/edit" element={<CouponEdit />} />
              <Route path="/banners" element={<BannerList />} />
              <Route path="/banners/new" element={<BannerEdit />} />
              <Route path="/banners/:id/edit" element={<BannerEdit />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}
