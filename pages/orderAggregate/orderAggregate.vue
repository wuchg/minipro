<template>
	<view class="page">
		<view class="header">
			<text class="title">{{ $t('order.aggregateTitle') }}</text>
			<button class="export-btn" type="primary" size="mini" :loading="exporting" @click="downloadExcel">{{ $t('order.exportExcel') }}</button>
		</view>

		<view class="table">
			<scroll-view class="table-scroll" scroll-y scroll-x :lower-threshold="80" @scrolltolower="onReachBottom">
				<view class="table-inner">
					<view class="table-header">
						<text class="col index">No.</text>
						<text class="col vin">VIN</text>
						<text class="col color">{{ $t('order.color') }}</text>
						<text class="col car">{{ $t('order.model') }}</text>
						<!-- <text class="col status">状态</text> -->
						<!-- <text class="col price">价格</text> -->
						<text class="col remark">{{ $t('order.remark') }}</text>
					</view>
					<block v-if="orders.length">
						<view class="row" v-for="(order, idx) in orders" :key="order.id">
							<text class="col index">{{ idx + 1 }}</text>
							<text class="col vin">{{ displayVin(order.vin) }}</text>
							<view class="col color">
								<view v-if="displayColor(order)" class="car-color" :style="{ backgroundColor: displayColor(order) }"></view>
								<text v-else>-</text>
							</view>
							<view class="col car">
								<text class="car-text">{{ displayCarName(order.carName) }}</text>
							</view>
							<!-- <text class="col status">{{ statusText(order.status) }}</text> -->
							<!-- <text class="col price">{{ formatPrice(order.price) }}</text> -->
							<text class="col remark">{{ order.remark || '-' }}</text>
						</view>
					</block>
					<view v-else class="empty">暂无未完成订单</view>
					<view class="loading" v-if="loading">加载中...</view>
					<view class="no-more" v-if="noMore">没有更多了</view>
				</view>
			</scroll-view>
			<view class="scroll-fade"></view>
		</view>
	</view>
</template>

<script>
import { request } from '@/common/request.js';

const LIST_URL = '/orders';
const EXPORT_URL = '/orders/export';
const UNFINISHED_STATUS = 'unfinished';

