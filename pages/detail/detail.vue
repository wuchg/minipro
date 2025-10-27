<template>
	<scroll-view scroll-y class="page">
		<!-- 顶部轮播 -->
		<swiper class="car-swiper" indicator-dots="true" autoplay="true" interval="3000" duration="500">
			<swiper-item v-for="(img, index) in car.swiper" :key="index">
				<image class="car-img" :src="img" mode="aspectFill"></image>
			</swiper-item>
		</swiper>

		<!-- 车辆简介 -->
		<view class="car-title">{{ car.summary }}</view>

		<!-- 基本信息描述 -->
		<!-- 		<view class="section">
			<view class="section-title">Описание продукта / Product Description</view>
			<view class="section-text">
			</view>
		</view> -->

		<!-- 参数表格 -->
		<view class="section">
			<view class="section-title">Технические характеристики</view>
			<view class="table">
				<view class="table-row" v-for="(item, idx) in car.specs" :key="idx">
					<view class="table-cell table-cell-label">{{ item.name }}</view>
					<view class="table-cell table-cell-value">{{ item.value }}</view>
				</view>
			</view>
		</view>

		<!-- 新增配置 Features -->
		<view class="section">
			<view class="section-title">Конфигурация транспортного средства</view>
			<view class="feature-grid">
				<view class="feature-item" v-for="(f, i) in car.features" :key="i" :class="{ disabled: !f.available }">
					<image :src="iconPrefix + f.icon" class="feature-icon"></image>
					<text class="feature-name">{{ f.label }}</text>
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
			<image v-for="(img, index) in car.imageUrls" :key="index" class="detail-img" :src="img" mode="widthFix"></image>
		</view>

		<view class="bottom-space"></view>
	</scroll-view>

	<!-- 悬浮客服按钮 -->
	<!-- <view class="customer-btn" @click="openCustomer">
		<image :src="customerIcon" class="customer-icon"></image>
	</view> -->
</template>

<script>
export default {
	data() {
		return {
			carId: null,
			loading: false,
			lang: '',
			iconPrefix: `${getApp().globalData.baseImgUrl}`,
			customerIcon: `${getApp().globalData.baseImgUrl}/customer-icon.png`,
			car: {}
		};
	},
	onLoad(query) {
		this.carId = query.id || null;
		uni.getSystemInfo({
			success: (res) => {
				// console.log(res);
				this.lang = res.language;
			}
		});
		this.findCarDetails(this.carId);
	},
	methods: {
		findCarDetails() {
			if (this.loading) return;
			this.loading = true;
			const url = `${getApp().globalData.baseUrl}/cars/${this.carId}?lang=${this.lang}`;
			uni.request({
				url: url,
				success: (res) => {
					if (!res || !res.data) {
						uni.showToast({ title: '服务器返回异常', icon: 'none' });
						return;
					}
					const body = res.data;
					if (body.code !== 0) {
						uni.showToast({ title: body.msg || '加载失败', icon: 'none' });
						return;
					}
					this.car = body.data;
				},
				complete: () => (this.loading = false)
			});
		},
		openCustomer() {
			uni.navigateTo({ url: `/pages/tempChat/tempChat?carId=${this.car.id}` });
		}
	}
};
</script>

<style>
.page {
	height: 100vh;
	background-color: #f5f5f5;
}
.car-swiper {
	width: 100%;
	height: 400rpx;
}
.car-img {
	width: 100%;
	height: 100%;
}
.car-title {
	font-size: 40rpx;
	font-weight: bold;
	padding: 20rpx;
	background-color: #fff;
}
.section {
	margin-top: 20rpx;
	padding: 20rpx;
	background-color: #fff;
	border-radius: 12rpx;
}
.section-title {
	font-size: 32rpx;
	font-weight: bold;
	margin-bottom: 26rpx;
	color: #333;
}
.section-text {
	font-size: 28rpx;
	color: #555;
	line-height: 40rpx;
}
.table {
	border-top: 1rpx solid #ddd;
	border-left: 1rpx solid #ddd;
}
.table-row {
	display: flex;
}
.table-cell {
	flex: 1;
	padding: 16rpx;
	border-right: 1rpx solid #ddd;
	border-bottom: 1rpx solid #ddd;
}
.table-cell-label {
	background-color: #f7f7f7;
	font-weight: bold;
}
.table-cell-value {
	color: #333;
}

/* 禁用状态：整体变灰、透明度降低 */
.feature-item.disabled {
	opacity: 0.5;
}

.feature-item.disabled .feature-icon {
	filter: grayscale(100%) brightness(0.7);
	background: #e0e0e0;
}

.feature-item.disabled .feature-name {
	color: #aaa;
}

.feature-grid {
	display: flex;
	flex-wrap: wrap;
	justify-content: space-between;
	margin-top: 10rpx;
}
.feature-item {
	width: 25%;
	text-align: center;
	margin-bottom: 30rpx;
}
.feature-icon {
	width: 80rpx;
	height: 80rpx;
	background: linear-gradient(135deg, #ff8a00, #ff6b00);
	border-radius: 20rpx;
	padding: 10rpx;
}
.feature-name {
	display: block;
	margin-top: 10rpx;
	font-size: 26rpx;
	color: #333;
}

.car-video {
	width: 100%;
	height: 400rpx;
	margin-top: 10rpx;
}
.detail-img {
	width: 100%;
	margin-top: 10rpx;
	border-radius: 8rpx;
}

/* 悬浮客服按钮 */
.customer-btn {
	position: fixed;
	right: 30rpx;
	bottom: 120rpx;
	width: 100rpx;
	height: 100rpx;
	background-color: #fff;
	border-radius: 50%;
	box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.2);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 999;
}
.customer-icon {
	width: 60rpx;
	height: 60rpx;
}

.bottom-space {
	height: 120rpx;
}
</style>
