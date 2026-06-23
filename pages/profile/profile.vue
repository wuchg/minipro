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
			<text class="label">{{ $t('user.role') }}</text>
			<text class="role-text">{{ user.roleName }}</text>
		</view>

		<!-- 工作台入口 -->
		<view class="setting-card">
			<view class="setting-item" @click="goWorkbench">
				<view class="item-label">
					<image src="/static/icons/w.png" class="item-icon" mode="aspectFit" />
					<text>{{ $t('workbench.title') }}</text>
				</view>
				<text class="value arrow"></text>
			</view>
		</view>

		<!-- 多语言设置 -->
		<view class="setting-card">
			<view class="setting-item" @click="changeLanguage">
				<text>🌐 {{ $t('settings.language') }}</text>
				<text class="value">{{ languageLabel }}</text>
			</view>
			<view class="setting-item" @click="openChangePassword">
				<text>🔒 {{ $t('settings.changePassword') }}</text>
				<text class="value arrow"></text>
			</view>
		</view>

		<!-- 退出登录 -->
		<button class="btn-logout" @click="logout">{{ $t('actions.logout') }}</button>

		<!-- 头像预览层 -->
		<view v-if="showAvatarPreview" class="avatar-preview">
			<image :src="user.avatar || defaultAvatar_" class="avatar-large"></image>
			<view class="avatar-options">
				<text class="option" @click="changeAvatar">{{ $t('avatar.change') }}</text>
				<text class="option" @click="closeAvatarPreview">{{ $t('actions.cancel') }}</text>
			</view>
		</view>

		<!-- 修改密码弹窗 -->
		<view v-if="showPasswordModal" class="modal-mask">
			<view class="modal-box">
				<view class="modal-title">{{ $t('settings.changePassword') }}</view>
				<input v-model="oldPassword" type="password" :placeholder="oldPasswordPlaceholder" class="input" />
				<input v-model="newPassword" type="password" :placeholder="newPasswordPlaceholder" class="input" />
				<view class="modal-actions">
					<button @click="submitPasswordChange" type="primary" class="btn-confirm">{{ $t('actions.confirm') }}</button>
					<button @click="closePasswordModal" class="btn-cancel">{{ $t('actions.cancel') }}</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { request } from '@/common/request.js';
import { t } from '@/common/i18nUtil.js';

