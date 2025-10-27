<template>
	<view class="page">
		<!-- 用户信息卡片 -->
		<view class="user-card">
			<image :src="user.avatar || defaultAvatar" class="avatar" @click="previewAvatar" />
			<view class="user-info">
				<view class="nickname">{{ user.nickname }}</view>
				<view class="username">{{ user.username }}</view>
			</view>
		</view>

		<!-- 职位显示 -->
		<view class="role-card">
			<text class="label">职位</text>
			<text class="role-text">{{ user.roleName }}</text>
		</view>

		<!-- 头像浮层 -->
		<view v-if="showAvatarPreview" class="avatar-preview">
			<image :src="user.avatar || defaultAvatar_" class="avatar-large"></image>
			<view class="avatar-options">
				<text class="option" @click="changeAvatar">修改头像</text>
				<text class="option" @click="closeAvatarPreview">取消</text>
			</view>
		</view>

		<!-- 退出登录 -->
		<button class="btn-logout" @click="logout">退出登录</button>
	</view>
</template>

<script>
import { request } from '@/common/request.js';
import { TUILogin } from '@tencentcloud/tui-core';
export default {
	data() {
		return {
			user: { nickname: '', username: '', avatar: '', roleName: '' },
			defaultAvatar: `${getApp().globalData.baseImgUrl}/workbench/avatar.png`,
			defaultAvatar_: `${getApp().globalData.baseImgUrl}/workbench/avatar@.png`,
			showAvatarPreview: false
		};
	},
	onLoad() {
		this.loadUserInfo();
	},
	methods: {
		async loadUserInfo() {
			try {
				const res = await request({ url: '/auth/user-info', method: 'GET' });
				if (res.code === 0) {
					this.user = {
						nickname: res.data.nickname || res.data.username,
						username: res.data.username,
						roleName: res.data.roleName || '未知职位',
						avatar: res.data.avatar || ''
					};
				}
			} catch (err) {
				uni.showToast({ title: '网络异常', icon: 'none' });
			}
		},

		// 点击头像预览
		previewAvatar() {
			this.showAvatarPreview = true;
		},
		closeAvatarPreview() {
			this.showAvatarPreview = false;
		},

		// 修改头像
		changeAvatar() {
			uni.chooseImage({
				count: 1,
				sizeType: ['compressed'],
				sourceType: ['album', 'camera'],
				success: async (res) => {
					const tempFile = res.tempFilePaths[0];
					try {
						const uploadRes = await uni.uploadFile({
							url: 'http://127.0.0.1:8888/api/account/upload-avatar',
							filePath: tempFile,
							name: 'avatar',
							header: { Authorization: `Bearer ${uni.getStorageSync('token')}` }
						});
						const data = JSON.parse(uploadRes.data);
						if (data.code === 0) {
							uni.showToast({ title: '头像修改成功', icon: 'success' });
							this.user.avatar = data.data.avatar;
							this.showAvatarPreview = false;
						} else {
							uni.showToast({ title: data.msg || '上传失败', icon: 'none' });
						}
					} catch (err) {
						uni.showToast({ title: '上传失败', icon: 'none' });
					}
				}
			});
		},

		logout() {
			uni.showModal({
				title: '提示',
				content: '确定要退出登录吗？',
				success: (res) => {
					if (res.confirm) {
						uni.removeStorageSync('access_token');
						uni.removeStorageSync('IMID');
						uni.removeStorageSync('IM_token');
						try {
							//  有时候 IM 没登录成功
							TUILogin?.logout();
						} catch (e) {
							//console.error(e);
						}
						uni.navigateTo({ url: '/pages/login/login' });
					}
				}
			});
		}
	}
};
</script>

<style>
.page {
	background: #f0f2f5;
	min-height: 100vh;
	padding: 30rpx;
}

/* 用户卡片 */
.user-card {
	background: linear-gradient(135deg, #6a11cb, #2575fc);
	flex-direction: row;
	display: flex;
	align-items: center;
	padding: 30rpx;
	border-radius: 30rpx;
	margin-bottom: 20rpx;
	box-shadow: 0 6rpx 20rpx rgba(0, 0, 0, 0.12);
}
.avatar {
	width: 120rpx;
	height: 120rpx;
	border-radius: 60rpx;
	border: 3rpx solid #fff;
}
.user-info {
	margin-left: 30rpx;
}
.nickname {
	font-size: 36rpx;
	font-weight: bold;
	color: #fff;
}
.username {
	font-size: 28rpx;
	color: rgba(255, 255, 255, 0.8);
	margin-top: 8rpx;
}

/* 职位展示 */
.role-card {
	background: #fff;
	padding: 25rpx;
	border-radius: 20rpx;
	margin-bottom: 30rpx;
	box-shadow: 0 6rpx 16rpx rgba(0, 0, 0, 0.08);
	display: flex;
	flex-direction: row;
	justify-content: space-between;
	align-items: center;
}
.label {
	font-size: 28rpx;
	color: #333;
	font-weight: 500;
}
.role-text {
	font-size: 28rpx;
	color: #666;
}

/* 浮层头像预览 */
.avatar-preview {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.85);
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	z-index: 999;
}
.avatar-large {
	width: 90%;
	height: 50%;
	border-radius: 20rpx;
}
.avatar-options {
	margin-top: 40rpx;
	flex-direction: row;
	display: flex;
	justify-content: space-around;
	width: 80%;
}
.option {
	color: #fff;
	font-size: 28rpx;
	padding: 20rpx 40rpx;
	background: rgba(255, 255, 255, 0.1);
	border-radius: 16rpx;
}

/* 退出登录按钮 */
.btn-logout {
	background: #ff3b30;
	color: #fff;
	padding: 22rpx 0;
	border-radius: 16rpx;
	font-size: 30rpx;
	text-align: center;
	margin-top: 40rpx;
	box-shadow: 0 4rpx 12rpx rgba(255, 59, 48, 0.3);
}
.btn-logout:active {
	opacity: 0.85;
}
</style>
