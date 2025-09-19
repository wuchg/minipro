<template>
  <view class="login-page">
    <view class="login-card">
      <view class="logo">
        <image src="/static/xx.png" mode="aspectFit"></image>
      </view>
      <!-- 账号密码登录 -->
      <view class="form">
        <input v-model="username" placeholder="手机号/用户名" class="input" />
        <input v-model="password" placeholder="密码" class="input" password />

        <button @click="doLogin" class="btn">登录</button>
      </view>

      <view class="divider"><view></view><text>或使用微信登录</text><view></view></view>

      <!-- 微信登录按钮 -->
      <button open-type="getUserInfo" @getuserinfo="wxLogin" class="wx-btn">
<!--        <image src="/static/wx-logo.png" class="wx-icon"></image -->
        微信登录
      </button>

    </view>
  </view>
</template>

<script>
	export default {
		data() {
			return {
				username: '',
				password: '',
				redirect: ''
			}
		},
		onLoad(query) {
			if (query.redirect) {
			    this.redirect = decodeURIComponent(query.redirect)
			  } else {
			    this.redirect = '/pages/index/index'
			  }
		},
		methods: {
			doLogin() {
				if (!this.username || !this.password) {
					uni.showToast({
						title: '请输入账号和密码',
						icon: 'none'
					})
					return
				}

				uni.request({
					url: `${getApp().globalData.baseUrl}/auth/login`,
					method: 'POST',
					data: {
						username: this.username,
						password: this.password
					},
					success: (res) => {
						if (res.data.code === 0) {
							const access_token = res.data.data.access_token
							uni.setStorageSync('access_token', access_token)
							uni.showToast({
								title: '登录成功',
								icon: 'success'
							})
							console.log(this.redirect)
							if (this.redirect.startsWith('/pages')) {
								const tabBarPages = ['/pages/index/index', '/pages/orders/orders',
									'/pages/conversations/conversations'
								]
								if (tabBarPages.includes(this.redirect)) {
									uni.switchTab({
										url: this.redirect
									})
								} else {
									uni.redirectTo({
										url: this.redirect
									})
								}
							}
						} else {
							uni.showToast({
								title: res.data.msg || '登录失败',
								icon: 'none'
							})
						}
					},
					fail: () => {
						uni.showToast({
							title: '网络错误',
							icon: 'none'
						})
					}
				})
			},
			
		}
	}
</script>

<style>
/* 页面整体背景 */
.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  padding: 20rpx;
  background: linear-gradient(180deg, #4f90ff, #1c70d2);
}

/* 登录卡片 */
.login-card {
  width: 100%;
  max-width: 500rpx;
  min-height: 600rpx;             /* 整体高度更高 */
  background: #fff;
  border-radius: 30rpx;
  padding: 50rpx 40rpx;           /* 内边距增大 */
  box-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.2); /* 阴影更明显 */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;        /* 垂直居中内容 */
}

/* Logo 样式 */
.logo {
  margin-bottom: 40rpx;
}

.logo image {
  width: 120rpx;
  height: 120rpx;
  object-fit: contain;
}

/* 表单 */
.form {
  width: 100%;
  margin-bottom: 30rpx;           /* 表单和微信登录分开 */
}

.input {
  width: 92%;
  height: 65rpx;
  margin-bottom: 25rpx;
  padding: 0 20rpx;
  border: 1px solid #ddd;
  border-radius: 28rpx;
  font-size: 30rpx;
  background-color: #f9f9f9;
}

/* 登录按钮 */
.btn {
  width: 100%;
  height: 65rpx;
  background: #4f90ff;
  color: #fff;
  border-radius: 28rpx;
  font-size: 30rpx;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 分割线 */
.divider {
  width: 100%;
  flex-direction: row;
  display: flex;
  align-items: center;
  margin: 30rpx 0;
  color: #999;
}

.divider view {
  flex: 1;
  height: 1rpx;
  background: #eee;
}

.divider text {
  padding: 0 10rpx;
  font-size: 24rpx;
}

/* 微信登录按钮 */
.wx-btn {
  width: 100%;
  height: 65rpx;
  border-radius: 28rpx;
  background: #07C160;
  color: #fff;
  font-size: 30rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.wx-icon {
  width: 32rpx;
  height: 32rpx;
  margin-right: 12rpx;
}


</style>