<template>
	<view class="page">
		<view class="search-bar">
			<input v-model="searchVin" class="search-input" :placeholder="$t('order.searchVinLast4')" maxlength="4" @input="onSearchInput" />
			<text v-if="searchVin" class="search-clear" @click="clearSearch">{{ $t('common.clear') }}</text>
		</view>
		<scroll-view class="list" scroll-y :lower-threshold="100" @scrolltolower="onReachBottom" @scrolltoupper="onScrollTop">
			<block v-if="orders.length">
				<view v-for="order in orders" :key="order.id" class="order-item">
					<view class="order-top">
						<view class="order-meta">
							<!-- <text class="order-no">{{ $t('order.orderNo') }}：{{ order.orderNo }}</text>-->
							<text class="order-time">{{ $t('order.vin') }}：{{ order.vin }}</text>
						</view>
						<view class="order-tags">
							<text v-for="(tag, i) in splitTags(order.tags)" :key="i" class="tag">{{ tag }}</text>
						</view>
					</view>

					<view class="order-body" @click.stop="openOrder(order)">
						<image class="order-thumb" :src="order.thumb" mode="aspectFill" />
						<view class="order-info">
							<view class="car-row">
								<text class="car-name">{{ order.title }}</text>
								<!-- <text class="car-sub">{{ $t('order.quantity') }}：{{ order.quantity }}</text> -->
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
			<view v-else class="empty">{{ $t('order.empty') }}</view>
			<view class="loading" v-if="loading">{{ $t('common.loading') }}</view>
			<view class="no-more" v-if="noMore">{{ $t('common.noMore') }}</view>
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
			searchVin: '',
			searchTimer: null,
			loading: false,
			noMore: false,
			progressSteps: [this.$t('order.steps.1'), this.$t('order.steps.2'), this.$t('order.steps.3'), this.$t('order.steps.4')]
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
		onSearchInput(e) {
			this.searchVin = (e.detail && e.detail.value) || '';
			if (this.searchTimer) clearTimeout(this.searchTimer);
			this.searchTimer = setTimeout(() => {
				this.page = 1;
				this.noMore = false;
				this.orders = [];
				this.loadOrders(true);
			}, 300);
		},
		clearSearch() {
			this.searchVin = '';
			if (this.searchTimer) clearTimeout(this.searchTimer);
			this.page = 1;
			this.noMore = false;
			this.orders = [];
			this.loadOrders(true);
		},
		splitTags(tags) {
			if (!tags) return [];
			if (Array.isArray(tags)) return tags;
			return tags
				.split(/[,;，；]/)
				.map((t) => t.trim())
				.filter(Boolean);
		},
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
			const keyword = (this.searchVin || '').trim();
			const keywordParam = keyword ? '&keyword=' + encodeURIComponent(keyword) : '';
			request({
				url: '/orders?page_size=' + this.pageSize + '&page_num=' + this.page + keywordParam
			})
				.then((res) => {
					// 兼容各种后端返回情况
					if (!res) {
						uni.showToast({
							title: this.$t('common.serverError'),
							icon: 'none'
						});
						return;
					}
					if (res.code !== 0) {
						uni.showToast({
							title: res.msg || this.$t('common.loadFail'),
							icon: 'none'
						});
						return;
					}
					const newOrders =
						res.data?.orders?.map((order) => ({
							id: order.id,
							vin: order.vin,
							orderNo: order.tradeNo,
							createdAt: this.formatter(order.createdAt),
							total: 0,
							thumb: `${getApp().globalData.baseImgUrl}/${order.car.thumbnail}`,
							title: order.car.summary,
							quantity: 1,
							tags: order.tags,
							status: order.status
						})) || [];
					this.orders = isRefresh ? newOrders : [...this.orders, ...newOrders];

					this.loading = false;
					uni.stopPullDownRefresh();
				})
				.finally(() => {
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
					return this.$t('order.status.1');
				case 2:
					return this.$t('order.status.2');
				case 3:
					return this.$t('order.status.3');
				case 4:
					return this.$t('order.status.4');
				case 5:
					return this.$t('order.status.5');
				case 6:
					return this.$t('order.status.6');
				case 7:
					return this.$t('order.status.7');
				case 8:
					return this.$t('order.status.8');
				case 9:
					return this.$t('order.status.9');
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
	display: flex;
	flex-direction: column;
}

.search-bar {
	display: flex;
	align-items: center;
	gap: 16rpx;
	padding: 20rpx;
	background: #f5f6f8;
}

.search-input {
	flex: 1;
	background: #fff;
	border: 1rpx solid #eee;
	border-radius: 12rpx;
	padding: 18rpx 20rpx;
	font-size: 26rpx;
	color: #333;
}

.search-clear {
	font-size: 24rpx;
	color: #ff6b00;
}

.list {
	flex: 1;
	min-height: 0;
}

/* 单条订单卡片 */
.order-item {
	background: #fff;
	margin: 20rpx;
	border-radius: 16rpx;
	padding: 20rpx;
	box-shadow: 0 4rpx 10rpx rgba(0, 0, 0, 0.05);
	display: flex;
	flex-direction: column;
	gap: 12rpx;
}

/* 顶部区域 */
.order-top {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	flex-wrap: wrap;
	gap: 8rpx 12rpx;
}

.order-meta {
	flex: 1;
	min-width: 60%;
	word-break: break-word;
}

.order-no {
	font-size: 26rpx;
	color: #333;
	word-break: break-all;
}

.order-time {
	font-size: 22rpx;
	color: #888;
	margin-top: 4rpx;
	display: block;
	word-break: break-all;
}

/* 标签区 */
.order-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 6rpx;
	max-width: 100%;
}

.tag {
	background: #fff5e6;
	color: #ff6b00;
	padding: 4rpx 12rpx;
	font-size: 22rpx;
	border-radius: 8rpx;
	line-height: 1.5;
	white-space: normal;
	word-break: break-word;
}

/* 主体 */
.order-body {
	display: flex;
	flex-wrap: wrap;
	gap: 12rpx;
	margin-top: 8rpx;
}

.order-thumb {
	width: 220rpx;
	height: 140rpx;
	border-radius: 10rpx;
	object-fit: cover;
	flex-shrink: 0;
}

.order-info {
	flex: 1;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	min-width: 0;
}

/* 标题与数量 */
.car-row {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	flex-wrap: wrap;
	gap: 4rpx 10rpx;
}

.car-name {
	font-size: 30rpx;
	color: #222;
	font-weight: 600;
	word-break: break-word;
}

.car-sub {
	font-size: 24rpx;
	color: #777;
}

/* 进度区域 */
.progress-wrap {
	margin-top: 14rpx;
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.progress-legend {
	display: flex;
	flex-wrap: wrap;
	align-items: center;
	gap: 8rpx 12rpx;
}

.legend-item {
	display: flex;
	align-items: center;
	gap: 6rpx;
	flex-shrink: 0;
}

.legend-dot {
	width: 14rpx;
	height: 14rpx;
	border-radius: 7rpx;
	background-color: #ccc;
}

.legend-text {
	font-size: 22rpx;
	color: #666;
	word-break: break-word;
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
	transition: width 0.5s ease;
}

.status-text {
	font-size: 22rpx;
	color: #ff6b00;
	font-weight: 500;
	word-break: break-word;
	margin-top: 4rpx;
}

/* 空/加载/无更多 */
.empty,
.loading,
.no-more {
	text-align: center;
	color: #888;
	padding: 40rpx 0;
	font-size: 26rpx;
}

/* 国际化文本溢出时的安全处理 */
text {
	word-break: break-word;
	white-space: normal;
}
</style>
