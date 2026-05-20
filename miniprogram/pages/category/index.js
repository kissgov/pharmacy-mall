const api = require('../../utils/api');
const { formatPrice } = require('../../utils/util');

Page({
  data: {
    categories: [],
    activeIndex: 0,
    subCategories: [],
    products: [],
  },

  onLoad() {
    api.get('/categories').then((categories) => {
      this.setData({ categories });
      if (categories.length > 0) {
        this.selectCategory(0, categories);
      }
    });
  },

  selectCategory(index, categories) {
    const cats = categories || this.data.categories;
    const cat = cats[index];
    if (!cat) return;

    // 子分类
    const subCategories = cat.children || [];
    this.setData({ activeIndex: index, subCategories });

    // 该分类下的商品
    api.get('/products', { category_id: cat.id, page_size: 50 }).then((data) => {
      const products = (data.list || []).map((p) => ({
        ...p,
        price: formatPrice(p.price),
        images: p.images ? JSON.parse(p.images) : [],
      }));
      this.setData({ products });
    });
  },

  onCategoryTap(e) {
    const { index } = e.currentTarget.dataset;
    this.selectCategory(index);
  },

  onSubCategoryTap(e) {
    const { id } = e.currentTarget.dataset;
    api.get('/products', { category_id: id, page_size: 50 }).then((data) => {
      const products = (data.list || []).map((p) => ({
        ...p,
        price: formatPrice(p.price),
        images: p.images ? JSON.parse(p.images) : [],
      }));
      this.setData({ products });
    });
  },
});
