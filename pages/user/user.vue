<template>
	<view class="page">
		<view class="form-card">
			<!-- 用户名 -->
			<view class="form-item">
				<text class="label">用户名</text>
				<input class="input" v-model="form.username" placeholder="请输入用户名" />
			</view>

			<!-- 密码 -->
			<view class="form-item">
				<text class="label">密码</text>
				<view class="password-row">
					<input class="input flex-1" v-model="form.password" placeholder="请输入密码或点击生成" password />

					<!-- 生成按钮 -->
					<view class="icon-btn" @click="generatePassword">
						<image src="/static/icons/genKey.png" mode="widthFix" />
					</view>

					<!-- 复制按钮 -->
					<view class="icon-btn" @click="copyPassword">
						<image src="/static/icons/copyPwd.png" mode="widthFix" />
					</view>
				</view>
			</view>

			<!-- 职位选择 -->
			<view class="form-item">
				<text class="label">职位</text>
				<picker :range="roles" range-key="name" @change="onRoleChange">
					<view class="picker">
						{{ form.roleName || '请选择职位' }}
					</view>
				</picker>
			</view>

			<!-- 提交 -->
			<button class="submit-btn" type="primary" :disabled="submitting" @click="submit">
				{{ submitting ? '提交中...' : '提交' }}
			</button>
		</view>
	</view>
</template>

<script>
import { request } from '@/common/request.js';

export default {
	data() {
		return {
			form: {
				username: '',
				password: '',
				roleCode: '',
				roleName: ''
			},
			roles: [
				{ name: '主管', code: 'MANAGER' },
				{ name: '业务员', code: 'SALES' },
				{ name: '车务', code: 'VEHICLE' },
				{ name: '财务', code: 'FINANCE' },
				{ name: '内勤', code: 'ASSISTANT' }
			],
			submitting: false
		};
	},
	methods: {
		onRoleChange(e) {
			const index = e.detail.value;
			const selected = this.roles[index];
			this.form.roleCode = selected.code;
			this.form.roleName = selected.name;
		},
		generatePassword() {
			const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#_-';
			let pwd = '';
			for (let i = 0; i < 10; i++) {
				pwd += chars.charAt(Math.floor(Math.random() * chars.length));
			}
			this.form.password = pwd;
			uni.showToast({ title: '已生成随机密码', icon: 'none' });
		},
		copyPassword() {
			if (!this.form.password) {
				return uni.showToast({ title: '请先生成或输入密码', icon: 'none' });
			}
			uni.setClipboardData({
				data: this.form.password,
				success: () => {
					uni.showToast({ title: '密码已复制', icon: 'none' });
				}
			});
		},
		async submit() {
			if (this.submitting) return;
			if (!this.form.username || this.form.username.length < 3) {
				return uni.showToast({ title: '用户名至少3个字符', icon: 'none' });
			}
			if (!this.form.password || this.form.password.length < 8) {
				return uni.showToast({ title: '密码至少8位', icon: 'none' });
			}
			if (!this.form.roleCode) {
				return uni.showToast({ title: '请选择职位', icon: 'none' });
			}

			this.submitting = true;
			uni.showLoading({ title: '提交中...' });

			try {
				const res = await request({
					url: '/account',
					method: 'POST',
					data: this.form
				});

				this.submitting = false;
				uni.hideLoading();

				if (res.code === 0) {
					uni.showToast({ title: '添加成功', icon: 'success' });
					setTimeout(() => uni.navigateBack(), 1000);
				} else {
					uni.showToast({ title: res.msg || '提交失败', icon: 'none' });
				}
			} catch (err) {
				this.submitting = false;
				uni.hideLoading();
				uni.showToast({ title: '网络异常，请稍后再试', icon: 'none' });
			}
		}
	}
};
</script>

<style>
.page {
	background: #f5f6f8;
	min-height: 100vh;
	padding: 30rpx;
}

.form-card {
	background: #fff;
	border-radius: 20rpx;
	box-shadow: 0 4rpx 10rpx rgba(0, 0, 0, 0.05);
	padding: 40rpx;
}

.form-item {
	margin-bottom: 36rpx;
}

.label {
	display: block;
	font-size: 30rpx;
	color: #333;
	margin-bottom: 16rpx;
}

.input,
.picker {
	background: #f7f8fa;
	border-radius: 10rpx;
	padding: 20rpx;
	font-size: 28rpx;
	border: 1rpx solid #eee;
	color: #333;
}

.password-row {
	display: flex;
	align-items: center;
	gap: 16rpx;
}

.input {
	flex: 1;
	background: #f7f8fa;
	border-radius: 10rpx;
	padding: 20rpx;
	font-size: 28rpx;
	border: 1rpx solid #eee;
	color: #333;
}

.icon-btn {
	width: 60rpx;
	height: 60rpx;
	display: flex;
	justify-content: center;
	align-items: center;
	border-radius: 12rpx;
	background: #f7f8fa;
	box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.1);
}

.icon-btn image {
	width: 36rpx;
	height: 36rpx;
}
.icon-tip {
	font-size: 22rpx;
	color: #666;
	margin-top: 6rpx;
}
.submit-btn {
	background: linear-gradient(90deg, #ff8a00, #ff6b00);
	color: #fff;
	border-radius: 50rpx;
	height: 88rpx;
	line-height: 88rpx;
	font-size: 32rpx;
	width: 100%;
	margin-top: 30rpx;
	font-weight: bold;
	box-shadow: 0 8rpx 16rpx rgba(255, 107, 0, 0.3);
	transition: opacity 0.3s;
}

.submit-btn:disabled {
	opacity: 0.6;
}
</style>
