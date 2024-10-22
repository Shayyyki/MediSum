// pages/systemset/systemset.js
Page({
  data: {
    fontSize: wx.getStorageSync('fontSize') || 30, // 默认值为 30，如果没有存储的值
    volume: 30, // 初始滑块值
  },

  onLoad: function (options) {
    // 从存储中获取字体大小
    const fontSize = wx.getStorageSync('fontSize');

    // 如果存储中有字体大小，则根据字体大小设置滑块值
    if (fontSize) {
      this.setData({
        volume: parseInt(fontSize),
        fontSize: fontSize,
      });
    }
  },

  onVolumeSliderChange: function (event) {
    // 获取滑块的值
    const volume = event.detail.value;

    // 将字体大小存储到本地
    wx.setStorageSync('fontSize', parseInt(volume));
    // 更新滑块和字体大小的值
    this.setData({
      volume: volume,
      fontSize: volume,
    });
  },
});
