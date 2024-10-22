// pages/inputNote/inputNote.js
Page({
  data: {
    fontSize: wx.getStorageSync('fontSize') || 30, // 默认值为 30，如果没有存储的值
    imagePath:'',
    name: '',
    order:'',
    note: '',
    highlightWord: [], // 用于存储用户选择的词汇
    customHighlightWord: [] // 用于存储用户输入的自定义高亮词汇
  },

  onLoad: function (options) {
    this.setData({
      fontSize: wx.getStorageSync('fontSize') || 30
    })
    this.setData({
      imagePath: decodeURIComponent(options.imagePath) // 从 options 中获取图片地址参数
    });
  },

  onShow: function(){
    this.setData({
      fontSize: wx.getStorageSync('fontSize') || 30
    })
    console.log("this.data.imagePath",this.data.imagePath)
    var that = this;
    wx.cloud.init({
      env: 'cloud1-6gcva1k9bc9b81e3', // 这里替换为你的云开发环境 ID
      traceUser: true, 
    })
    wx.cloud.database().collection('medi_instruction').where({
      imagePath: this.data.imagePath
    }).get().then(res => {
      if (res.data.length > 0) {
        // 如果找到匹配的记录，设置页面的数据
        that.setData({
          name: res.data[0].name,
          order: res.data[0].order,
          note: res.data[0].note,
          highlightWord: res.data[0].highlightWord,
          customHighlightWord: res.data[0].customHighlightWord,
        });
        // 更新复选框的状态
        that.updateCheckboxState();
      }
    });

    
  },

  // 新增一个方法用于更新复选框状态
updateCheckboxState: function() {
  const highlightWord = this.data.highlightWord;

  // 更新复选框状态
  this.setData({
    checkboxValues: {
      '酒': highlightWord.includes('酒'),
      '儿童': highlightWord.includes('儿童'),
      '孕妇': highlightWord.includes('孕妇'),
      '老年人': highlightWord.includes('老年人'),
      '过敏': highlightWord.includes('过敏'),
    }
  });
},
  inputName(e) {
    this.setData({
      name: e.detail.value
    })
  },
  inputOrder(e) {
    this.setData({
      order: e.detail.value
    })
  },
  inputNote(e) {
    this.setData({
      note: e.detail.value
    })
  },

  checkboxChange: function(e) {
    console.log('highlightWord:', this.data.highlightWord);
    console.log('e.detail.value:', e.detail.value);
    this.setData({
      highlightWord: e.detail.value
    });
  },

  inputHighlightWord: function(e) {
    this.setData({
      customHighlightWord: e.detail.value
    });
  },

  
  submit() {
    // 获取当前日期和时间
    var now = new Date();
    // 获取年份
    var year = now.getFullYear();
    // 获取月份（注意：月份是从 0 开始的，所以需要加 1）
    var month = now.getMonth() + 1;
    // 获取日期
    var date = now.getDate();
    // 获取关注内容
    
    // 保存页面实例引用
    var that = this;

    wx.cloud.init({
      env: 'cloud1-6gcva1k9bc9b81e3', // 这里替换为你的云开发环境 ID
      traceUser: true, 
    })
    wx.cloud.database().collection('medi_instruction').where({
      imagePath: this.data.imagePath
    }).get().then(res => {
      if (res.data.length > 0) {
        // 如果名称已经存在，更新记录
        wx.cloud.database().collection('medi_instruction').doc(res.data[0]._id).update({
          data: {
            name:this.data.name,
            order: this.data.order,
            note: this.data.note,
            highlightWord: this.data.highlightWord,
            customHighlightWord: this.data.customHighlightWord
          },
          success: function(res) {
            console.log(res)
            wx.showToast({
              title: '更新成功',
            })
            wx.navigateTo({
              url: '/pages/imageDetail/imageDetail?imagePath=' + encodeURIComponent(this.data.imagePath),
            });
          },
          fail: function(err) {
            console.log(err)
            wx.showToast({
              title: '更新失败',
              icon: 'none'
            })
          }
        })
      } else {
        // 如果地址不存在，添加新的记录
        wx.cloud.init({
          env: 'cloud1-6gcva1k9bc9b81e3', // 这里替换为你的云开发环境 ID
          traceUser: true, 
        })
        wx.cloud.database().collection('medi_instruction').add({
          data: {
            imagePath:this.data.imagePath,
            time:year + '年' + month + '月' + date + '日',
            name:this.data.name,
            order: this.data.order,
            note: this.data.note,
            highlightWord: this.data.highlightWord,
            customHighlightWord: this.data.customHighlightWord,
            content:''
          },
          success: function(res) {
            console.log(res)
            wx.showToast({
              title: '保存成功',
            })
            wx.navigateBack({
              delta: 1, // 返回上一级页面。
            })
          },
          fail: function(err) {
            console.log(err)
            wx.showToast({
              title: '保存失败',
              icon: 'none'
            })
          }
        })
      }
    })
  }
})
