// pages/imageDetail/imageDetail.js
const app = getApp();
Page({
  data: {
    fontSize: wx.getStorageSync('fontSize') || 30, // 默认值为 30，如果没有存储的值
    imagePath: "", // 识别的图片地址
  },

  onLoad: function (options) {
    this.setData({
      imagePath: decodeURIComponent(options.imagePath) // 从 options 中获取图片地址参数
    });
    this.setData({
      fontSize: wx.getStorageSync('fontSize') || 30
    })
  },
  onShow:function(){
    this.setData({
      fontSize: wx.getStorageSync('fontSize') || 30
    })
  },
  doedit(){
    wx.navigateTo({
      // url: '/pages/inputNote/inputNote',
      url: '/pages/inputNote/inputNote?imagePath=' + encodeURIComponent(this.data.imagePath),
    })
  },
 // 跳转到ocr界面
 doocr(){
    wx.navigateTo({
      // url: '/pages/ocr/ocr',
      url: '/pages/ocr/ocr?imagePath=' + encodeURIComponent(this.data.imagePath),
    })
  },
  dosimplify(){
    wx.navigateTo({
      url: '/pages/simplify/simplify?imagePath=' + encodeURIComponent(this.data.imagePath),
    })
  },
  dosearch(){
    wx.navigateTo({
      url: '/pages/search/search?imagePath=' + encodeURIComponent(this.data.imagePath),
    })
  },
  dochat(){
    wx.navigateTo({
      url: '/pages/chat/chat?imagePath=' + encodeURIComponent(this.data.imagePath),
    })
  },
})
