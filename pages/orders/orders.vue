<template>
	<view class="page">
		<view class="search-bar">
			<view :class="['status-trigger', statusFilter !== '' ? 'status-trigger-on' : '']" @click="toggleStatusPanel">
				<text class="status-trigger-text">{{ statusOptions[statusIndex].label }}</text>
				<text :class="['status-trigger-arrow', statusPanelOpen ? 'open' : '']">⌄</text>
			</view>
			<input v-model="searchVin" class="search-input" :placeholder="$t('order.searchVinLast4')" maxlength="4" @input="onSearchInput" />
			<text v-if="searchVin" class="search-clear" @click="clearSearch">{{ $t('common.clear') }}</text>
		</view>

		<!-- 状态筛选展开面板 -->
		<view v-if="statusPanelOpen" class="status-mask" @click="closeStatusPanel"></view>
		<view v-if="statusPanelOpen" class="status-panel">
			<view
				v-for="opt in statusOptions"
				:key="opt.value"
				:class="['status-chip', opt.value === statusFilter ? 'status-chip-active' : '']"
				@click="selectStatus(opt)"
			>
				{{ opt.label }}
			</view>
		</view>

		<scroll-view
			class="list"
			scroll-y
			:lower-threshold="120"
			refresher-enabled
			:refresher-triggered="refreshing"
			@refresherrefresh="onRefresh"
			@scrolltolower="onReachBottom"
		>
			<view class="order-sheet">
				<block v-if="orders.length">
					<view v-for="order in orders" :key="order.id" class="order-group">
						<!-- 列表行（无车辆图片） -->
						<view :class="['order-row', expandedId === order.id ? 'order-row-open' : '']" hover-class="order-row-active" @click="toggleOrder(order)">
							<view class="row-accent"></view>
							<view class="row-main">
								<view class="row-title-line">
									<text class="row-title">{{ order.title || '-' }}</text>
									<text class="status-badge">{{ statusText(order.status) }}</text>
								</view>
								<view class="row-sub">
									<text class="row-vin">{{ $t('order.vin') }}: {{ order.vin || '-' }}</text>
									<text class="row-time">{{ order.createdAt }}</text>
								</view>
							</view>
							<text :class="['row-chevron', expandedId === order.id ? 'row-chevron-open' : '']">⌄</text>
						</view>

						<!-- 向下展开的详情 -->
						<view v-if="expandedId === order.id" class="detail-panel">
							<!-- 关键节点（已完成可点击查看资料）：单行、图标化，风格对齐库存表 -->
							<view class="stage-area">
								<view v-if="loadingStages[order.id]" class="stage-empty">{{ $t('common.loading') }}</view>
								<view v-else class="node-sheet">
									<view
										v-for="(st, si) in keyStages(order.id)"
										:key="si"
										:class="['node-cell', st.done ? 'is-done' : 'is-pending']"
										:hover-class="st.done ? 'node-cell-active' : 'none'"
										@click="openStage(st)"
									>
										<text class="node-cell-name">{{ st.title }}</text>
										<view class="node-cell-meta">
											<text class="node-ic">✓</text>
											<text v-if="mediaCount(st)" class="node-cell-count">{{ mediaCount(st) }}</text>
										</view>
									</view>
								</view>
							</view>
						</view>
					</view>
				</block>

				<view v-else-if="!loading" class="empty">{{ $t('order.empty') }}</view>
				<view class="loading" v-if="loading">{{ $t('common.loading') }}</view>
				<view class="no-more" v-if="noMore && orders.length">{{ $t('common.noMore') }}</view>
			</view>
		</scroll-view>

		<!-- 节点详情弹层（底部弹出） -->
		<view v-if="activeStage" class="stage-modal-mask" @click="closeStage">
			<view class="stage-modal" @click.stop>
				<view class="stage-modal-head">
					<text class="stage-modal-title">{{ activeStage.title }}</text>
					<text class="stage-modal-close" @click="closeStage">✕</text>
				</view>
				<text v-if="activeStage.time" class="stage-modal-time">{{ activeStage.time }}</text>
				<scroll-view scroll-y class="stage-modal-body">
					<view v-if="!mediaCount(activeStage)" class="stage-modal-empty">{{ $t('common.noData') }}</view>
					<view v-else class="stage-modal-media">
						<image
							v-for="(img, mi) in activeStage.imgs"
							:key="'i' + mi"
							:src="img"
							mode="aspectFill"
							class="m-thumb"
							@click="previewImage(activeStage.imgs, img)"
						/>
						<video v-for="(v, vi) in activeStage.videos" :key="'v' + vi" :src="v" controls class="m-video" @longpress="downloadFile(v)"></video>
						<text v-for="(f, fi) in activeStage.files" :key="'f' + fi" class="m-file" @click="downloadFile(f.url)">📄 {{ f.name }}</text>
					</view>
				</scroll-view>
			</view>
		</view>
	</view>
