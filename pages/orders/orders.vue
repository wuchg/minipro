<template>
	<view class="page">
		<!--    <view class="header">
      <text class="header-title">我的订单</text>
    </view> -->
		<scroll-view class="list" scroll-y :lower-threshold="100" @scrolltolower="onReachBottom" @scrolltoupper="onScrollTop">
			<block v-if="orders.length">
				<view class="order-item" v-for="order in orders" :key="order.id" @click="openOrder(order)">
					<view class="order-top">
						<view>
							<text class="order-no">订单号：{{ order.orderNo }}</text>
							<text class="order-time">VIN：{{ order.vin }}</text>
						</view>
						<view class="order-price">定制款</view>
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
										<view class="legend-dot" :style="{ backgroundColor: orderProgressColor(order.status, idx) }"></view>
										<text class="legend-text">{{ step }}</text>
									</view>
								</view>

								<view class="progress-bar">
									<view class="progress-fill" :style="{ width: progressPercent(order.status) + '%' }"></view>
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
import { checkLogin } from '@/common/auth.js';
import { request } from '@/common/request.js';
export default {
	data() {
		return {
			page: 1,
			pageSize: 10,
			orders: [],
			loading: false,
			noMore: false,
			progressSteps: ['已下单', '已打款', '已发出', '已接车']
		};
	},
	onLoad() {
		const currentPage = '/pages/orders/orders';
		if (!checkLogin(currentPage)) return;
		this.loadOrders(true);
	},
	onPullDownRefresh() {
		this.page = 1;
		this.noMore = false;
		this.orders = [];
		this.loadOrders(true);
	},
	methods: {
		formatPrice(v) {
			return (v / 100).toFixed(2);
		},
		formatter(utcString) {
			if (!utcString) return '';

			// 把 " UTC" 改成 "Z" 以符合 ISO 标准
			let s = utcString
				.trim()
				.replace(' UTC', 'Z') // " UTC" → "Z"
				.replace(' +0000Z', 'Z') // 防止重复时区符号
				.replace(' +0000', 'Z') // "+0000" → "Z"
				.replace('Z', 'Z') // 确保末尾是 Z
				.replace(' ', 'T'); // 空格改 T（ISO要求）

			// 去掉毫秒部分（iOS 旧版对带毫秒也容易解析错误）
			s = s.replace(/\.\d+/, '');
			const date = new Date(s);
			if (isNaN(date.getTime())) return utcString; // 无法解析时返回原字符串

			// 获取本地时间偏移（分钟转小时）
			const tzOffsetMin = -date.getTimezoneOffset();
			const tzSign = tzOffsetMin >= 0 ? '+' : '-';
			const tzHour = String(Math.floor(Math.abs(tzOffsetMin) / 60)).padStart(2, '0');
			const tzMin = String(Math.abs(tzOffsetMin) % 60).padStart(2, '0');
			const tz = `UTC${tzSign}${tzHour}:${tzMin}`;

			// 拼出 yyyy-mm-dd hh:mm:ss
			const yyyy = date.getFullYear();
			const mm = String(date.getMonth() + 1).padStart(2, '0');
			const dd = String(date.getDate()).padStart(2, '0');
			const hh = String(date.getHours()).padStart(2, '0');
			const mi = String(date.getMinutes()).padStart(2, '0');
			const ss = String(date.getSeconds()).padStart(2, '0');

			return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss} ${tz}`;
		},
		loadOrders(isRefresh = false) {
			if (this.loading) return;
			this.loading = true;
			request({
				url: '/orders?page_size=' + this.pageSize + '&page_num=' + this.page
			}).then((res) => {
				// 兼容各种后端返回情况
				if (!res) {
					uni.showToast({
						title: '服务器返回异常',
						icon: 'none'
					});
					return;
				}
				if (res.code !== 0) {
					uni.showToast({
						title: res.msg || '加载失败',
						icon: 'none'
					});
					return;
				}
				res.data?.orders?.map((order) => {
					this.orders.push({
						id: order.id,
						vin: order.vin,
						orderNo: order.tradeNo,
						createdAt: this.formatter(order.createdAt),
						total: 0, // 分
						thumb: `https://img.autoboss.cloud/${order.car.thumbnail}`,
						title: order.car.summary,
						quantity: 1,
						status: order.status
					});
				});
				this.loading = false;
				uni.stopPullDownRefresh();
			});
			// complete: () => {
			// 	this.loading = false;
			// 	uni.stopPullDownRefresh();
			// }
			// if (isRefresh) {
			// 	this.orders = items
			// } else {
			// 	this.orders = [...this.orders, ...items]
			// }
		},
		// reach bottom handler
		onReachBottom() {
			if (this.loading || this.noMore) return;
			this.page++;
			this.loadOrders(false);
		},
		onScrollTop() {
			// placeholder if needed
		},
		openOrder(order) {
			uni.navigateTo({
				url: `/pages/orderDetail/orderDetail?orderId=${order.id}`
			});
		},
		// helpers
		statusText(status) {
			switch (status) {
				case 1:
					return '已下单';
				case 2:
					return '待上传车辆影像';
				case 3:
					return '待上传电子合同';
				case 4:
					return '打款确认中';
				case 5:
					return '打款回单';
				case 6:
					return '报关文件';
				case 7:
					return '加装项目';
				case 8:
					return '物流发运';
				case 9:
					return '收车确认';
				default:
					return '';
			}
		},
		progressPercent(status) {
			// 0 => 10, 1 => 40, 2 => 70, 3 => 100, 4 => 0
			switch (status) {
				case 1:
					return 10;
				case 2:
					return 20;
				case 3:
					return 30;
				case 4:
					return 40;
				case 5:
					return 50;
				case 6:
					return 60;
				case 7:
					return 70;
				case 8:
					return 80;
				case 9:
					return 100;
				default:
					return '';
			}
		},
		orderProgressColor(status, stepIdx) {
			if (status === 4) return '#B0B0B0'; // 取消灰
			// stepIdx 0..3, color filled for steps <= current floor
			const percent = this.progressPercent(status);
			const stepPercent = (stepIdx + 1) * 25;
			return stepPercent <= percent ? '#FF6B00' : '#EDEDED';
		}
	}
};
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
	font-size: 26rpx;
	color: #ff6b00;
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
	background: linear-gradient(90deg, #ff8a00, #ff6b00);
	width: 0%;
	transition: width 0.5s;
}

.status-text {
	margin-top: 8rpx;
	font-size: 22rpx;
	color: #ff6b00;
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
