// index.js
// const app = getApp()
const { envList } = require('../../envList.js');
Page({
  data: {
    fontSize: wx.getStorageSync('fontSize') || 30, // 默认值为 30，如果没有存储的值
    imagePath:[],
    showUploadTip: false,
    powerList: [],
    infoText: [],
    envList,
    selectedEnv: envList[0],
    haveCreateCollection: false
  },

  onLoad: function (options) {
    this.setData({
      fontSize: wx.getStorageSync('fontSize') || 30
    })
    this.setData({
      imagePath: decodeURIComponent(options.imagePath) // 从 options 中获取图片地址参数
    });
    wx.cloud.init({
      env: 'cloud1-6gcva1k9bc9b81e3', // 这里替换为你的云开发环境 ID
      traceUser: true, 
    });
    wx.cloud.database().collection('medi_instruction').where({
      imagePath: this.data.imagePath
    }).get().then(dbRes=> {
      if (dbRes.data.length > 0 && dbRes.data[0].highlightWord.length > 0 && dbRes.data[0].customHighlightWord.length > 0) {
        this.setData({
          infoText: dbRes.data[0].highlightWord.concat(dbRes.data[0].customHighlightWord)
        });
      }else if (dbRes.data.length > 0 && dbRes.data[0].highlightWord.length > 0){
        this.setData({
          infoText: dbRes.data[0].highlightWord
        });
      }else if(dbRes.data.length > 0 && dbRes.data[0].customHighlightWord.length > 0){
        this.setData({
          infoText: dbRes.data[0].customHighlightWord
        });
      }else{
        this.setData({
          infoText: []
        });
      }
    })
  },

  onShow:function(){
    this.setData({
      fontSize: wx.getStorageSync('fontSize') || 30
    })
    var that = this;
    wx.cloud.init({
      env: 'cloud1-6gcva1k9bc9b81e3', // 这里替换为你的云开发环境 ID
      traceUser: true, 
    })
    wx.cloud.database().collection('medi_instruction').where({
      imagePath: this.data.imagePath
    }).get().then(res => {
      if (res.data.length > 0 && 'content' in res.data[0]) {
        console.log("找到匹配的记录并且有 'content' 字段，content包含数据，直接调用")
        console.log("res.data[0].content====",res.data[0].content)
        this.parseAndReplaceText(res.data[0].content)
      }else if(res.data.length > 0 && !('content' in res.data[0])){
        console.log("有匹配的记录但content不包含数据，需要先识别内容")
        wx.showToast({
          title: '请先识别说明书内容',
        })
        wx.navigateTo({
          url: '/pages/ocr/ocr?imagePath=' + encodeURIComponent(this.data.imagePath),
        })
      }else{
        console.log("没有匹配的记录")
        wx.showToast({
          title: '请先填写说明书信息',
        })
        wx.navigateTo({
          url: '/pages/inputNote/inputNote?imagePath=' + encodeURIComponent(this.data.imagePath),
        })
      }
    })
  },

  onClickPowerInfo(e) {
    const index = e.currentTarget.dataset.index;
    const powerList = this.data.powerList;
    powerList[index].showItem = !powerList[index].showItem;
    if (powerList[index].title === '数据库' && !this.data.haveCreateCollection) {
      this.onClickDatabase(powerList);
    } else {
      this.setData({
        powerList
      });
    }
  },

  onChangeShowEnvChoose() {
    wx.showActionSheet({
      itemList: this.data.envList.map(i => i.alias),
      success: (res) => {
        this.onChangeSelectedEnv(res.tapIndex);
      },
      fail (res) {
        console.log(res.errMsg);
      }
    });
  },

  onChangeSelectedEnv(index) {
    if (this.data.selectedEnv.envId === this.data.envList[index].envId) {
      return;
    }
    const powerList = this.data.powerList;
    powerList.forEach(i => {
      i.showItem = false;
    });
    this.setData({
      selectedEnv: this.data.envList[index],
      powerList,
      haveCreateCollection: false
    });
  },

  onClickDatabase(powerList) {
    wx.showLoading({
      title: '',
    });
    wx.cloud.callFunction({
      name: 'quickstartFunctions',
      config: {
        env: this.data.selectedEnv.envId
      },
      data: {
        type: 'createCollection'
      }
    }).then((resp) => {
      if (resp.result.success) {
        this.setData({
          haveCreateCollection: true
        });
      }
      this.setData({
        powerList
      });
      wx.hideLoading();
    }).catch((e) => {
      console.log(e);
      this.setData({
        showUploadTip: true
      });
      wx.hideLoading();
    });
  },

  parseAndReplaceText(inputText) {
    var that = this;
    var titles = inputText.match(/【(.*?)】/g);  // 匹配所有的标题
    var contents = inputText.split(/【(.*?)】/); // 使用标题进行分割，得到所有的内容
    contents = contents.slice(1); // 去掉第一个元素，因为它是空的
    var powerList = []; // 用于存储所有的标题和内容

    for (var i = 0; i < titles.length; i++) {
      var item = {};
      item.title = titles[i].replace(/【|】/g, ''); // 去掉标题中的【】
      item.content = contents[i * 2 + 1].trim(); // 获取对应的内容，并去掉前后的空格
      // 遍历内容，确定是否有需要关注内容
      console.log("查找关注内容！！！")
      console.log("infoText==",that.data.infoText)
      for (var j = 0; j < that.data.infoText.length; j++) {
        var info = that.data.infoText[j];
        if(item.content.includes(info)){
          item.title += " (⭐重点关注)"; // 如果内容中包含info，就在标题后面加上“重点关注”
          break; // 找到一个就可以跳出循环
        }
      }
      // 生成一个动态的 title 对象
      const titleObject = {
        title: item.title,
        showItem: false,
        item: [{
          title: item.content
        }]  // 初始为空数组，可以根据需要添加子项
      };
      powerList.push(titleObject); 
    }
    
    console.log(powerList);
    this.setData({
      powerList:powerList
    });
    // console.log(data);

  },
 /**
   * 退回上一页
   */
  toBackClick: function () {
    wx.navigateBack({})
    wx.showToast({
      title: '说明书内容保存成功',
    })
  }
});