</template>

<script>
import { checkLogin } from '@/common/auth.js';
import { request } from '@/common/request.js';

const MEDIA_BASE = 'https://autobss-1300679246.cos.accelerate.myqcloud.com';

// 展开详情只展示这几个关键节点，按流程顺序固定显示
const KEY_STAGES = ['随车资料', '加装项目', '排队号码', '交车视频'];

export default {
	data() {
		return {
			page: 1,
			pageSize: 20,
			orders: [],
			searchVin: '',
			statusFilter: '',
			statusPanelOpen: false,
			searchTimer: null,
			loading: false,
			noMore: false,
			refreshing: false,
			expandedId: '',
			stages: {},
			loadingStages: {},
			downloading: false,
			inited: false,
			activeStage: null
		};
	},
	onShow() {
		// tab 页每次显示都校验登录态
		if (!checkLogin('/pages/orders/orders')) return;
		// 仅首次进入时加载，避免每次切回 tab 都重新拉取
		if (!this.inited) {
			this.inited = true;
			this.loadOrders(true);
		}
	},
	computed: {
		statusOptions() {
			const opts = [{ value: '', label: this.$t('order.statusAll') }];
			for (let i = 1; i <= 9; i++) {
				opts.push({ value: i, label: this.$t('order.status.' + i) });
			}
			return opts;
		},
		statusIndex() {
			const idx = this.statusOptions.findIndex((o) => o.value === this.statusFilter);
			return idx < 0 ? 0 : idx;
		}
	},
	methods: {
		toggleStatusPanel() {
			this.statusPanelOpen = !this.statusPanelOpen;
		},
		closeStatusPanel() {
			this.statusPanelOpen = false;
		},
		selectStatus(opt) {
			this.statusPanelOpen = false;
			if (this.statusFilter === opt.value) return;
			this.statusFilter = opt.value;
			this.resetList();
			this.loadOrders(true);
		},
		resetList() {
			this.page = 1;
			this.noMore = false;
			this.orders = [];
			this.expandedId = '';
			this.stages = {};
			this.loadingStages = {};
		},
		onRefresh() {
			if (this.loading) return;
			this.refreshing = true;
			this.resetList();
			this.loadOrders(true);
		},
		onSearchInput(e) {
			this.searchVin = (e.detail && e.detail.value) || '';
			if (this.searchTimer) clearTimeout(this.searchTimer);
			this.searchTimer = setTimeout(() => {
				this.resetList();
				this.loadOrders(true);
			}, 300);
		},
		clearSearch() {
			this.searchVin = '';
			if (this.searchTimer) clearTimeout(this.searchTimer);
			this.resetList();
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
		formatter(utcString) {
			if (!utcString) return '';
			let s = utcString
				.trim()
				.replace(' UTC', 'Z')
				.replace(' +0000Z', 'Z')
				.replace(' +0000', 'Z')
				.replace('Z', 'Z')
				.replace(' ', 'T');
			s = s.replace(/\.\d+/, '');
			const date = new Date(s);
			if (isNaN(date.getTime())) return utcString;
			const yyyy = date.getFullYear();
			const mm = String(date.getMonth() + 1).padStart(2, '0');
			const dd = String(date.getDate()).padStart(2, '0');
			const hh = String(date.getHours()).padStart(2, '0');
			const mi = String(date.getMinutes()).padStart(2, '0');
			const ss = String(date.getSeconds()).padStart(2, '0');
			return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
		},
		loadOrders(isRefresh = false) {
			if (this.loading) return;
			this.loading = true;
			const keyword = (this.searchVin || '').trim();
			const keywordParam = keyword ? '&keyword=' + encodeURIComponent(keyword) : '';
			const statusParam = this.statusFilter !== '' ? '&status=' + this.statusFilter : '';
			request({
				url: '/orders?page_size=' + this.pageSize + '&page_num=' + this.page + keywordParam + statusParam
			})
				.then((res) => {
					if (!res) {
						uni.showToast({ title: this.$t('common.serverError'), icon: 'none' });
						return;
					}
					if (res.code !== 0) {
						uni.showToast({ title: res.msg || this.$t('common.loadFail'), icon: 'none' });
						return;
					}
					const newOrders =
						res.data?.orders?.map((order) => ({
							id: order.id,
							vin: order.vin,
							orderNo: order.tradeNo,
							createdAt: this.formatter(order.createdAt),
							title: order.car?.summary,
							tags: order.tags,
							status: order.status
						})) || [];
					this.orders = isRefresh ? newOrders : [...this.orders, ...newOrders];
					if (newOrders.length < this.pageSize) this.noMore = true;
				})
				.finally(() => {
					this.loading = false;
					this.refreshing = false;
				});
		},
		onReachBottom() {
			if (this.loading || this.noMore) return;
			this.page++;
			this.loadOrders(false);
		},
		toggleOrder(order) {
			if (!order || order.id === undefined || order.id === null) return;
			this.activeStage = null;
			if (this.expandedId === order.id) {
				this.expandedId = '';
				return;
			}
			this.expandedId = order.id;
			this.loadStages(order.id);
		},
		parseMedia(str) {
			if (!str) return [];
			return str
				.split('|')
				.map((s) => s.trim())
				.filter(Boolean)
				.map((s) => MEDIA_BASE + s);
		},
		loadStages(orderId) {
			if (orderId === undefined || orderId === null || this.stages[orderId]) return;
			this.$set(this.loadingStages, orderId, true);
			request({ url: '/orders/' + orderId })
				.then((res) => {
					if (res && res.code === 0) {
						// 后端按倒序返回（最后一步在前），反转为正序：第一步在上、最后一步在下
						const list = (res.data.stages || []).slice().reverse().map((it) => {
							const files = [];
							const urls = it.file ? it.file.split('|') : [];
							const names = it.fileName ? it.fileName.split('|') : [];
							urls.forEach((u, i) => {
								if (u) files.push({ url: MEDIA_BASE + u, name: names[i] || `${this.$t('order.orderNo')} ${i + 1}` });
							});
							return {
								title: it.stageLabel,
								time: it.createdAt ? this.formatter(it.createdAt) : '',
								imgs: this.parseMedia(it.img),
								videos: this.parseMedia(it.video),
								files,
								// 有时间戳或任何已上传的资料（图/视频/文件）即视为已完成
								done: !!it.createdAt || files.length > 0 || this.parseMedia(it.img).length > 0 || this.parseMedia(it.video).length > 0
							};
						});
						this.$set(this.stages, orderId, list);
					} else {
						this.$set(this.stages, orderId, []);
						uni.showToast({ title: (res && res.msg) || this.$t('common.loadFail'), icon: 'none' });
					}
				})
				.catch(() => {
					this.$set(this.stages, orderId, []);
				})
				.finally(() => {
					this.$set(this.loadingStages, orderId, false);
				});
		},
		// 按 KEY_STAGES 顺序取关键节点；缺失的显示为待处理占位
		keyStages(orderId) {
			const list = this.stages[orderId] || [];
			return KEY_STAGES.map((name) => {
				const found = list.find((s) => (s.title || '').trim() === name);
				return found || { title: name, time: '', imgs: [], videos: [], files: [], done: false };
			});
		},
		mediaCount(st) {
			if (!st) return 0;
			return (st.imgs ? st.imgs.length : 0) + (st.videos ? st.videos.length : 0) + (st.files ? st.files.length : 0);
		},
		openStage(st) {
			// 待处理节点不弹层
			if (!st || !st.done) return;
			this.activeStage = st;
		},
		closeStage() {
			this.activeStage = null;
		},
		previewImage(urls, current) {
			if (!current) return;
			uni.previewImage({ urls, current });
		},
		downloadFile(url) {
			if (!url || this.downloading) return;
			this.downloading = true;
			uni.showLoading({ title: this.$t('common.loading'), mask: true });
			uni.downloadFile({
				url,
				success: (res) => {
					if (res.statusCode === 200) {
						const ext = url.split('.').pop().toLowerCase();
						if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) {
							uni.saveVideoToPhotosAlbum({
								filePath: res.tempFilePath,
								success: () => uni.showToast({ title: this.$t('toast.changeSuccess'), icon: 'success' }),
								fail: () => uni.showToast({ title: this.$t('common.loadFail'), icon: 'none' })
							});
						} else {
							uni.openDocument({ filePath: res.tempFilePath, showMenu: true });
						}
					}
				},
				fail: () => uni.showToast({ title: this.$t('common.loadFail'), icon: 'none' }),
				complete: () => {
					this.downloading = false;
					uni.hideLoading();
				}
			});
		},
		statusText(status) {
			const key = 'order.status.' + status;
			const text = this.$t(key);
			return text === key ? '' : text;
		},
		progressPercent(status) {
			if (status >= 1 && status <= 8) return status * 10;
			if (status === 9) return 100;
			return 0;
		}
	}
};
</script>

