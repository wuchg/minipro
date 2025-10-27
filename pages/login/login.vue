<template>
	<view class="page">
		<view class="login-card">
			<!-- logo -->
			<view class="logo">
				<view class="logo-wrapper">
					<image :src="logoUrl" mode="aspectFit" class="logo-img" />
					<view class="overlay"></view>
				</view>
				<text class="app-title">
					欢迎登录
					<text class="brand">AutoBoss</text>
				</text>
			</view>

			<!-- 登录表单 -->
			<view class="form">
				<view class="form-item">
					<input v-model="username" placeholder="手机号 / 用户名" class="input" :readonly="isLoading" />
				</view>
				<view class="form-item">
					<input v-model="password" placeholder="密码" password class="input" :readonly="isLoading" />
				</view>

				<!-- 登录按钮 -->
				<button class="login-btn" :disabled="isLoading" @click="doLogin">
					<view class="btn-content">
						<view v-if="isLoading" class="spinner"></view>
						<text>{{ loginText }}</text>
					</view>
				</button>
			</view>
		</view>
	</view>
</template>

<script lang="ts">
import { TUILogin } from '@tencentcloud/tui-core';

let vueVersion = 2;
// #ifdef VUE3
vueVersion = 3;
// #endif

export default {
	data() {
		return {
			username: '',
			password: '',
			redirect: '',
			isLoading: false,
			logoUrl: `${getApp().globalData.baseImgUrl}/static/logo.png`,
			loginText: '登录'
		};
	},
	onLoad(query) {
		this.redirect = query.redirect ? decodeURIComponent(query.redirect) : '/pages/index/index';
	},
	methods: {
		async initIM(IMID: string, IMToken: string) {
			if (!IMToken || !IMID) return;
			this.loginText = '正在连接IM服务...';
			try {
				await TUILogin.login({
					SDKAppID: Number(`${getApp().globalData.IMAppID}`),
					userID: IMID,
					userSig: IMToken,
					useUploadPlugin: true,
					framework: `vue${vueVersion}`
				});
				console.log('IM 登录成功');
			} catch (e) {
				console.error('IM 登录失败', e);
			}
			uni.setStorageSync('IMID', IMID);
			uni.setStorageSync('IM_token', IMToken);
			uni.$emit('userChanged', { IMID });
		},
		async doLogin() {
			if (!this.username || !this.password) {
				return uni.showToast({ title: '请输入账号和密码', icon: 'none' });
			}
			if (this.isLoading) return;

			this.isLoading = true;
			this.loginText = '正在登录...';

			uni.request({
				url: `${getApp().globalData.baseUrl}/auth/login`,
				method: 'POST',
				data: { username: this.username, password: this.password },
				success: async (res) => {
					if (res.data.code === 0) {
						const data = res.data.data;
						uni.setStorageSync('access_token', data.access_token);
						await this.initIM(data.im_user_id, data.im_token);
						this.loginText = '登录成功';
						setTimeout(() => {
							const tabPages = ['/pages/index/index', '/pages/profile/profile', '/pages/workBench/workBench', '/pages/conversations/conversations'];
							if (tabPages.includes(this.redirect)) {
								uni.switchTab({ url: this.redirect });
							} else {
								uni.redirectTo({ url: this.redirect });
							}
						}, 300);
					} else {
						uni.showToast({
							title: res.data.msg || '登录失败',
							icon: 'none'
						});
						this.resetButton();
					}
				},
				fail: () => {
					uni.showToast({ title: '网络错误', icon: 'none' });
					this.resetButton();
				}
			});
		},
		resetButton() {
			this.isLoading = false;
			this.loginText = '登录';
		}
	}
};
</script>

<style scoped>
.page {
	background: linear-gradient(180deg, #fff7ec 0%, #ffe6cc 100%);
	min-height: 100vh;
	display: flex;
	justify-content: center;
	align-items: center;
}

/* 登录卡片 */
.login-card {
	background: #fff;
	width: 90%;
	max-width: 560rpx;
	border-radius: 24rpx;
	padding: 60rpx 40rpx 80rpx;
	box-shadow: 0 8rpx 24rpx rgba(255, 138, 0, 0.2);
	display: flex;
	flex-direction: column;
	align-items: center;
	animation: fadeInUp 0.5s ease;
}

/* logo */
.logo {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-bottom: 60rpx;
}

.logo-wrapper {
	position: relative;
	width: 140rpx;
	height: 140rpx;
	border-radius: 32rpx;
	overflow: hidden;
	box-shadow: 0 6rpx 20rpx rgba(255, 138, 0, 0.25);
}

.logo-img {
	width: 100%;
	height: 100%;
	object-fit: cover;
	filter: brightness(1.05);
}

.overlay {
	position: absolute;
	inset: 0;
	background: linear-gradient(145deg, #ff9a00 0%, #ff6b00 100%);
	mix-blend-mode: overlay;
	opacity: 0.85;
}

.app-title {
	font-size: 34rpx;
	color: #333;
	font-weight: 600;
	margin-top: 24rpx;
	text-align: center;
}

.brand {
	background: linear-gradient(90deg, #ff9a00, #ff6b00);
	-webkit-background-clip: text;
	-webkit-text-fill-color: transparent;
}

/* 表单 */
.form {
	width: 100%;
}

.form-item {
	margin-bottom: 36rpx;
}

.input {
	width: 100%;
	height: 88rpx;
	background: #fafafa;
	border-radius: 12rpx;
	padding: 0 24rpx;
	border: 1rpx solid #eee;
	font-size: 28rpx;
	color: #333;
	box-sizing: border-box;
	transition: all 0.3s ease;
}

.input:focus {
	border-color: #ff8a00;
	box-shadow: 0 0 12rpx rgba(255, 138, 0, 0.3);
	background: #fff;
}

.input[readonly] {
	background: rgba(247, 248, 250, 0.7);
}

/* 登录按钮 */
.login-btn {
	width: 100%;
	height: 90rpx;
	border-radius: 14rpx;
	background: linear-gradient(90deg, #ff8a00, #ff6b00);
	color: #fff;
	font-size: 32rpx;
	font-weight: 600;
	text-align: center;
	box-shadow: 0 6rpx 20rpx rgba(255, 136, 0, 0.3);
	transition: all 0.25s ease;
}

.login-btn:active {
	transform: scale(0.97);
	box-shadow: 0 3rpx 8rpx rgba(255, 136, 0, 0.4);
}

.login-btn:disabled {
	opacity: 0.85;
}

/* 按钮内容 */
.btn-content {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 12rpx;
}

/* loading 小圆圈 */
.spinner {
	width: 30rpx;
	height: 30rpx;
	border: 4rpx solid rgba(255, 255, 255, 0.5);
	border-top-color: #fff;
	border-radius: 50%;
	animation: spin 1s linear infinite;
}

@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}

@keyframes fadeInUp {
	from {
		opacity: 0;
		transform: translateY(30rpx);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}
</style>
