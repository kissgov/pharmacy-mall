const api = require('../../utils/api');

Page({
  data: {
    id: null,
    form: {
      name: '',
      phone: '',
      province: '',
      city: '',
      district: '',
      detail: '',
      is_default: false,
    },
    region: ['', '', ''],
    isEdit: false,
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ id: parseInt(options.id, 10), isEdit: true });
      wx.setNavigationBarTitle({ title: '编辑地址' });
      api.get(`/addresses/${options.id}`).then((addr) => {
        this.setData({
          form: {
            name: addr.name || '',
            phone: addr.phone || '',
            province: addr.province || '',
            city: addr.city || '',
            district: addr.district || '',
            detail: addr.detail || '',
            is_default: !!addr.is_default,
          },
          region: [addr.province || '', addr.city || '', addr.district || ''],
        });
      });
    }
  },

  onInput(e) {
    const { field } = e.currentTarget.dataset;
    const form = { ...this.data.form, [field]: e.detail.value };
    this.setData({ form });
  },

  onRegionChange(e) {
    const region = e.detail.value;
    this.setData({
      region,
      form: {
        ...this.data.form,
        province: region[0],
        city: region[1],
        district: region[2],
      },
    });
  },

  onToggleDefault(e) {
    this.setData({ 'form.is_default': e.detail.value });
  },

  onSave() {
    const { form, id, isEdit } = this.data;
    if (!form.name.trim()) return wx.showToast({ title: '请输入姓名', icon: 'none' });
    if (!form.phone.trim()) return wx.showToast({ title: '请输入电话', icon: 'none' });
    if (!form.detail.trim()) return wx.showToast({ title: '请输入详细地址', icon: 'none' });

    const data = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      province: form.province,
      city: form.city,
      district: form.district,
      detail: form.detail.trim(),
      is_default: form.is_default ? 1 : 0,
    };

    const req = isEdit ? api.put(`/addresses/${id}`, data) : api.post('/addresses', data);

    req.then(() => {
      wx.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1200);
    }).catch((err) => {
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    });
  },
});