<style lang="scss" scoped>
.page {
	background: #f5f6f8;
	height: 100vh;
	display: flex;
	flex-direction: column;
}

/* 搜索栏 */
.search-bar {
	position: relative;
	z-index: 60;
	flex: 0 0 auto;
	display: flex;
	align-items: center;
	gap: 16rpx;
	padding: 20rpx;
	background: #f5f6f8;
}
/* 状态触发按钮 */
.status-trigger {
	flex: 0 0 auto;
	display: flex;
	align-items: center;
	gap: 6rpx;
	max-width: 220rpx;
	background: #fff;
	border: 1rpx solid #f0e2d3;
	border-radius: 12rpx;
	padding: 18rpx 18rpx;
}
.status-trigger-on {
	border-color: #ff7a00;
	background: #fff6ec;
}
.status-trigger-text {
	font-size: 25rpx;
	color: #7a4a18;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}
.status-trigger-arrow {
	font-size: 24rpx;
	color: #ff6b00;
	line-height: 1;
	flex: 0 0 auto;
	transition: transform 0.2s ease;
}
.status-trigger-arrow.open {
	transform: rotate(180deg);
}

/* 状态展开面板 */
.status-mask {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.04);
	z-index: 50;
}
.status-panel {
	position: relative;
	z-index: 60;
	flex: 0 0 auto;
	display: flex;
	flex-wrap: wrap;
	gap: 16rpx;
	padding: 8rpx 20rpx 24rpx;
	background: #f5f6f8;
	border-bottom: 1rpx solid #f0e2d3;
	box-shadow: 0 10rpx 16rpx rgba(0, 0, 0, 0.05);
}
.status-chip {
	padding: 12rpx 24rpx;
	border-radius: 30rpx;
	background: #fff;
	border: 1rpx solid #f0e2d3;
	color: #7a4a18;
	font-size: 24rpx;
	line-height: 1.2;
}
.status-chip-active {
	background: #ff7a00;
	border-color: #ff7a00;
	color: #fff;
}

