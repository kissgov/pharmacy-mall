import axios from 'axios';

const http = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

// 请求拦截器 — 自动携带 admin token
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器 — 统一错误处理
http.interceptors.response.use(
  (res) => res.data,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('admin_token');
      window.location.href = '/login';
    }
    return Promise.reject(err.response?.data || err);
  },
);

// ========== 认证 ==========
export const authAPI = {
  login: (username, password) =>
    http.post('/admin/auth/login', { username, password }),
};

// ========== 仪表盘 ==========
export const dashboardAPI = {
  get: () => http.get('/admin/dashboard'),
};

// ========== 商品 ==========
export const productAPI = {
  list: (params) => http.get('/admin/products', { params }),
  create: (data) => http.post('/admin/products', data),
  update: (id, data) => http.put(`/admin/products/${id}`, data),
  updateStatus: (id, status) =>
    http.put(`/admin/products/${id}/status`, { status }),
  remove: (id) => http.delete(`/admin/products/${id}`),
};

// ========== 订单 ==========
export const orderAPI = {
  list: (params) => http.get('/admin/orders', { params }),
  detail: (id) => http.get(`/admin/orders/${id}`),
  ship: (id, data) => http.put(`/admin/orders/${id}/ship`, data),
};

// ========== 处方 ==========
export const prescriptionAPI = {
  list: (params) => http.get('/admin/prescriptions', { params }),
  detail: (id) => http.get(`/admin/prescriptions/${id}`),
  review: (id, data) =>
    http.put(`/admin/prescriptions/${id}/review`, data),
};

// ========== 用户 ==========
export const userAPI = {
  list: (params) => http.get('/admin/users', { params }),
};

// ========== 优惠券 ==========
export const couponAPI = {
  list: () => http.get('/admin/coupons'),
  create: (data) => http.post('/admin/coupons', data),
  update: (id, data) => http.put(`/admin/coupons/${id}`, data),
  remove: (id) => http.delete(`/admin/coupons/${id}`),
};

// ========== Banner ==========
export const bannerAPI = {
  list: () => http.get('/admin/banners'),
  create: (data) => http.post('/admin/banners', data),
  update: (id, data) => http.put(`/admin/banners/${id}`, data),
  remove: (id) => http.delete(`/admin/banners/${id}`),
};

// ========== 上传 ==========
export const uploadAPI = {
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const token = localStorage.getItem('admin_token');
    // 不指定 Content-Type，让浏览器自动带 boundary
    return axios
      .post('/api/upload?type=products', formData, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      .then((res) => res.data);
  },
};

// ========== 分类（公开） ==========
export const categoryAPI = {
  getTree: () => http.get('/categories'),
};

export default http;
