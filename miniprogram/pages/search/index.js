const api = require('../../utils/api');
const { formatPrice, debounce } = require('../../utils/util');

Page({
  data: {
    keyword: '',
    history: [],
    results: [],
    hasMore: true,
    page: 1,
    searched: false,
  },

  onLoad() {
    const history = wx.getStorageSync('searchHistory') || [];
    this.setData({ history });
  },

  onInput(e) {
    const keyword = e.detail.value;
    this.setData({ keyword });
    if (keyword.trim()) {
      this.debounceSearch(keyword.trim());
    } else {
      this.setData({ results: [], searched: false });
    }
  },

  /** 防抖搜索 */
  debounceSearch: debounce(function (q) {
    this.setData({ page: 1, searched: true });
    api.get('/products/search', { q, page: 1, page_size: 20 }).then((data) => {
      this.setData({
        results: (data.list || []).map((p) => ({
          ...p,
          price: formatPrice(p.price),
          images: p.images ? JSON.parse(p.images) : [],
        })),
        hasMore: data.total > 20,
      });
    });
  }, 300),

  /** 加载更多 */
  onReachBottom() {
    if (!this.data.hasMore || !this.data.keyword.trim()) return;
    const page = this.data.page + 1;
    api.get('/products/search', { q: this.data.keyword.trim(), page, page_size: 20 }).then((data) => {
      const results = this.data.results.concat(
        (data.list || []).map((p) => ({
          ...p,
          price: formatPrice(p.price),
          images: p.images ? JSON.parse(p.images) : [],
        }))
      );
      this.setData({ results, page, hasMore: results.length < data.total });
    });
  },

  /** 点击搜索 */
  onSearch() {
    const { keyword } = this.data;
    if (!keyword.trim()) return;
    // 保存历史
    let history = this.data.history.filter((h) => h !== keyword);
    history.unshift(keyword);
    if (history.length > 10) history = history.slice(0, 10);
    wx.setStorageSync('searchHistory', history);
    this.setData({ history });
    this.debounceSearch(keyword.trim());
  },

  onHistoryTap(e) {
    const { word } = e.currentTarget.dataset;
    this.setData({ keyword: word });
    this.onSearch();
  },

  onClearHistory() {
    wx.removeStorageSync('searchHistory');
    this.setData({ history: [] });
  },

  onCancel() {
    wx.navigateBack();
  },
});
