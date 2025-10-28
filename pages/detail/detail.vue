<template>
	<scroll-view scroll-y class="page">
		<!-- 顶部轮播 -->
		<swiper class="car-swiper" indicator-dots="true" autoplay="true" interval="3000" duration="500">
			<swiper-item v-for="(img, index) in car.swiper" :key="index">
				<image class="car-img" :src="img" mode="aspectFill"></image>
				<view class="swiper-overlay"></view>
			</swiper-item>
		</swiper>

		<!-- 车辆简介 -->
		<view class="car-title">{{ car.summary }}</view>

		<!-- 参数 + 配置表格 -->
		<view class="section">
			<view class="section-title">Технические характеристики</view>
			<view class="table">
				<!-- 参数 -->
				<view class="table-row" v-for="(item, idx) in car.specs" :key="'spec-' + idx">
					<view class="table-cell table-cell-label">{{ item.name }}</view>
					<view class="table-cell table-cell-value">{{ item.value }}</view>
				</view>

				<!-- 配置项 -->
				<view class="table-row" v-for="(f, i) in car.features" :key="'feature-' + i" :class="{ disabled: !f.available }">
					<view class="table-cell table-cell-label">
						{{ f.label }}
					</view>
					<view class="table-cell table-cell-value">
						<text v-if="f.available" class="yes">✓</text>
						<text v-else class="no">—</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 视频介绍 -->
		<view class="section">
			<view class="section-title">Видеопрезентация</view>
			<video :src="car.videoUrls?.[0]" controls class="car-video"></video>
		</view>

		<!-- 图片展示 -->
		<view class="section">
			<view class="section-title">Реальные снимки транспортных средств</view>

			<view class="image-grid">
				<view v-for="(img, index) in images" :key="index" class="image-item" @click="previewImage(index)">
					<!-- 占位骨架 -->
					<view v-if="!loaded[index]" class="img-skeleton"></view>

					<!-- 图片 -->
					<image
						:src="img.url"
						mode="aspectFill"
						class="grid-img"
						:class="{ wide: img.ratio > 1.4, tall: img.ratio < 0.8 }"
						@load="handleLoad(index)"
						@error="handleError(index)"
						:style="{ opacity: loaded[index] ? 1 : 0 }"
					/>
				</view>
			</view>
		</view>

		<view class="bottom-space"></view>
	</scroll-view>
</template>

<script>
export default {
	data() {
		return {
			carId: null,
			loading: false,
			lang: '',
			iconPrefix: `${getApp().globalData.baseImgUrl}`,
			car: {},
			images: [], // 存储含宽高信息的图片
			loaded: []
		};
	},
	async onLoad(query) {
		this.carId = query.id || null;
		uni.getSystemInfo({
			success: (res) => {
				this.lang = res.language;
			}
		});
		await this.findCarDetails(this.carId);
		this.loadImageInfo(); // 拉取图片信息
	},
	methods: {
		async findCarDetails() {
			if (this.loading) return;
			this.loading = true;
			const url = `${getApp().globalData.baseUrl}/cars/${this.carId}?lang=${this.lang}`;
			const res = await new Promise((resolve) => {
				uni.request({
					url: url,
					success: (r) => resolve(r.data),
					fail: () => resolve(null)
				});
			});

			if (res && res.code === 0) {
				this.car = res.data;
			} else {
				uni.showToast({ title: body.msg || '加载失败', icon: 'none' });
				return;
			}
		},
		async loadImageInfo() {
			if (!this.car.imageUrls?.length) return;
			const promises = this.car.imageUrls.map(async (url) => {
				const info = await this.getImageInfo(url);
				const ratio = info?.width && info?.height ? info.width / info.height : 1;
				return { url, ratio };
			});
			this.images = await Promise.all(promises);
			this.loaded = new Array(this.images.length).fill(false);
		},
		getImageInfo(url) {
			return new Promise((resolve) => {
				uni.request({
					url: url + '?imageInfo',
					success: (res) => resolve(res.data),
					fail: () => resolve({})
				});
			});
		},
		handleLoad(index) {
			this.$set(this.loaded, index, true);
		},
		handleError(index) {
			this.$set(this.loaded, index, true);
		},

		previewImage(index) {
			const urls = this.images.map((i) => i.url.split('?')[0]); // 去掉 ?imageInfo
			uni.previewImage({
				current: this.images[index].url,
				urls: urls
			});
		}
	}
};
</script>

<style>
.page {
	height: 100vh;
	background-color: #f7f7f7;
}

/* 顶部轮播 */
.car-swiper {
	width: 100%;
	height: 450rpx;
	border-bottom-left-radius: 24rpx;
	border-bottom-right-radius: 24rpx;
	overflow: hidden;
	box-shadow: 0 6rpx 12rpx rgba(0, 0, 0, 0.08);
	position: relative;
}
.car-img {
	width: 100%;
	height: 100%;
}
.swiper-overlay {
	position: absolute;
	left: 0;
	top: 0;
	right: 0;
	bottom: 0;
	background: linear-gradient(to bottom, rgba(0, 0, 0, 0.1), rgba(0, 0, 0, 0.05));
}

