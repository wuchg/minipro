<template>
	<view class="page">
		<view class="card">
			<view class="title">{{ $t('todo.title') }}</view>
			<view class="field">
				<text class="label">{{ $t('todo.orderNo') }}：</text>
				<text>{{ orderNo }}</text>
			</view>
			<view class="field">
				<text class="label">{{ $t('todo.actionType') }}：</text>
				<text>{{ actionName }}</text>
			</view>
		</view>

		<view class="upload-card">
			<view class="title">{{ $t('todo.uploadTitle') }}</view>

			<view class="upload-actions">
				<button class="btn" @click="takePhoto">{{ $t('todo.takePhoto') }}</button>
				<button class="btn" @click="chooseFile">{{ $t('todo.chooseFile') }}</button>
			</view>
			<view class="preview-list" v-if="files.length">
				<view v-for="(f, idx) in files" :key="idx" class="preview-item">
					<image v-if="isImage(f.path)" :src="f.path" mode="aspectFill" class="preview-img"></image>
					<video v-else :src="f.path" controls class="preview-video"></video>
					<view class="remove" @click="removeFile(idx)">×</view>
				</view>
			</view>
		</view>

		<view class="submit-wrap">
			<button class="confirm-btn" :disabled="loading" @click="submitTodo">
				{{ loading ? $t('todo.submitting') : $t('todo.submit') }}
			</button>
		</view>
	</view>
</template>

<script>
// #ifdef MP-WEIXIN
import COS from 'cos-wx-sdk-v5';
// #endif

const token = uni.getStorageSync('access_token') || '';
const cos = new COS({
	SimpleUploadMethod: 'putObject',
	getAuthorization: function (options, callback) {
		uni.request({
			url: `${getApp().globalData.baseUrl}/sts`,
			dataType: 'json',
			header: {
				Authorization: token ? `Bearer ${token}` : ''
			},
			success: function (result) {
				const data = result.data;
				if (!data) return console.error('credentials invalid');
				callback({
					TmpSecretId: data.tmpSecretId,
					TmpSecretKey: data.tmpSecretKey,
					SecurityToken: data.token,
					XCosSecurityToken: data.token,
					StartTime: data.startTime,
					ExpiredTime: data.expiredTime
				});
			}
		});
	}
});
import { request } from '@/common/request.js';
export default {
	data() {
		return {
			todoId: '',
			orderId: '',
			orderNo: '',
			actionCode: '',
			actionName: '',
			files: [],
			loading: false
		};
	},
	onLoad(options) {
		this.todoId = options.todoId || '';
		this.orderId = options.orderId || '';
		this.orderNo = options.orderNo || '';
		this.actionCode = options.actionCode || '';
		this.actionName = options.actionName || '';
	},
	methods: {
		isImage(path) {
			return /\.(jpg|jpeg|png|gif)$/i.test(path);
		},
		getFileType(file) {
			const name = file.name || file.path;
			const ext = name.split('.').pop().toLowerCase();

			if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) return 'image';
			if (['mp4', 'mov', 'avi', 'mkv', 'wmv'].includes(ext)) return 'video';
			if (['mp3', 'wav', 'aac', 'ogg'].includes(ext)) return 'audio';
			if (['pdf'].includes(ext)) return 'pdf';
			if (['doc', 'docx'].includes(ext)) return 'word';
			if (['xls', 'xlsx'].includes(ext)) return 'excel';
			if (['ppt', 'pptx'].includes(ext)) return 'ppt';
			if (['txt', 'log', 'md'].includes(ext)) return 'text';
			return 'other';
		},

		takePhoto() {
			uni.chooseMedia({
				sourceType: ['camera', 'album'],
				mediaType: ['mix'],
				success: async (res) => {
					res.tempFiles.forEach((file) => {
						this.files.push({
							path: file.tempFilePath,
							name: file.tempFilePath.split('/').pop(),
							thumbTempFilePath: file.thumbTempFilePath,
							type: file.fileType
						});
					});
				},
				fail: (err) => {
					console.error('拍照失败：', err);
				}
			});
		},
		chooseFile() {
			uni.chooseMessageFile({
				count: 9,
				type: 'all', // 可选：image, video, all, file
				success: (res) => {
					res.tempFiles.forEach((file) => {
						this.files.push({
							path: file.path,
							name: file.name,
							type: this.getFileType(file)
						});
					});
				},
				fail: (err) => {
					console.error('chooseMessageFile 失败：', err);
				}
			});
		},
		removeFile(idx) {
			this.files.splice(idx, 1);
		},
		uploadFileToCOS(orderNo, file) {
			return new Promise((resolve, reject) => {
				const now = new Date();

				// 格式化年月日
				const year = now.getFullYear();
				const month = String(now.getMonth() + 1).padStart(2, '0');
				const day = String(now.getDate()).padStart(2, '0');
				// 构建 Key 路径，例如：orders/2025/11/11/ORDER123/image.jpg
				const key = `orders/${year}/${month}/${day}/${orderNo}/${file.name}`;

				cos.postObject(
					{
						Bucket: 'autobss-1300679246',
						Region: 'ap-hongkong',
						Key: key,
						FilePath: file.path,
						onProgress: (progressData) => {
							if (progressData.percent === 1) {
								console.log('上传进度100%，等待服务器确认...');
							}
						}
					},
					function (err, data) {
						if (err) {
							reject(err);
						} else {
							resolve({
								cosKey: key,
								type: file.type
							});
						}
					}
				);
			});
		},
		async submitTodo() {
			if (!this.files.length) {
				uni.showToast({ title: this.$t('todo.uploadTip'), icon: 'none' });
				return;
			}
			this.loading = true;
			uni.showLoading({ title: this.$t('todo.uploadInProgress'), mask: true });
			try {
				const uploadResults = await Promise.all(this.files.map((f) => this.uploadFileToCOS(this.orderNo, f)));
				const files = uploadResults.map((f) => `${f.type}:/${f.cosKey}`);
				await request({
					url: `/todos/${this.todoId}/complete`,
					method: 'POST',
					data: { orderId: this.orderId, todoId: this.todoId, actionCode: this.actionCode, attachment: files.join(';') }
				});

				uni.showToast({ title: this.$t('todo.completeSuccess'), icon: 'success' });
				setTimeout(() => {
					const pages = getCurrentPages();
					const prev = pages[pages.length - 2];
					if (prev?.$vm?.loadTodos) prev.$vm.loadTodos(true);
					uni.navigateBack();
				}, 800);
			} catch (e) {
				console.error(e);
				uni.showToast({ title: this.$t('todo.completeFail'), icon: 'none' });
			} finally {
				uni.hideLoading();
				this.loading = false;
			}
		}
	}
};
</script>