.search-input {
	flex: 1;
	min-width: 0;
	background: #fff;
	border: 1rpx solid #f0e2d3;
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

.order-sheet {
	background: #fff;
	border-top: 1rpx solid #f3dfcc;
}

/* 列表行 */
.order-group {
	border-bottom: 1rpx solid #f3dfcc;
}
.order-row {
	display: flex;
	align-items: center;
	gap: 14rpx;
	padding: 22rpx 20rpx;
	background: #fff;
}
.order-row-open {
	background: #fffaf4;
}
.order-row-active {
	background: #fff3e5;
}
.row-accent {
	width: 6rpx;
	height: 56rpx;
	border-radius: 6rpx;
	background: #ff7a00;
	flex: 0 0 auto;
}
.row-main {
	flex: 1;
	min-width: 0;
}
.row-title-line {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12rpx;
}
.row-title {
	flex: 1;
	font-size: 28rpx;
	font-weight: 600;
	color: #2b2b2b;
	word-break: break-word;
}
.status-badge {
	flex: 0 0 auto;
	font-size: 21rpx;
	color: #ff6b00;
	background: #fff1df;
	padding: 4rpx 14rpx;
	border-radius: 20rpx;
	white-space: nowrap;
}
.row-sub {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12rpx;
	margin-top: 8rpx;
}
.row-vin {
	font-size: 23rpx;
	color: #7a4a18;
	word-break: break-all;
}
.row-time {
	font-size: 21rpx;
	color: #aaa;
	flex: 0 0 auto;
	white-space: nowrap;
}
.row-chevron {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 34rpx;
	height: 34rpx;
	border-radius: 50%;
	background: #fff1df;
	color: #ff6b00;
	font-size: 28rpx;
	line-height: 1;
	transition: transform 0.2s ease;
	flex: 0 0 auto;
}
.row-chevron-open {
	transform: rotate(180deg);
}

/* 展开详情 */
.detail-panel {
	background: #fffaf4;
	border-top: 1rpx solid #f3dfcc;
	padding: 20rpx;
}

/* 标签 */
.tag-row {
	display: flex;
	flex-wrap: wrap;
	gap: 8rpx;
}
.tag {
	background: #fff5e6;
	color: #ff6b00;
	padding: 4rpx 14rpx;
	font-size: 21rpx;
	border-radius: 8rpx;
	line-height: 1.6;
	word-break: break-word;
}

/* 当前状态摘要 */
.summary {
	background: #fff;
	border: 1rpx solid #f3dfcc;
	border-radius: 12rpx;
	padding: 18rpx 20rpx;
	margin-bottom: 16rpx;
}
.summary-top {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: 12rpx;
	margin-bottom: 14rpx;
}
.summary-label {
	font-size: 24rpx;
	color: #9a7a55;
	flex: 0 0 auto;
}
.summary-status {
	font-size: 28rpx;
	color: #ff6b00;
	font-weight: 700;
	text-align: right;
	word-break: break-word;
}
.progress-bar {
	width: 100%;
	height: 10rpx;
	background: #f0e2d3;
	border-radius: 10rpx;
	overflow: hidden;
}
.progress-fill {
	height: 100%;
	background: linear-gradient(90deg, #ff9a00, #ff6b00);
	transition: width 0.4s ease;
}

/* 关键节点区 */
.stage-area {
	margin-top: 0;
}
.stage-empty {
	text-align: center;
	color: #b08a63;
	font-size: 24rpx;
	padding: 30rpx 0;
}

/* 关键节点：单行 4 格，风格对齐库存表（描边、橙色系） */
.node-sheet {
	display: flex;
	border: 1rpx solid #f3dfcc;
	border-radius: 12rpx;
	overflow: hidden;
	background: #fff;
}
.node-cell {
	flex: 1;
	min-width: 0;
	box-sizing: border-box;
	padding: 16rpx 6rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 10rpx;
	border-right: 1rpx solid #f3dfcc;
}
.node-cell:last-child {
	border-right: 0;
}
.node-cell.is-done {
	background: #fffaf4;
}
.node-cell-active {
	background: #fff3e5;
}
.node-cell-name {
	font-size: 22rpx;
	color: #7a4a18;
	text-align: center;
	white-space: nowrap;
}
.is-pending .node-cell-name {
	color: #b39a7d;
}
.node-cell-meta {
	display: flex;
	align-items: center;
	gap: 6rpx;
}
/* 状态图标：完成=橙底白勾，待处理=灰色空心 */
.node-ic {
	width: 30rpx;
	height: 30rpx;
	border-radius: 50%;
	font-size: 18rpx;
	line-height: 30rpx;
	text-align: center;
	box-sizing: border-box;
}
.is-done .node-ic {
	background: #ff7a00;
	color: #fff;
}
.is-pending .node-ic {
	background: #fff;
	border: 2rpx solid #e0cdb8;
	color: transparent;
}
.node-cell-count {
	font-size: 18rpx;
	color: #ff6b00;
	background: #fff1df;
	border-radius: 16rpx;
	padding: 0 8rpx;
	line-height: 28rpx;
}

/* 节点详情弹层（底部弹出） */
.stage-modal-mask {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.45);
	z-index: $z-popup;
	display: flex;
	flex-direction: column;
	justify-content: flex-end;
}
.stage-modal {
	background: #fff;
	border-radius: 24rpx 24rpx 0 0;
	padding: 24rpx;
	max-height: 76vh;
	display: flex;
	flex-direction: column;
}
.stage-modal-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 12rpx;
}
.stage-modal-title {
	font-size: 30rpx;
	font-weight: 700;
	color: #2b2b2b;
}
.stage-modal-close {
	font-size: 32rpx;
	color: #999;
	padding: 4rpx 12rpx;
	flex: 0 0 auto;
}
.stage-modal-time {
	display: block;
	font-size: 22rpx;
	color: #aaa;
	margin-top: 8rpx;
}
.stage-modal-body {
	margin-top: 18rpx;
	flex: 1;
	min-height: 0;
}
.stage-modal-empty {
	text-align: center;
	color: #b08a63;
	font-size: 26rpx;
	padding: 60rpx 0;
}
.stage-modal-media {
	display: flex;
	flex-wrap: wrap;
	gap: 12rpx;
	padding-bottom: 20rpx;
}
.m-thumb {
	width: 216rpx;
	height: 216rpx;
	border-radius: 10rpx;
	background: #f0f0f0;
}
.m-video {
	width: 100%;
	height: 380rpx;
	border-radius: 10rpx;
	background: #000;
}
.m-file {
	width: 100%;
	font-size: 24rpx;
	color: #1a73e8;
	padding: 12rpx 0;
	word-break: break-all;
}

/* 空 / 加载 / 无更多 */
.empty,
.loading,
.no-more {
	text-align: center;
	color: #999;
	padding: 50rpx 0;
	font-size: 26rpx;
}
</style>
