<template>
	<!-- <view class="page">
		<swiper class="ad-swiper" autoplay circular interval="4000" indicator-dots>
			<swiper-item v-for="(ad, i) in ads" :key="i">
				<image :src="ad.img" class="ad-img" mode="aspectFill" @click="goAd(ad)" />
			</swiper-item>
		</swiper>
		<view class="item" v-for="car in cars" :key="car.id" @click="goDetail(car)">
			<image class="car-img" :src="car.imgUrl" mode="aspectFill"></image>
			<view class="car-info">
				<view class="car-name">{{ car.name }}</view>
				<view class="car-desc">{{ car.summary }}</view>
			</view>
		</view>
		<view class="loading" v-if="loading">Загрузка...</view>
		<view class="no-more" v-if="noMore">Все загружено</view>
	</view> -->

	<scroll-view scroll-y style="height: 100vh" @scrolltolower="onReachBottom">
		<!-- 顶部广告位 -->
		<swiper class="ad-swiper" autoplay circular interval="4000" indicator-dots>
			<swiper-item v-for="(ad, i) in ads" :key="i">
				<image :src="ad.img" class="ad-img" mode="aspectFill" @click="goAd(ad)" />
			</swiper-item>
		</swiper>
		<view class="item" v-for="car in cars" :key="car.id" @click="goDetail(car)">
			<image class="car-img" :src="car.imgUrl" mode="aspectFill"></image>
			<view class="car-info">
				<view class="car-name">{{ car.name }}</view>
				<view class="car-desc">{{ car.summary }}</view>
			</view>
		</view>

		<view class="loading" v-if="loading">Загрузка...</view>
		<view class="no-more" v-if="noMore">Все загружено</view>
	</scroll-view>
</template>

<script>
export default {
	data() {
		return {
			page: 1,
			pageSize: 10,
			cars: [],
			ads: [
				{
					img: 'https://img.autoboss.cloud/car/xyL/xyL1.jpg'
				},
				{
					img: 'https://img.autoboss.cloud/car/xyL/xyL2.jpg'
				},
				{
					img: 'https://img.autoboss.cloud/car/xyL/xyL3.jpg'
				}
			],
			loading: false,
			noMore: false
		};
	},
	onLoad() {
		this.loadCars();
	},
	onReachBottom() {
		console.log('onReachBottom');
		if (!this.loading && !this.noMore) {
			this.page++;
			this.loadCars();
		}
	},
	onPullDownRefresh() {
		console.log('onReachBottom');
		this.page = 1;
		this.noMore = false;
		this.loadCars(() => {
			uni.stopPullDownRefresh(); // 停止刷新动画
		});
	},
	methods: {
		loadCars(done) {
			if (this.loading) return;
			this.loading = true;
			const url = `${getApp().globalData.baseUrl}/cars?page_num=${this.page}&page_size=${this.pageSize}`;
			uni.request({
				url: url,
				method: 'GET',
				success: (res) => {
					// 兼容各种后端返回情况
					if (!res || !res.data) {
						uni.showToast({
							title: '服务器返回异常',
							icon: 'none'
						});
						return;
					}
					const body = res.data;
					if (body.code !== 0) {
						uni.showToast({
							title: body.msg || '加载失败',
							icon: 'none'
						});
						return;
					}

					const cars = body.data && body.data.cars ? body.data.cars : [];
					const mapped = cars.map((c) => {
						let img = 'https://img.autoboss.cloud/' + c.thumbnail;
						if (!img && Array.isArray(c.gallery) && c.gallery.length > 0) {
							img = c.gallery[0].url;
						}
						return {
							id: c.id,
							name: c.name,
							summary: c.summary,
							imgUrl: img
						};
					});
					if (this.page === 1) {
						this.cars = mapped;
					} else {
						this.cars = [...this.cars, ...mapped];
					}

					if (mapped.length < this.pageSize) {
						this.noMore = true;
					}
				},
				fail: (err) => {
					console.error('请求失败', err);
					uni.showToast({
						title: '网络请求失败',
						icon: 'none'
					});
				},
				complete: () => {
					this.loading = false;
					done && done();
				}
			});
		},
		goDetail(car) {
			uni.navigateTo({
				url: `/pages/detail/detail?id=${car.id}`
			});
		}
	}
};
</script>

<style>
scroll-view {
	box-sizing: border-box;
	padding: 20rpx;
	background-color: #f8f8f8;
}

/* 🔹 顶部广告轮播样式 */
.ad-swiper {
	height: 300rpx;
	border-radius: 16rpx;
	overflow: hidden;
	margin-bottom: 30rpx;
}

.ad-img {
	width: 100%;
	height: 100%;
}

.item {
	display: flex;
	flex-direction: row;
	background: #fff;
	margin-bottom: 20rpx;
	border-radius: 12rpx;
	overflow: hidden;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.car-img {
	width: 260rpx;
	height: 180rpx;
	flex-shrink: 0;
}

.car-info {
	flex: 1;
	padding: 20rpx;
	display: flex;
	flex-direction: column;
	justify-content: center;
}

.car-name {
	font-size: 32rpx;
	font-weight: bold;
}

.car-desc {
	margin-top: 8rpx;
	color: #666;
	font-size: 26rpx;
}

.loading,
.no-more {
	text-align: center;
	color: #888;
	padding: 20rpx;
}
</style>
