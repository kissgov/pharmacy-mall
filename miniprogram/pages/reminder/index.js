const api = require('../../utils/api');

Page({
  data: {
    reminders: [],
    showPopup: false,
    editId: null,
    form: {
      drug_name: '',
      dosage: '',
      frequency: '每日',
      time: '08:00',
      start_date: '',
      end_date: '',
    },
    frequencies: ['每日', '每12小时', '每8小时', '每6小时'],
  },

  onShow() {
    api.get('/reminders').then((list) => {
      this.setData({ reminders: list });
    });
  },

  onAdd() {
    this.setData({
      showPopup: true,
      editId: null,
      form: { drug_name: '', dosage: '', frequency: '每日', time: '08:00', start_date: '', end_date: '' },
    });
  },

  onEdit(e) {
    const { id } = e.currentTarget.dataset;
    const reminder = this.data.reminders.find((r) => r.id === id);
    if (!reminder) return;
    this.setData({
      showPopup: true,
      editId: id,
      form: {
        drug_name: reminder.drug_name || '',
        dosage: reminder.dosage || '',
        frequency: reminder.frequency || '每日',
        time: reminder.time || '08:00',
        start_date: reminder.start_date || '',
        end_date: reminder.end_date || '',
      },
    });
  },

  onDelete(e) {
    const { id } = e.currentTarget.dataset;
    wx.showModal({
      title: '删除提醒',
      content: '确定删除？',
      success: (res) => {
        if (res.confirm) {
          api.del(`/reminders/${id}`).then(() => {
            wx.showToast({ title: '已删除', icon: 'success' });
            this.onShow();
          });
        }
      },
    });
  },

  onToggleActive(e) {
    const { id } = e.currentTarget.dataset;
    const reminder = this.data.reminders.find((r) => r.id === id);
    if (!reminder) return;
    api.put(`/reminders/${id}`, { is_active: reminder.is_active ? 0 : 1 }).then(() => this.onShow());
  },

  onInput(e) {
    const { field } = e.currentTarget.dataset;
    const form = { ...this.data.form, [field]: e.detail.value };
    this.setData({ form });
  },

  onFrequencyChange(e) {
    this.setData({ 'form.frequency': this.data.frequencies[e.detail.value] });
  },

  onTimeChange(e) {
    this.setData({ 'form.time': e.detail.value });
  },

  onDateChange(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  onClosePopup() {
    this.setData({ showPopup: false });
  },

  onSave() {
    const { form, editId } = this.data;
    if (!form.drug_name.trim()) return wx.showToast({ title: '请输入药品名', icon: 'none' });

    const req = editId
      ? api.put(`/reminders/${editId}`, form)
      : api.post('/reminders', form);

    req.then(() => {
      this.setData({ showPopup: false });
      wx.showToast({ title: '保存成功', icon: 'success' });
      this.onShow();
    }).catch((err) => {
      wx.showToast({ title: err.message || '保存失败', icon: 'none' });
    });
  },
});