/* 车辆简介 */
.car-title {
	font-size: 42rpx;
	font-weight: 700;
	padding: 30rpx 20rpx;
	background-color: #fff;
	border-radius: 16rpx;
	box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
}

/* 通用 section */
.section {
	margin-top: 24rpx;
	padding: 24rpx;
	background-color: #fff;
	border-radius: 20rpx;
	box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.06);
}
.section-title {
	font-size: 32rpx;
	font-weight: 700;
	margin-bottom: 24rpx;
	color: #333;
	border-left: 8rpx solid #ff4d4f;
	padding-left: 16rpx;
}

/* 表格优化 */
.table {
	width: 100%;
	border-collapse: collapse;
	border-radius: 12rpx;
	overflow: hidden;
	border: 1rpx solid #ddd;
}
.table-row {
	display: flex;
	border-bottom: 1rpx solid #eee;
}
.table-row:last-child {
	border-bottom: none;
}

/* 左右比例 4:6 */
.table-cell {
	display: flex;
	align-items: center;
	padding: 20rpx;
}

/* 左列样式：统一浅灰 */
.table-cell-label {
	flex: 0.4;
	font-weight: 600;
	color: #333;
	display: flex;
	align-items: center;
	background-color: #f7f7f7;
}

/* 右列样式：交替底色 */
.table-cell-value {
	flex: 0.6;
	justify-content: flex-end;
	text-align: right;
	color: #555;
	font-size: 28rpx;
}

/* 奇偶行右侧交替更明显 */
.table-row:nth-child(odd) .table-cell-value {
	background-color: #ffffff; /* 纯白 */
}
.table-row:nth-child(even) .table-cell-value {
	background-color: #f0f3f7; /* 比左侧灰略深一点的淡蓝灰 */
}

/* 状态样式 */
.disabled {
	opacity: 0.5;
}
.yes {
	color: #27ae60;
	font-weight: bold;
}
.no {
	color: #aaa;
}

/* 视频展示 */
.car-video {
	width: 100%;
	height: 400rpx;
	margin-top: 20rpx;
	border-radius: 20rpx;
	box-shadow: 0 8rpx 18rpx rgba(0, 0, 0, 0.12);
	background-color: #000;
	transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.car-video:hover {
	transform: scale(1.01);
	box-shadow: 0 12rpx 28rpx rgba(0, 0, 0, 0.18);
}

.image-grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(300rpx, 1fr));
	gap: 14rpx;
	margin-top: 10rpx;
}

/* 通用图片样式 */
.grid-img {
	width: 100%;
	height: 260rpx;
	border-radius: 20rpx;
	object-fit: cover;
	box-shadow: 0 8rpx 18rpx rgba(0, 0, 0, 0.08);
	transition: transform 0.3s ease, box-shadow 0.3s ease;
	cursor: pointer;
}

/* 鼠标悬停效果 */
.grid-img:hover {
	transform: scale(1.04);
	box-shadow: 0 12rpx 28rpx rgba(0, 0, 0, 0.16);
}

/* 宽图自动占两列 */
.grid-img.wide {
	grid-column: span 2;
	height: 220rpx;
}

/* 竖图自动跨两行 */
.grid-img.tall {
	grid-row: span 2;
	height: 520rpx;
}

/* 底部留白与按钮 */
.bottom-space {
	padding: 20rpx;
	display: flex;
	gap: 20rpx;
}
.btn-primary {
	flex: 1;
	height: 80rpx;
	background: #ff4d4f;
	color: #fff;
	border-radius: 16rpx;
	font-size: 32rpx;
	font-weight: bold;
	transition: opacity 0.2s ease;
}
.btn-primary:active {
	opacity: 0.85;
}
.btn-secondary {
	flex: 1;
	height: 80rpx;
	background: #fff;
	border: 2rpx solid #ff4d4f;
	color: #ff4d4f;
	border-radius: 16rpx;
	font-size: 32rpx;
	font-weight: bold;
	transition: background 0.2s ease, color 0.2s ease;
}
.btn-secondary:active {
	background: #ffeded;
	color: #d90000;
}
.image-item {
	position: relative;
	overflow: hidden;
	border-radius: 20rpx;
}

/* 骨架动画 */
.img-skeleton {
	width: 100%;
	padding-bottom: 70%;
	border-radius: 20rpx;
	background: linear-gradient(90deg, #f2f2f2 25%, #e8e8e8 50%, #f2f2f2 75%);
	background-size: 400% 100%;
	animation: skeleton-loading 1.4s ease infinite;
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
}

@keyframes skeleton-loading {
	0% {
		background-position: 100% 50%;
	}
	100% {
		background-position: 0 50%;
	}
}
</style>
