const api = require('../../utils/api');
const { formatPrice } = require('../../utils/util');

Page({
  data: {
    items: [],
    allChecked: false,
    totalAmount: '0.00',
    editMode: false,
    loading: true,
  },

  onShow() {
    this.loadCart();
  },

  loadCart() {
    this.setData({ loading: true });
    api.get('/cart').then((items) => {
      const list = items.map((item) => ({
        ...item,
        checked: false,
        price: formatPrice(item.price || 0),
        price_raw: item.price || 0,
        images: item.product_images ? (typeof item.product_images === 'string' ? JSON.parse(item.product_images) : item.product_images) : [],
        image: '',
      }));
      // 预处理图片（提取第一张）
      list.forEach((item) => {
        item.image = (item.images && item.images[0]) || '';
      });
      this.setData({ items: list, loading: false }, this.calcTotal);
    }).catch(() => {
      this.setData({ loading: false });
    });
  },

  /** 单个切换 */
  onToggle(e) {
    const { id } = e.detail;
    const items = this.data.items.map((item) => {
      if (item.id === id) item.checked = !item.checked;
      return item;
    });
    this.setData({ items }, this.calcTotal);
  },

  /** 全选切换 */
  onToggleAll() {
    const allChecked = !this.data.allChecked;
    const items = this.data.items.map((item) => {
      item.checked = allChecked;
      return item;
    });
    this.setData({ items, allChecked }, this.calcTotal);
  },

  /** 计算总金额 */
  calcTotal() {
    const checkedItems = this.data.items.filter((i) => i.checked);
    const total = checkedItems.reduce((sum, i) => sum + i.price_raw * i.quantity, 0);
    const allChecked = this.data.items.length > 0 && checkedItems.length === this.data.items.length;
    this.setData({ totalAmount: formatPrice(total || 0), allChecked });
  },

  /** 数量减 */
  onMinus(e) {
    const { id, quantity } = e.detail;
    api.put(`/cart/${id}`, { quantity }).then(() => this.loadCart());
  },

  /** 数量加 */
  onPlus(e) {
    const { id, quantity } = e.detail;
    api.put(`/cart/${id}`, { quantity }).then(() => this.loadCart());
  },

  /** 切换管理模式 */
  onToggleMode() {
    this.setData({ editMode: !this.data.editMode });
  },

  /** 删除选中 */
  onDelete() {
    const ids = this.data.items.filter((i) => i.checked).map((i) => i.id);
    if (ids.length === 0) return;
    wx.showModal({
      title: '确认删除',
      content: `确定要删除选中的 ${ids.length} 件商品吗？`,
      success: (res) => {
        if (res.confirm) {
          Promise.all(ids.map((id) => api.del(`/cart/${id}`))).then(() => {
            wx.showToast({ title: '已删除', icon: 'success' });
            this.loadCart();
          });
        }
      },
    });
  },

  /** 结算 */
  onCheckout() {
    const checked = this.data.items.filter((i) => i.checked);
    if (checked.length === 0) {
      wx.showToast({ title: '请选择商品', icon: 'none' });
      return;
    }
    const ids = checked.map((i) => i.id).join(',');
    wx.navigateTo({ url: `/pages/checkout/index?cartIds=${ids}` });
  },

  /** 空状态去逛逛 */
  onGoHome() {
    wx.switchTab({ url: '/pages/index/index' });
  },
});
