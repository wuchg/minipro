<template>
	<view class="page">
		<view class="form-card">
			<!-- 选择车辆 -->
			<view class="form-item">
				<text class="label">选择车辆</text>
				<picker :range="cars" range-key="name" @change="onCarChange">
					<view class="picker">{{ form.carName || '请选择车辆' }}</view>
				</picker>
			</view>

			<!-- 选择业务员 -->
			<view class="form-item">
				<text class="label">业务员</text>
				<picker :range="salesList" range-key="name" @change="onSalesChange">
					<view class="picker">
						{{ form.salesName || '请选择业务员' }}
					</view>
				</picker>
			</view>

			<!-- 个性化配置 Tags -->
			<view class="form-item">
				<text class="label">个性化配置</text>
				<view class="config-tags">
					<view v-for="tag in allTags" :key="tag" :class="['tag', selectedTags.includes(tag) ? 'selected' : '']" @click="toggleTag(tag)">
						{{ tag }}
					</view>
					<input v-show="showInput" v-model="newTag" placeholder="输入新标签" @confirm="confirmNewTag" @blur="cancelNewTag" class="tag-input" :focus="showInput" />
					<view class="tag add-tag" v-show="!showInput" @click="showAddInput">+ 新增标签</view>
				</view>
			</view>

			<view class="form-item">
				<text class="label">车架号（VIN）</text>
				<view class="vin-box">
					<input v-model="form.vin" placeholder="请输入或拍照识别" class="input-vin" maxlength="17" />
					<view class="vin-actions">
						<button size="mini" @click="chooseImage">拍照识别</button>
					</view>
				</view>
			</view>

			<!-- 备注 -->
			<view class="form-item">
				<text class="label">备注</text>
				<textarea v-model="form.remark" placeholder="请输入备注" class="textarea" />
			</view>

			<!-- 提交按钮 -->
			<button class="submit-btn" type="primary" :disabled="submitting" @click="submitOrder">
				{{ submitting ? '提交中...' : '提交订单' }}
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
					// v1.2.0之前版本的 SDK 使用 XCosSecurityToken 而不是 SecurityToken
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
			cars: [],
			allTags: [], // 标签列表从后端加载
			selectedTags: [],
			showInput: false, // 是否显示输入框
			newTag: '',
			salesList: [], //
			form: {
				carId: '',
				carName: '',
				vin: '',
				remark: '',
				userId: '',
				salesName: ''
			},
			submitting: false
		};
	},
	onLoad() {
		this.loadCars();
		this.loadTags();
		this.loadSales();
	},
	methods: {
		uploadFileToCOS(filePath) {
			return new Promise((resolve, reject) => {
				cos.postObject(
					{
						Bucket: 'autobss-1300679246',
						Region: 'ap-hongkong',
						Key: '/vin/' + filePath.split('/').pop(),
						FilePath: filePath,
						onProgress: (progressData) => {
							if (progressData.percent === 1) {
								console.log('上传进度100%，等待服务器确认...');
							}
						}
					},
					function (err, data) {
						if (err) {
							console.error('上传失败', err);
							reject(err);
						} else {
							console.log('上传成功:', filePath);
							resolve({
								cosKey: '/vin/' + filePath.split('/').pop()
							});
						}
					}
				);
			});
		},
		showAddInput() {
			this.showInput = true;
			this.$nextTick(() => {
				this.newTag = '';
				// 在 H5 和 App 端，:focus 绑定就够了；
				// 在小程序端，有时还需要主动触发：
				setTimeout(() => {
					this.showInput = true; // 再触发一次刷新，确保 focus 生效
				}, 30);
			});
		},
		// 切换 tag 选中状态
		toggleTag(tag) {
			const idx = this.selectedTags.indexOf(tag);
			if (idx >= 0) this.selectedTags.splice(idx, 1);
			else this.selectedTags.push(tag);
		},

		// 确认新增 tag
		async confirmNewTag() {
			const value = this.newTag.trim();
			if (!value) return this.cancelNewTag();

			if (!this.allTags.includes(value)) {
				this.allTags.push(value);
				try {
					await request({ url: '/car-tags', method: 'POST', data: { label: value } });
				} catch (e) {
					console.error('save tag error', e);
					uni.showToast({ title: '保存标签失败', icon: 'none' });
				}
			}

			if (!this.selectedTags.includes(value)) {
				this.selectedTags.push(value);
			}

			this.newTag = '';
			this.showInput = false;
		},

		// 取消新增
		cancelNewTag() {
			this.newTag = '';
			this.showInput = false;
		},

		// 加载车辆
		async loadCars() {
			try {
				const res = await request({ url: '/cars?page_num=1&page_size=100', method: 'GET' });
				if (res.code === 0 && res.data && res.data.cars) {
					this.cars = res.data.cars.map((c) => ({ id: c.id, name: c.name }));
				} else {
					uni.showToast({ title: res.msg || '加载车辆失败', icon: 'none' });
				}
			} catch (e) {
				console.error('loadCars error', e);
				uni.showToast({ title: '网络错误', icon: 'none' });
			}
		},

		// 加载标签
		async loadTags() {
			try {
				const res = await request({ url: '/car-tags', method: 'GET' });
				if (res.code === 0 && Array.isArray(res.data.carTags)) {
					this.allTags = res.data.carTags?.map((it) => it.label);
				}
			} catch (e) {
				console.error('loadTags error', e);
			}
		},

		async loadSales() {
			try {
				const res = await request({ url: '/auth/get-sales', method: 'GET' });
				if (res.code === 0 && Array.isArray(res.data)) {
					this.salesList = res.data.map((s) => ({
						id: s.id,
						name: s.username
					}));
				}
			} catch (e) {
				console.error('loadSales error', e);
				uni.showToast({ title: '加载业务员失败', icon: 'none' });
			}
		},
		async chooseImage() {
			const that = this;
			uni.chooseImage({
				count: 1,
				sourceType: ['camera', 'album'],
				success: async (res) => {
					const filePath = res.tempFilePaths[0];
					await that.recognizeVin(filePath);
				}
			});
		},

		async recognizeVin(filePath) {
			try {
				uni.showLoading({ title: '识别中...' });
				const { cosKey } = await this.uploadFileToCOS(filePath);
				console.log(cosKey);
				const data = await request({
					url: '/ocr',
					method: 'POST',
					data: {
						vinImgUrl: getApp().globalData.baseImgUrl + cosKey
					}
				});

				if (data.code === 0 && data.data) {
					this.form.vin = data.data;
					uni.showToast({ title: '识别成功', icon: 'success' });
				} else {
					this.form.vin = '';
					uni.showToast({ title: data.msg || '识别失败', icon: 'none' });
				}
			} catch (e) {
				console.error('recognizeVin error', e);
				uni.showToast({ title: '识别失败', icon: 'none' });
			} finally {
				uni.hideLoading();
			}
		},

		// 车辆选择
		onCarChange(e) {
			const index = e.detail.value;
			const car = this.cars[index];
			this.form.carId = car.id;
			this.form.carName = car.name;
		},

		onSalesChange(e) {
			const index = e.detail.value;
			const s = this.salesList[index];
			this.form.userId = s.id;
			this.form.salesName = s.name;
		},

		// 提交订单
		async submitOrder() {
			if (!this.form.carId) {
				return uni.showToast({ title: '请选择车辆', icon: 'none' });
			}
			if (!this.form.userId) {
				return uni.showToast({ title: '请选择业务员', icon: 'none' });
			}
			if (this.submitting) return;

			this.submitting = true;
			try {
				const res = await request({
					url: '/orders',
					method: 'POST',
					data: {
						carId: this.form.carId,
						userId: this.form.userId,
						carRemarks: this.form.remark,
						carTags: this.selectedTags?.join(','),
						carVin: this.form.vin
					}
				});
				if (res.code === 0) {
					uni.showToast({ title: '下单成功', icon: 'success' });
					setTimeout(() => uni.navigateBack(), 1000);
				} else {
					uni.showToast({ title: res.msg || '提交失败', icon: 'none' });
				}
			} catch (e) {
				console.error('submitOrder error', e);
				uni.showToast({ title: '网络错误', icon: 'none' });
			} finally {
				this.submitting = false;
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
	border-radius: 16rpx;
	padding: 30rpx;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}
.form-item {
	margin-bottom: 30rpx;
}
.label {
	display: block;
	font-size: 28rpx;
	color: #333;
	margin-bottom: 12rpx;
}
.picker,
.textarea {
	background: #f7f8fa;
	border-radius: 8rpx;
	padding: 20rpx;
	border: 1rpx solid #eee;
	font-size: 28rpx;
	color: #333;
}
.textarea {
	min-height: 160rpx;
}
.submit-btn {
	background: linear-gradient(90deg, #ff8a00, #ff6b00);
	color: #fff;
	border-radius: 12rpx;
	height: 88rpx;
	line-height: 88rpx;
	font-size: 32rpx;
	width: 100%;
	margin-top: 20rpx;
}

/* Tag 样式 */
.config-tags {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	background: #f7f8fa;
	padding: 16rpx;
	border-radius: 12rpx;
}
.tag {
	padding: 6px 12px;
	margin: 4px;
	border: 1px solid #ccc;
	border-radius: 12px;
	display: inline-block;
	cursor: pointer;
}
.tag.add-tag {
	border: 1px dashed #999;
	color: #999;
}
.selected {
	background-color: #ff7a00;
	color: #fff;
	border-color: #ff7a00;
}
input {
	border: none;
	background: transparent;
	outline: none;
	margin-left: 8rpx;
	width: 120rpx;
	font-size: 28rpx;
}
.tag-input {
	padding: 6px 12px;
	margin: 4px;
	border: 1px dashed #ff7a00;
	border-radius: 12px;
	font-size: 28rpx;
	width: 160rpx;
	background: #fff;
}
.vin-box {
	display: flex;
	align-items: center;
	background: #f7f8fa;
	border-radius: 8rpx;
	border: 1rpx solid #eee;
	padding: 10rpx;
}
.input-vin {
	flex: 1;
	padding: 20rpx;
	font-size: 28rpx;
	color: #333;
	background: transparent;
}
.vin-actions {
	margin-left: 10rpx;
}
.vin-actions button {
	background: linear-gradient(90deg, #ff8a00, #ff6b00);
	color: #fff;
	border-radius: 8rpx;
}
</style>
