const api = require('../../utils/api');
const { formatDate, getPrescriptionStatus } = require('../../utils/util');

Page({
  data: {
    prescriptions: [],
  },

  onShow() {
    api.get('/prescriptions').then((list) => {
      this.setData({
        prescriptions: list.map((p) => ({
          ...p,
          created_at: formatDate(p.created_at),
          statusInfo: getPrescriptionStatus(p.status),
        })),
      });
    });
  },

  onUpload() {
    wx.chooseImage({ count: 3, sizeType: ['compressed'], sourceType: ['camera', 'album'] }).then((res) => {
      const tasks = res.tempFilePaths.map((path) => {
        return new Promise((resolve) => {
          wx.uploadFile({
            url: 'http://localhost:3000/api/upload',
            filePath: path,
            name: 'file',
            formData: { type: 'prescriptions' },
            header: { Authorization: 'Bearer ' + wx.getStorageSync('token') },
            success(r) {
              const data = JSON.parse(r.data);
              resolve(data.data ? data.data.url : '');
            },
            fail() { resolve(''); },
          });
        });
      });

      Promise.all(tasks).then((urls) => {
        const validUrls = urls.filter(Boolean);
        if (validUrls.length) {
          api.post('/prescriptions', { images: validUrls }).then(() => {
            wx.showToast({ title: '上传成功', icon: 'success' });
            this.onShow();
          });
        }
      });
    });
  },
});
