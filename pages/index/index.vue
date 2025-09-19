<template>
	<view class="page">
		<view class="item" v-for="car in cars" :key="car.id" @click="goDetail(car)">
			<image class="car-img" :src="car.imgUrl" mode="aspectFill"></image>
			<view class="car-info">
				<view class="car-name">{{ car.name }}</view>
				<view class="car-desc">{{ car.summary }}</view>
			</view>
		</view>

		<view class="loading" v-if="loading">加载中...</view>
		<view class="no-more" v-if="noMore">没有更多了</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				page: 1,
				pageSize: 10,
				cars: [],
				loading: false,
				noMore: false
			}
		},
		onLoad() {
			this.loadCars()
		},
		onReachBottom() {
			if (!this.loading && !this.noMore) {
				this.page++
				this.loadCars()
			}
		},
		methods: {
			loadCars() {
				if (this.loading) return
				this.loading = true
				const url = `${getApp().globalData.baseUrl}/cars?page_num=${this.page}&page_size=${this.pageSize}`
				uni.request({
					url: url,
					method: 'GET',
					success: (res) => {
						// 兼容各种后端返回情况
						if (!res || !res.data) {
							uni.showToast({
								title: '服务器返回异常',
								icon: 'none'
							})
							return
						}
						const body = res.data
						if (body.code !== 0) {
							uni.showToast({
								title: body.msg || '加载失败',
								icon: 'none'
							})
							return
						}

						const cars = (body.data && body.data.cars) ? body.data.cars : []
							const mapped = cars.map((c) => {
								let img = '/static/cars/'+c.thumbnail
								if (!img && Array.isArray(c.gallery) && c.gallery.length > 0) {
									img = c.gallery[0].url
								}
								return {
									id: c.id,
									name: c.name,
									summary: c.summary,
									imgUrl: img 
								}
							});
						if (this.page === 1) {
							this.cars = mapped
						} else {
							this.cars = [...this.cars, ...mapped]
						}

						if (mapped.length < this.pageSize) {
							this.noMore = true
						}

					},
					fail: (err) => {
						console.error('请求失败', err)
						uni.showToast({
							title: '网络请求失败',
							icon: 'none'
						})
					},
					complete: () => {
						this.loading = false
					}
				})
			},
			goDetail(car) {
				uni.navigateTo({
					url: `/pages/detail/detail?id=${car.id}`
				})
			}
		}
	}
</script>

<style>
	.page {
		padding: 20rpx;
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