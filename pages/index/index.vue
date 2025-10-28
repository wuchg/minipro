<template>
	<scroll-view scroll-y class="page" @scrolltolower="onReachBottom">
		<!-- 顶部广告位 -->
		<swiper class="ad-swiper" autoplay circular interval="4000" indicator-dots indicator-color="rgba(255,255,255,0.4)" indicator-active-color="#fff">
			<swiper-item v-for="(ad, i) in ads" :key="i">
				<image :src="ad.img" class="ad-img" mode="aspectFill" @click="goAd(ad)" />
			</swiper-item>
		</swiper>

		<!-- 分隔线或分组标题 -->
		<view class="section-header">
			<text class="section-title">热门车型</text>
		</view>

		<!-- 车辆列表 -->
		<view v-for="car in cars" :key="car.id" class="car-card" @click="goDetail(car)">
			<view class="car-img-wrapper">
				<image class="car-img" :src="car.imgUrl" mode="aspectFill"></image>

				<!-- 角标 -->
				<view v-if="car.tag" class="car-tag" :class="'tag-' + car.tag">
					{{ car.tag }}
				</view>
			</view>

			<view class="car-info">
				<view class="car-name">{{ car.name }}</view>
				<view class="car-desc">{{ car.summary }}</view>
			</view>
		</view>

		<view class="loading" v-if="loading">加载中...</view>
		<view class="no-more" v-if="noMore">—— 没有更多了 ——</view>
	</scroll-view>
</template>

<script>
export default {
	data() {
		return {
			page: 1,
			pageSize: 10,
			cars: [],
			ads: [],
			loading: false,
			noMore: false
		};
	},
	onLoad() {
		this.loadCars();
		this.loadAds();
	},
	onReachBottom() {
		if (!this.loading && !this.noMore) {
			this.page++;
			this.loadCars();
		}
	},
	onPullDownRefresh() {
		this.page = 1;
		this.noMore = false;
		this.loadCars(() => uni.stopPullDownRefresh());
	},
	methods: {
		loadAds() {
			uni.request({
				url: `${getApp().globalData.baseUrl}/ads`,
				method: 'GET',
				success: (res) => {
					res.data?.data.ads?.map((it) => {
						this.ads.push({
							img: it.image_url,
							link: it.link_url
						});
					});
				}
			});
		},
		loadCars(done) {
			if (this.loading) return;
			this.loading = true;
			const url = `${getApp().globalData.baseUrl}/cars?page_num=${this.page}&page_size=${this.pageSize}`;
			uni.request({
				url,
				method: 'GET',
				success: (res) => {
					if (!res?.data) {
						uni.showToast({ title: '服务器返回异常', icon: 'none' });
						return;
					}
					const body = res.data;
					if (body.code !== 0) {
						uni.showToast({ title: body.msg || '加载失败', icon: 'none' });
						return;
					}

					const cars = body.data?.cars || [];
					const mapped = cars.map((c) => {
						let img = `${getApp().globalData.baseImgUrl}/` + c.thumbnail;
						if (!img && Array.isArray(c.gallery) && c.gallery.length > 0) {
							img = c.gallery[0].url;
						}
						return {
							id: c.id,
							name: c.name,
							summary: c.summary,
							imgUrl: img,
							tag: c.legend
						};
					});

					if (this.page === 1) this.cars = mapped;
					else this.cars = [...this.cars, ...mapped];

					if (mapped.length < this.pageSize) this.noMore = true;
				},
				fail: (err) => {
					console.error('请求失败', err);
					uni.showToast({ title: '网络请求失败', icon: 'none' });
				},
				complete: () => {
					this.loading = false;
					done && done();
				}
			});
		},
		goDetail(car) {
			uni.navigateTo({ url: `/pages/detail/detail?id=${car.id}` });
		},
		goAd(ad) {
			const link = ad.link;
			if (!link.startsWith('http')) {
				// 车辆 objectId
				uni.navigateTo({ url: `/pages/detail/detail?id=${link}` });
			} else {
				// 预留扩展点
			}
		}
	}
};
</script>
<style scoped>
.page {
	height: 100vh;
	padding: 26rpx;
	background-color: #f6f7fb;
	box-sizing: border-box;
}

/* 顶部广告轮播 */
.ad-swiper {
	height: 320rpx;
	border-radius: 20rpx;
	overflow: hidden;
	margin-bottom: 40rpx;
	box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
}
.ad-img {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

/* 分区标题 */
.section-header {
	margin: 0 10rpx 24rpx 10rpx;
	display: flex;
	align-items: center;
}

/* 左侧竖条渐变 */
.section-title::before {
	content: '';
	display: inline-block;
	width: 8rpx;
	height: 30rpx;
	border-radius: 4rpx;
	margin-right: 12rpx;
	background: linear-gradient(180deg, #ff9900, #ff6600); /* 上浅下深橙色渐变 */
}

/* 文字渐变 */
.section-title {
	font-size: 30rpx;
	font-weight: 600;
	background: linear-gradient(90deg, #ff9900, #ff6600); /* 左浅右深橙色渐变 */
	-webkit-background-clip: text;
	-webkit-text-fill-color: transparent;
}

/* 单个车辆卡片 */
.car-card {
	display: flex;
	flex-direction: row;
	background: #fff;
	margin-bottom: 24rpx;
	border-radius: 16rpx;
	overflow: hidden;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
	transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.car-card:active {
	transform: scale(0.98);
	box-shadow: 0 1rpx 5rpx rgba(0, 0, 0, 0.08);
}

/* 图片容器 */
.car-img-wrapper {
	position: relative;
	width: 260rpx;
	height: 190rpx;
	flex-shrink: 0;
}
.car-img {
	width: 100%;
	height: 100%;
	object-fit: cover;
	border-top-left-radius: 16rpx;
	border-bottom-left-radius: 16rpx;
}

/* 🔹 角标 */
.car-tag {
	position: absolute;
	top: 10rpx;
	left: 10rpx;
	padding: 4rpx 14rpx;
	border-radius: 10rpx;
	font-size: 22rpx;
	font-weight: 600;
	color: #fff;
	text-shadow: 0 1rpx 3rpx rgba(0, 0, 0, 0.2);
	backdrop-filter: blur(3rpx);
}
.tag-New {
	background: linear-gradient(120deg, #36d1dc, #5b86e5);
}
.tag-Hot {
	background: linear-gradient(120deg, #ff512f, #f09819);
}
.tag-Sale {
	background: linear-gradient(120deg, #f7971e, #ffd200);
	color: #222;
}

/* 信息区 */
.car-info {
	flex: 1;
	padding: 20rpx 24rpx;
	display: flex;
	flex-direction: column;
	justify-content: center;
}
.car-name {
	font-size: 30rpx;
	font-weight: 600;
	color: #222;
	margin-bottom: 8rpx;
}
.car-desc {
	color: #777;
	font-size: 26rpx;
	line-height: 1.4;
}

/* 状态 */
.loading,
.no-more {
	text-align: center;
	color: #999;
	font-size: 26rpx;
	padding: 30rpx 0;
}
</style>
