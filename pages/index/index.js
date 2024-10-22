// pages/ocr.js
const app = getApp();
Page({
  data: {
    fontSize: wx.getStorageSync('fontSize') || 30, // 默认值为 30，如果没有存储的值
    imageNames: [], // 添加的图片的名字数组
    imageName:"",//添加的图片名字
    imagePaths: [], // 添加的图片地址数组
    imagePath: "", //识别的图片地址
    recognizedimagePaths:[], // 存储已识别的图片路径数组
    baiduToken: ""
  },
  onLoad: function(){
    this.setData({
      fontSize: wx.getStorageSync('fontSize') || 30
    })
    this.loadDataFromDatabase();
  },

  onShow: function(){
    this.setData({
      fontSize: wx.getStorageSync('fontSize') || 30
    })
    this.loadDataFromDatabase();
  },

  loadDataFromDatabase: function(){
    var that = this;
    //查询数据库
    wx.cloud.init({
      env: 'cloud1-6gcva1k9bc9b81e3', // 这里替换为你的云开发环境 ID
      traceUser: true, 
    })
    wx.cloud.database().collection('medi_instruction').get().then(dbRes => {
      const imagePaths = [];
      const imageNames = [];
      const recognizedimagePaths = [];
      dbRes.data.forEach(item => {
        if ('imagePath' in item && item.imagePath.length > 0) {
          imagePaths.push(item.imagePath)
          imageNames.push(item.name);
          recognizedimagePaths.push(item.imagePath);
        }
      });
      that.setData({
        imagePaths: imagePaths,
        imageNames: imageNames,
        recognizedimagePaths: recognizedimagePaths,
      });
    });
  },
  // 上传图片  
  doUpload: function () {
    var that = this;
    // 选择图片，拍照或从相册中获取
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album','camera'],
      camera: 'back',
      success: function (res) {
        wx.showLoading({
          title: '上传中',
        })
        const filePath = res.tempFiles[0].tempFilePath
        const newImagePaths = that.data.imagePaths.concat(filePath);
        // 这里需要你根据实际情况设置新图片的名称
        that.setData({
        imagePath: filePath,
        imagePaths: newImagePaths,
        recognizedimagePaths: that.data.recognizedimagePaths.concat(filePath),
        })
        //查询数据库
        wx.cloud.init({
          env: 'cloud1-6gcva1k9bc9b81e3', // 这里替换为你的云开发环境 ID
          traceUser: true, 
        })
        wx.cloud.database().collection('medi_instruction').where({
          imagePath: that.data.imagePath
        }).get().then(dbRes=> {
          if (dbRes.data.length > 0 && 'name' in dbRes.data[0] && dbRes.data[0].name.length > 0) {
            console.log("找到匹配的记录并且有 'name' 字段,name包含数据，直接调用")
            if (!that.data.imageNames.includes(dbRes.data[0].name)) {
              that.setData({
                imageName: dbRes.data[0].name,
                imageNames: that.data.imageNames.concat(dbRes.data[0].name),
              })
            }else{
              that.setData({
                imageName: dbRes.data[0].name,
              })
            }
          }else{
            that.handleUploadSuccess();
          }
        })    
      },
      // 错误信息
      fail: function (res) {
        console.log("[读取图片数据fail]", res)
      },
      complete: function (res) {
        wx.hideLoading()
      }
    })
  },
  
  // 在成功选择图像并上传完成后的回调函数中
  handleUploadSuccess: function() {
    var that = this;
    wx.hideLoading(); // 隐藏上传中提示
    // 显示询问是否继续录入的模态框
    wx.showModal({
      title: '提示',
      content: '是否继续录入',
      success(res) {
        if (res.confirm) {
        // 用户选择继续录入，递归调用选择媒体的逻辑
        wx.chooseMedia({
          count: 1,
          mediaType: ['image'],
          sourceType: ['album', 'camera'],
          camera: 'back',
          success: function (res) {
            wx.showLoading({
              title: '上传中',
            });
            // 递归调用，处理下一次录入
            that.handleUploadSuccess();
          }
        });
      } else if (res.cancel) {
        // 用户选择不继续录入，可以执行相应的逻辑或不进行任何处理
        console.log('用户选择取消录入');
        wx.showModal({
          title: '提示',
          content: '请补全说明书信息',
          success (res) {
            if (res.confirm) {
              // 用户点击确定，跳转到输入图片名称的页面
              wx.navigateTo({
                url: '/pages/inputNote/inputNote?imagePath=' + encodeURIComponent(that.data.imagePath),
              })
            } else if (res.cancel) {
              console.log('用户点击取消')
            }
          }
        })
      }
    }
  });
},
  
  goToSettings:function(){
    wx.navigateTo({
      url: '/pages/systemset/systemset'
      })
  },
  
  deleteImage: function(event) {
    var that = this;
    wx.showModal({
      title: '提示',
      content: '确定要删除这张图片吗？',
      success (res) {
        if (res.confirm) {
          wx.cloud.init({
            env: 'cloud1-6gcva1k9bc9b81e3', // 这里替换为你的云开发环境 ID
            traceUser: true, 
          })
          const index = event.currentTarget.dataset.id;
          const imagePath = that.data.imagePaths[index];
          console.log('imagePath==', imagePath);
          wx.cloud.database().collection('medi_instruction').where({
            imagePath: imagePath
          }).get().then(dbRes => {
            if (dbRes.data.length > 0) {
              // 如果名称存在，删除记录
              wx.cloud.database().collection('medi_instruction').doc(dbRes.data[0]._id).remove({
                success: function(res) {
                  wx.showToast({
                    title: '删除成功',
                    icon: 'success'
                  })
                  // 删除页面上的图片
                  var index = that.data.recognizedimagePaths.indexOf(e.currentTarget.dataset.id);
                  if (index > -1) {
                    that.data.recognizedimagePaths.splice(index, 1);
                    that.data.imageNames.splice(index, 1);
                    that.setData({
                      recognizedimagePaths: that.data.recognizedimagePaths,
                      imageNames: that.data.imageNames
                    });
                  }
                },
                fail: function(err) {
                  console.log(err)
                  wx.showToast({
                    title: '删除失败',
                    icon: 'none'
                  })
                }
              })
              that.loadDataFromDatabase();
            }else {
              wx.showToast({
                title: '不存在该说明书，请重新添加',
              })
            }
          })
        }else{
          console.log('用户点击取消')
        }
      }
    })
  },
  
// 图片点击事件处理函数
  viewImageDetail: function (event) {
    // 获取用户点击的图片的 imagePath
    const index = event.currentTarget.dataset.id;
    console.log('this.data.imagePaths[index]:', this.data.imagePaths[index]);
    
    // 在这里进行页面跳转
    wx.navigateTo({
      // url: '/pages/imageDetail/imageDetail',
      url: '/pages/imageDetail/imageDetail?imagePath=' + encodeURIComponent(this.data.imagePaths[index]),
    })
  },
})