<style>
.page {
	background: #f5f6f8;
	min-height: 100vh;
	padding: 20rpx;
}

.card,
.upload-card {
	background: #fff;
	border-radius: 12rpx;
	padding: 20rpx;
	margin-bottom: 20rpx;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
}

.title {
	font-size: 32rpx;
	font-weight: 600;
	color: #222;
	margin-bottom: 16rpx;
}

.field {
	font-size: 26rpx;
	margin-bottom: 10rpx;
}

.label {
	color: #888;
}

.upload-actions {
	display: flex;
	gap: 20rpx;
	margin-bottom: 20rpx;
}

.btn {
	background: #ff6b00;
	color: #fff;
	border-radius: 8rpx;
	padding: 12rpx 28rpx;
	font-size: 26rpx;
}

.preview-list {
	display: flex;
	flex-wrap: wrap;
	gap: 16rpx;
}

.preview-item {
	position: relative;
	width: 200rpx;
	height: 200rpx;
}

.preview-img,
.preview-video {
	width: 100%;
	height: 100%;
	border-radius: 8rpx;
}

.remove {
	position: absolute;
	top: -10rpx;
	right: -10rpx;
	background: rgba(0, 0, 0, 0.6);
	color: #fff;
	width: 40rpx;
	height: 40rpx;
	line-height: 40rpx;
	text-align: center;
	border-radius: 20rpx;
	font-size: 28rpx;
}

.submit-wrap {
	margin-top: 40rpx;
	display: flex;
	justify-content: center;
}

.confirm-btn {
	width: 80%;
	background: linear-gradient(90deg, #ff8a00, #ff6b00);
	color: #fff;
	border-radius: 40rpx;
	padding: 16rpx 0;
	font-size: 28rpx;
}
</style>