export default {
	data() {
		return {
			page: 1,
			pageSize: 20,
			orders: [],
			loading: false,
			noMore: false,
			exporting: false,
			colorMap: {}
		};
	},
	onLoad() {
		this.loadOrders(true);
		this.loadColorDicts();
	},
	methods: {
		async loadColorDicts() {
			try {
				const res = await request({ url: '/car-color-dicts' });
				if (res.code === 0 && Array.isArray(res.data?.colors)) {
					const map = {};
					res.data.colors.forEach((item) => {
						if (item?.code && item?.hex) {
							map[String(item.code).toUpperCase()] = String(item.hex);
						}
					});
					this.colorMap = map;
				}
			} catch (e) {
				// ignore, fallback to empty map
			}
		},
		displayVin(vin) {
			if (!vin) return '-';
			const text = String(vin).trim();
			return text.length <= 4 ? text : text.slice(-4);
		},
		displayCarName(name) {
			if (!name) return '-';
			const text = String(name).trim();
			const parts = text.split(/\s+/);
			if (parts.length <= 1) return text;
			return parts.slice(1).join(' ');
		},
		displayColor(order) {
			const extra = order?.extraNotes || order?.extra_notes || {};
			const value = extra?.car_color;
			if (!value) return '';
			const code = String(value).trim().toUpperCase();
			return this.colorMap[code] || '';
		},
		loadOrders(isRefresh = false) {
			if (this.loading || this.noMore) return;
			this.loading = true;
			const statusParam = UNFINISHED_STATUS ? `&status=${encodeURIComponent(UNFINISHED_STATUS)}` : '';
			request({
				url: `${LIST_URL}?page_size=${this.pageSize}&page_num=${this.page}${statusParam}`
			})
				.then((res) => {
					if (res.code !== 0) {
						uni.showToast({ title: res.msg || '加载失败', icon: 'none' });
						return;
					}
					const list = res.data?.orders || [];
					const newOrders = list.map((order) => ({
						id: order.id,
						vin: order.vin,
						carName: order.car?.summary || '',
						status: order.status,
						remark: order.remarks || '',
						extraNotes: order.extraNotes || null
					}));
					this.orders = isRefresh ? newOrders : [...this.orders, ...newOrders];
					if (newOrders.length < this.pageSize) this.noMore = true;
				})
				.finally(() => {
					this.loading = false;
				});
		},
		onReachBottom() {
			if (this.loading || this.noMore) return;
			this.page += 1;
			this.loadOrders(false);
		},
		downloadExcel() {
			if (this.exporting) return;
			this.exporting = true;
			const token = uni.getStorageSync('access_token') || '';
			const acceptLanguage = uni.getStorageSync('language') || 'system';
			const params = [];
			params.push(`page_num=1`);
			params.push(`page_size=500`);
			if (UNFINISHED_STATUS) {
				params.push(`status=${encodeURIComponent(UNFINISHED_STATUS)}`);
			}
			const query = params.length ? `?${params.join('&')}` : '';
			const url = `${getApp().globalData.baseUrl}${EXPORT_URL}${query}`;
			uni.showLoading({ title: '下载中...', mask: true });
			// #ifdef MP-WEIXIN
			wx.request({
				url,
				method: 'GET',
				header: {
					Authorization: token ? `Bearer ${token}` : '',
					'Accept-Language': acceptLanguage
				},
				responseType: 'arraybuffer',
				success: (res) => {
					if (res.statusCode !== 200 || !res.data) {
						uni.showToast({ title: '下载失败', icon: 'none' });
						return;
					}
					const filePath = `${wx.env.USER_DATA_PATH}/order-aggregate-${Date.now()}.xlsx`;
					const fs = wx.getFileSystemManager();
					fs.writeFile({
						filePath,
						data: res.data,
						encoding: 'binary',
						success: () => {
							uni.openDocument({
								filePath,
								fileType: 'xlsx',
								showMenu: true,
								fail: () => {
									uni.showToast({ title: '打开失败', icon: 'none' });
								}
							});
						},
						fail: () => {
							uni.showToast({ title: '保存失败', icon: 'none' });
						}
					});
				},
				fail: () => {
					uni.showToast({ title: '下载失败', icon: 'none' });
				},
				complete: () => {
					this.exporting = false;
					uni.hideLoading();
				}
			});
			// #endif

			// #ifndef MP-WEIXIN
			uni.downloadFile({
				url,
				header: {
					Authorization: token ? `Bearer ${token}` : '',
					'Accept-Language': acceptLanguage
				},
				success: (res) => {
					if (res.statusCode !== 200) {
						uni.showToast({ title: '下载失败', icon: 'none' });
						return;
					}
					const filePath = res.filePath || res.tempFilePath;
					if (!filePath) {
						uni.showToast({ title: '下载失败', icon: 'none' });
						return;
					}
					uni.openDocument({
						filePath,
						fileType: 'xlsx',
						showMenu: true,
						fail: () => {
							uni.showToast({ title: '打开失败', icon: 'none' });
						}
					});
				},
				fail: () => {
					uni.showToast({ title: '下载失败', icon: 'none' });
				},
				complete: () => {
					this.exporting = false;
					uni.hideLoading();
				}
			});
			// #endif
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
	padding: 20rpx;
}

.header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12rpx;
	margin-bottom: 16rpx;
}

.title {
	font-size: 32rpx;
	font-weight: 600;
	color: #222;
	flex: 1;
}

.export-btn {
	background: linear-gradient(90deg, #ff8a00, #ff6b00);
	border: none;
	margin-left: 0;
}

.table {
	background: #fff;
	border-radius: 16rpx;
	overflow: hidden;
	flex: 1;
	display: flex;
	flex-direction: column;
	width: 100%;
	position: relative;
}

.table-scroll {
	flex: 1;
	min-height: 0;
	width: 100%;
}

.table-inner {
	display: inline-flex;
	flex-direction: column;
	width: max-content;
	min-width: 100%;
}

.table-header {
	display: flex;
	padding: 20rpx;
	background: #fff7eb;
	border-bottom: 1rpx solid #f0f0f0;
	position: sticky;
	top: 0;
	z-index: 2;
}

.table-body {
	flex: 1;
	min-height: 0;
}

.row {
	display: flex;
	padding: 20rpx;
	border-bottom: 1rpx solid #f0f0f0;
}

.row:nth-child(even) {
	background: #fafafa;
}

.col {
	font-size: 24rpx;
	color: #333;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.index {
	width: 80rpx;
}

.vin {
	width: 140rpx;
}

.car {
	width: 320rpx;
	display: flex;
	align-items: center;
	gap: 8rpx;
}

.color {
	width: 120rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.car-color {
	width: 20rpx;
	height: 20rpx;
	border-radius: 50%;
	border: 2rpx solid #ffffff;
	box-shadow: 0 0 0 1rpx rgba(0, 0, 0, 0.15), 0 2rpx 6rpx rgba(0, 0, 0, 0.15);
	flex-shrink: 0;
}

.car-text {
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.status {
	width: 220rpx;
}

.price {
	width: 160rpx;
	text-align: right;
}

.remark {
	width: max-content;
	min-width: 200rpx;
	text-align: right;
	color: #666;
	white-space: nowrap;
	overflow: visible;
	text-overflow: clip;
}

.scroll-fade {
	position: absolute;
	top: 0;
	right: 0;
	bottom: 0;
	width: 40rpx;
	pointer-events: none;
	background: linear-gradient(90deg, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.95));
}

.empty,
.loading,
.no-more {
	text-align: center;
	color: #888;
	padding: 24rpx 0;
	font-size: 26rpx;
}
</style>
