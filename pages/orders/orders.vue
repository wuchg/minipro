<template>
	<view class="page">
		<!--    <view class="header">
      <text class="header-title">我的订单</text>
    </view> -->
		<scroll-view class="list" scroll-y :lower-threshold="100" @scrolltolower="onReachBottom"
			@scrolltoupper="onScrollTop">
			<block v-if="orders.length">
				<view class="order-item" v-for="order in orders" :key="order.id" @click="openOrder(order)">
					<view class="order-top">
						<view>
							<text class="order-no">订单号：{{ order.orderNo }}</text>
							<text class="order-time">下单时间：{{ order.createdAt }}</text>
						</view>
						<view class="order-price">¥{{ formatPrice(order.total) }}</view>
					</view>

					<view class="order-body">
						<image class="order-thumb" :src="order.thumb" mode="aspectFill" />
						<view class="order-info">
							<view class="car-row">
								<text class="car-name">{{ order.title }}</text>
								<text class="car-sub">数量：{{ order.quantity }}</text>
							</view>
							<!-- 进度显示 -->
							<view class="progress-wrap">
								<view class="progress-legend">
									<view v-for="(step, idx) in progressSteps" :key="idx" class="legend-item">
										<view class="legend-dot"
											:style="{ backgroundColor: orderProgressColor(order.status, idx) }"></view>
										<text class="legend-text">{{ step }}</text>
									</view>
								</view>

								<view class="progress-bar">
									<view class="progress-fill" :style="{ width: progressPercent(order.status) + '%' }">
									</view>
								</view>

								<text class="status-text">{{ statusText(order.status) }}</text>
							</view>
						</view>
					</view>
				</view>
			</block>

			<view v-else class="empty">暂无订单，快去下单吧</view>

			<view class="loading" v-if="loading">加载中...</view>
			<view class="no-more" v-if="noMore">没有更多了</view>
		</scroll-view>
	</view>
</template>

<script>
import { checkLogin } from '@/common/auth.js'
	export default {
		data() {
			return {
				page: 1,
				pageSize: 10,
				orders: [],
				loading: false,
				noMore: false,
				progressSteps: ['已下单', '已发货', '运输中', '已签收']
			}
		},
		onLoad() {
			 const currentPage = '/pages/orders/orders'
			if (!checkLogin(currentPage)) return
			this.loadOrders(true)
		},
		onPullDownRefresh() {
			// 下拉刷新重置
			this.page = 1
			this.noMore = false
			this.loadOrders(true)
		},
		methods: {
			formatPrice(v) {
				return (v / 100).toFixed(2)
			},
			// 模拟请求订单数据
			loadOrders(isRefresh = false) {
				if (this.loading) return
				this.loading = true
				const url = `${BASE}/orders?page_size=1&page_num=1`
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
						const order = body.data?.orders?.[0]
						const id = order.id
						this.orders.push({
							id: 'ORD' + order.id,
							orderNo: 'SN' + String(100000 + id),
							createdAt: order.createdAt,
							total: (150000 + (id * 1000)), // 分
							thumb: `/static/cars/${order.car.thumbnail}`,
							title: order.car.name,
							quantity: 1,
							status: order.status
						})
					},
					fail: (err) => {

					},
					complete: () => {
						this.loading = false
					}
				})

				// if (isRefresh) {
				// 	this.orders = items
				// } else {
				// 	this.orders = [...this.orders, ...items]
				// }


			},
			// reach bottom handler
			onReachBottom() {
				if (this.loading || this.noMore) return
				this.page++
				this.loadOrders(false)
			},
			onScrollTop() {
				// placeholder if needed
			},
			openOrder(order) {
				uni.navigateTo({
					url: `/pages/orderDetail/orderDetail?orderNo=${order.orderNo}`
				})
			},
			// helpers
			statusText(status) {
				switch (status) {
					case 0:
						return '已下单，等待发货'
					case 1:
						return '已发货，等待运输'
					case 2:
						return '运输中'
					case 3:
						return '已签收'
					case 4:
						return '已取消'
					default:
						return '未知状态'
				}
			},
			progressPercent(status) {
				// 0 => 10, 1 => 40, 2 => 70, 3 => 100, 4 => 0
				switch (status) {
					case 0:
						return 10
					case 1:
						return 40
					case 2:
						return 70
					case 3:
						return 100
					case 4:
						return 0
					default:
						return 0
				}
			},
			orderProgressColor(status, stepIdx) {
				if (status === 4) return '#B0B0B0' // 取消灰
				// stepIdx 0..3, color filled for steps <= current floor
				const percent = this.progressPercent(status)
				const stepPercent = (stepIdx + 1) * 25
				return stepPercent <= percent ? '#FF6B00' : '#EDEDED'
			},
		}
	}
</script>

<style>
	.page {
		background: #f5f6f8;
		height: 100vh;
	}

	.header {
		padding: 24rpx;
		background: #fff;
		border-bottom: 1rpx solid #eee;
	}

	.header-title {
		font-size: 34rpx;
		font-weight: bold;
	}

	.list {
		flex: 1;
		height: calc(100vh - 88rpx);
	}

	.order-item {
		background: #fff;
		margin: 18rpx 20rpx;
		border-radius: 12rpx;
		padding: 18rpx;
		box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
	}

	.order-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 12rpx;
	}

	.order-no {
		font-size: 26rpx;
		color: #333;
	}

	.order-time {
		font-size: 22rpx;
		color: #999;
		margin-top: 6rpx;
		display: block;
	}

	.order-price {
		font-size: 30rpx;
		color: #FF6B00;
		font-weight: bold;
	}

	.order-body {
		display: flex;
		margin-top: 8rpx;
	}

	.order-thumb {
		width: 220rpx;
		height: 140rpx;
		border-radius: 8rpx;
		margin-right: 18rpx;
		flex-shrink: 0;
	}

	.order-info {
		flex: 1;
	}

	.car-row {
		display: flex;
		justify-content: space-between;
		/* 左右分布 */
		align-items: center;
	}

	.car-name {
		font-size: 30rpx;
		color: #222;
		font-weight: 600;
	}

	.car-sub {
		font-size: 24rpx;
		color: #777;
		margin-left: 20rpx;
		/* 和标题拉开点间距 */
	}


	/* 进度区域 */
	.progress-wrap {
		margin-top: 12rpx;
	}

	.progress-legend {
		display: flex;
		align-items: center;
		margin-bottom: 8rpx;
	}

	.legend-item {
		display: flex;
		align-items: center;
		margin-right: 12rpx;
	}

	.legend-dot {
		width: 14rpx;
		height: 14rpx;
		border-radius: 7rpx;
		margin-right: 6rpx;
	}

	.legend-text {
		font-size: 22rpx;
		color: #666;
	}

	/* 进度条 */
	.progress-bar {
		width: 100%;
		height: 10rpx;
		background: #eee;
		border-radius: 10rpx;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #FF8A00, #FF6B00);
		width: 0%;
		transition: width 0.5s;
	}

	.status-text {
		margin-top: 8rpx;
		font-size: 22rpx;
		color: #FF6B00;
	}

	/* empty / loading */
	.empty,
	.loading,
	.no-more {
		text-align: center;
		color: #888;
		padding: 30rpx 0;
		font-size: 26rpx;
	}
</style>