import { getCurrentInstance } from 'vue';
export default {
	data() {
		return {
			user: { nickname: '', username: '', avatar: '', roleName: '' },
			defaultAvatar: `${getApp().globalData.baseImgUrl}/workbench/avatar.png`,
			defaultAvatar_: `${getApp().globalData.baseImgUrl}/workbench/avatar@.png`,
			showAvatarPreview: false,

			showPasswordModal: false,
			oldPassword: '',
			newPassword: '',

			language: uni.getStorageSync('language') || 'system' // system | zh | en | ru
		};
	},
	computed: {
		oldPasswordPlaceholder() {
			return this.$t('password.oldPlaceholder');
		},
		newPasswordPlaceholder() {
			return this.$t('password.newPlaceholder');
		},
		languageLabel() {
			switch (this.language) {
				case 'system':
					return this.$t('language.system');
				case 'zh':
					return this.$t('language.zh');
				case 'en':
					return this.$t('language.en');
				case 'ru':
					return this.$t('language.ru');
				default:
					return this.$t('user.unknownRole');
			}
		}
	},
	onLoad() {
		this.loadUserInfo();
		// 用户变化时自动刷新菜单
		uni.$on('userChanged', (data) => {
			console.log('检测到用户变化:', data);
			this.loadUserInfo();
		});
	},
	onUnload() {
		uni.$off('userChanged');
	},
	methods: {
		async loadUserInfo() {
			try {
				const res = await request({ url: '/auth/user-info', method: 'GET' });
				if (res.code === 0) {
					this.user = {
						nickname: res.data.nickname || res.data.username,
						username: res.data.username,
						roleName: res.data.role || t('user.unknownRole'),
						avatar: `${getApp().globalData.baseImgUrl}` + res.data.avatar
					};
				}
			} catch (err) {
				uni.showToast({ title: t('toast.networkError'), icon: 'none' });
			}
		},

		// 跳转工作台（非 tabBar 页面用 navigateTo）
		goWorkbench() {
			uni.navigateTo({ url: '/pages/workBench/workBench' });
		},

		// 头像预览
		previewAvatar() {
			this.showAvatarPreview = true;
		},
		closeAvatarPreview() {
			this.showAvatarPreview = false;
		},

		// 上传头像
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
							this.user.avatar = data.data.avatar;
							this.showAvatarPreview = false;
							uni.showToast({ title: t('avatar.changeSuccess'), icon: 'success' });
						} else {
							uni.showToast({ title: data.msg || t('avatar.changeFailed'), icon: 'none' });
						}
					} catch (err) {
						uni.showToast({ title: t('avatar.changeFailed'), icon: 'none' });
					}
				}
			});
		},

		// 修改密码
		openChangePassword() {
			this.showPasswordModal = true;
		},
		closePasswordModal() {
			this.showPasswordModal = false;
			this.oldPassword = '';
			this.newPassword = '';
		},
		async submitPasswordChange() {
			if (!this.oldPassword || !this.newPassword) {
				return uni.showToast({ title: t('toast.inputIncomplete'), icon: 'none' });
			}
			try {
				const res = await request({
					url: '/auth/change-password',
					method: 'POST',
					data: { oldPassword: this.oldPassword, newPassword: this.newPassword }
				});
				if (res.code === 0) {
					uni.showToast({ title: t('toast.changeSuccess'), icon: 'success' });
					this.closePasswordModal();
				} else {
					uni.showToast({ title: res.msg || t('toast.changeFailed'), icon: 'none' });
				}
			} catch (err) {
				uni.showToast({ title: t('toast.networkError'), icon: 'none' });
			}
		},

		// 多语言切换
		changeLanguage() {
			uni.showActionSheet({
				itemList: ['跟随系统', '中文', 'English', 'Русский'],
				success: (res) => {
					const map = ['system', 'zh', 'en', 'ru'];
					const lang = map[res.tapIndex];
					this.language = lang;
					uni.setStorageSync('language', this.language);
					// 更新 vue-i18n 实例
					// 在 Vue3 中可以通过 getCurrentInstance 获取
					const app = getCurrentInstance()?.appContext?.app;
					const i18n = app?.config?.globalProperties?.$i18n;
					if (i18n) {
						i18n.locale = lang === 'system' ? uni.getLocale() : lang;
					} else if (this.$i18n) {
						this.$i18n.locale = lang === 'system' ? uni.getLocale() : lang;
					}
					uni.showToast({
						title: this.$t('language.changed'),
						icon: 'none'
					});
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

/* 设置卡片 */
.setting-card {
	background: #fff;
	padding: 25rpx;
	border-radius: 20rpx;
	margin-bottom: 30rpx;
	box-shadow: 0 6rpx 16rpx rgba(0, 0, 0, 0.08);
}
.setting-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 20rpx 0;
	border-bottom: 1rpx solid #eee;
	font-size: 30rpx;
}
.setting-item:last-child {
	border-bottom: none;
}
.item-label {
	display: flex;
	align-items: center;
}
.item-icon {
	width: 40rpx;
	height: 40rpx;
	margin-right: 16rpx;
}
.value {
	color: #999;
	font-size: 28rpx;
}

/* 弹窗 */
.modal-mask {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.6);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 1000;
}
.modal-box {
	background: #fff;
	border-radius: 20rpx;
	width: 80%;
	padding: 40rpx;
}
.modal-title {
	font-size: 34rpx;
	font-weight: 600;
	margin-bottom: 30rpx;
	text-align: center;
}
.input {
	width: 100%;
	background: #f5f5f5;
	padding: 20rpx;
	border-radius: 12rpx;
	margin-bottom: 20rpx;
	font-size: 28rpx;
}
.modal-actions {
	display: flex;
	justify-content: space-around;
	margin-top: 20rpx;
}
.btn-confirm {
	background: #2575fc;
	color: #fff;
	border-radius: 10rpx;
	padding: 12rpx 50rpx;
}
.btn-cancel {
	background: #ddd;
	border-radius: 10rpx;
	padding: 12rpx 50rpx;
}

/* 头像预览 */
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

/* 退出按钮 */
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

.arrow::after {
	content: '>';
}
</style>
