<template>
	<view class="page">
		<view class="inventory-sheet">
			<view class="model-header">
				<view class="head-cell">Марка</view>
			</view>

			<scroll-view class="model-scroll" scroll-y enhanced show-scrollbar refresher-enabled :refresher-triggered="refreshing" @refresherrefresh="refreshInventory">
				<view v-if="loading && !models.length" class="empty-state">Загрузка...</view>
				<view v-else-if="!models.length" class="empty-state">Нет данных</view>

				<view v-for="model in models" :key="model.id" class="model-group">
					<view :class="['model-row', expandedModelId === model.id ? 'model-row-open' : '']" hover-class="model-row-active" @click="toggleModel(model)">
						<view class="model-name">
							<view class="model-accent"></view>
							<text class="model-title">{{ model.modelName }}</text>
							<text :class="['model-chevron', expandedModelId === model.id ? 'model-chevron-open' : '']">⌄</text>
						</view>
					</view>

					<view v-if="expandedModelId === model.id" class="detail-panel">
						<view class="detail-header">
							<view class="detail-cell model-detail-col">Модель</view>
							<view class="detail-cell color-col">Цвет</view>
							<view class="detail-cell quantity-col">Кол-во</view>
							<view class="detail-cell price-col">Цена</view>
						</view>

						<view v-if="loadingItems[model.id]" class="detail-empty">Загрузка...</view>
						<view v-else-if="!modelItems[model.id] || !modelItems[model.id].length" class="detail-empty">Нет данных</view>

						<view v-for="group in buildGroupedItems(modelItems[model.id])" :key="group.key" class="detail-group">
							<view class="detail-merged-model" hover-class="model-detail-active" @click.stop="openModelDetailModal(group)">
								<text class="detail-merged-model-text">{{ group.modelName || '-' }}</text>
							</view>
							<view class="detail-group-rows">
								<view v-for="item in group.items" :key="item.id" class="detail-row-merged">
									<view class="detail-cell color-col color-cell" hover-class="color-cell-active" @click.stop="loadInventoryItemMedia(item)">
										<view class="color-swatch-wrap">
											<view class="color-swatch" :style="{ backgroundColor: colorSwatch(item.color) }"></view>
											<view class="color-swatch-play-hint">
												<view class="color-swatch-play-icon"></view>
											</view>
										</view>
									</view>
									<view class="detail-cell quantity-col quantity-cell">
										<text :class="['quantity-value', item.isInTransit ? 'in-transit' : '']">{{ formatQuantity(item) }}</text>
									</view>
									<view class="detail-cell price-col price-cell">{{ formatPrice(item.price) }}</view>
								</view>
							</view>
						</view>
					</view>
				</view>
			</scroll-view>
		</view>

		<view v-if="activeInventoryItem" class="model-modal-mask" @click="closeModelModal">
			<view class="model-modal" @click.stop>
				<view class="model-modal-head">
					<view class="model-modal-title-block">
						<text class="model-modal-title">Реальные фотографии автомобиля</text>
						<!-- <text class="model-modal-context">{{ activeInventoryItem.modelName || '-' }}</text> -->
					</view>
					<text class="model-modal-close" @click="closeModelModal">✕</text>
				</view>
				<scroll-view scroll-y class="model-modal-body">
					<view v-if="activeInventoryMediaLoading" class="model-modal-empty">Загрузка...</view>
					<view v-else-if="!activeMediaCount" class="model-modal-empty">Нет данных</view>
					<view v-else class="inventory-modal-media">
						<view v-if="activeVideoUrls.length" class="inventory-video-hint">Нажмите и удерживайте видео, чтобы сохранить его в альбом</view>
						<image
							v-for="(imageUrl, index) in activeImageUrls"
							:key="imageUrl || index"
							:src="imageUrl"
							mode="aspectFill"
							class="inventory-image"
							@click="previewInventoryImage(imageUrl)"
						></image>
						<video
							v-for="(videoUrl, index) in activeVideoUrls"
							:key="videoUrl || index"
							class="inventory-video"
							:src="videoUrl"
							controls
							show-center-play-btn
							object-fit="contain"
							@longpress="downloadVideo(videoUrl)"
						></video>
					</view>
				</scroll-view>
			</view>
		</view>

		<view v-if="activeModelDetail" class="model-modal-mask" @click="closeModelDetailModal">
			<view class="model-modal model-info-modal" @click.stop>
				<view class="model-modal-head">
					<text class="model-modal-title">Информация об автомобиле</text>
					<text class="model-modal-close" @click="closeModelDetailModal">✕</text>
				</view>
				<view v-if="activeModelDetailLoading" class="model-modal-empty">Загрузка...</view>
				<scroll-view scroll-y class="model-detail-images" v-else-if="activeModelDetailImageUrls.length">
					<image
						v-for="(imageUrl, index) in activeModelDetailImageUrls"
						:key="imageUrl || index"
						:src="imageUrl"
						mode="widthFix"
						class="model-detail-image"
						@click="previewModelDetailImage(imageUrl)"
					></image>
				</scroll-view>
				<view v-else class="model-info-table">
					<view class="model-info-row">
						<text class="model-info-label">Название модели</text>
						<text class="model-info-value">{{ activeModelDetail.name || '-' }}</text>
					</view>
					<view v-for="row in activeModelDetail.rows" :key="row.label" class="model-info-row">
						<text class="model-info-label">{{ row.label }}</text>
						<text class="model-info-value">{{ row.value }}</text>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { request } from '../../common/request.js';

const MEDIA_BASE = 'https://autobss-1300679246.cos.accelerate.myqcloud.com';

export default {
	data() {
		return {
			activeInventoryItem: null,
			activeInventoryMedia: {
				images: [],
				videos: []
			},
			activeInventoryMediaLoading: false,
			activeModelDetail: null,
			activeModelDetailImages: [],
			activeModelDetailLoading: false,
			activeModelDetailRequestKey: '',
			downloadingVideo: false,
			expandedModelId: '',
			loading: false,
			loadingItems: {},
			modelItems: {},
			models: [],
			refreshing: false
		};
	},
	onLoad() {
		this.loadModels();
	},
	computed: {
		activeImageUrls() {
			return this.resolveMediaAssetUrls(this.activeInventoryMedia?.images);
		},
		activeVideoUrls() {
			return this.resolveMediaAssetUrls(this.activeInventoryMedia?.videos);
		},
		activeMediaCount() {
			return this.activeImageUrls.length + this.activeVideoUrls.length;
		},
		activeModelDetailImageUrls() {
			return this.resolveMediaAssetUrls(this.activeModelDetailImages);
		}
	},
	methods: {
		async loadModels() {
			this.loading = true;

			try {
				const res = await request({
					url: '/pricing-inventory/models'
				});
				const list = Array.isArray(res?.data?.items) ? res.data.items : [];
				this.models = list.map((item) => ({
					id: this.stringifyValue(item.id),
					modelName: this.stringifyValue(item.modelName)
				}));
			} catch (error) {
				console.error('load pricing inventory models failed', error);
				this.models = [];
			} finally {
				this.loading = false;
				this.refreshing = false;
			}
		},
		async loadModelItems(modelId) {
			if (!modelId || this.modelItems[modelId]) {
				return;
			}

			this.$set(this.loadingItems, modelId, true);

			try {
				const res = await request({
					url: `/pricing-inventory/models/${modelId}/items`
				});
				const list = Array.isArray(res?.data?.items) ? res.data.items : [];
				this.$set(
					this.modelItems,
					modelId,
					list.map((item) => {
						const mapped = {
							carId: this.resolveCarId(item),
							color: this.resolveColor(item),
							id: this.stringifyValue(item.id),
							modelName: this.stringifyValue(item.modelName),
							price: item.price,
							quantity: Number(item.quantity || 0),
							inStock: Number(item.inStockQuantity || 0)
						};
						return {
							...mapped,
							isInTransit: item.status === 0
						};
					})
				);
			} catch (error) {
				console.error('load pricing inventory items failed', error);
				this.$set(this.modelItems, modelId, []);
			} finally {
				this.$set(this.loadingItems, modelId, false);
			}
		},
		refreshInventory() {
			this.refreshing = true;
			this.expandedModelId = '';
			this.modelItems = {};
			this.loadingItems = {};
			this.loadModels();
		},
		toggleModel(model) {
			if (!model || !model.id) {
				return;
			}

			if (this.expandedModelId === model.id) {
				this.expandedModelId = '';
				return;
			}

			this.expandedModelId = model.id;
			this.loadModelItems(model.id);
		},
		stringifyValue(value) {
			if (value === undefined || value === null || value === '') {
				return '';
			}
			return String(value);
		},
		getPayloadValue(payload = {}, keys = []) {
			for (const key of keys) {
				const value = payload[key];
				if (value !== undefined && value !== null && value !== '') {
					return value;
				}
			}
			return '';
		},
		resolveColor(item = {}) {
			return this.stringifyValue(
				item.color ||
					this.getPayloadValue(item.payload || {}, ['颜色', '颜色/Цвет', 'Цвет', '外观颜色', '车身颜色'])
			);
		},
		resolveCarId(item = {}) {
			return this.stringifyValue(
				item.carId ||
					item.car_id ||
					item.car?.id ||
					item.vehicleId ||
					item.vehicle_id ||
				this.getPayloadValue(item.payload || {}, ['carId', 'car_id', '车辆ID', '车辆id'])
			);
		},
		parseTransitValue(value) {
			if (value === true || value === 1) return true;
			if (value === false || value === 0) return false;
			const text = this.stringifyValue(value).trim().toLowerCase();

			return undefined;
		},
		resolveTransitStatus(item = {}) {
			const payload = item.payload || {};

			for (const value of values) {
				const parsed = this.parseTransitValue(value);
				if (parsed !== undefined) {
					return parsed;
				}
			}
			return this.shouldSimulateTransit(item);
		},
		shouldSimulateTransit(item = {}) {
			const key = [
				this.stringifyValue(item.modelName),
				this.stringifyValue(item.color),
				this.stringifyValue(item.id || item.carId)
			].join('|');
			if (!key.replace(/\|/g, '')) {
				return false;
			}
			let hash = 0;
			for (let index = 0; index < key.length; index += 1) {
				hash = (hash * 31 + key.charCodeAt(index)) % 9973;
			}
			return hash % 6 === 0;
		},
		parseMediaUrls(value) {
			if (!value) return [];
			if (Array.isArray(value)) {
				return value.flatMap((item) => this.parseMediaUrls(item));
			}
			if (typeof value === 'object') {
				return this.parseMediaUrls(
					value.url ||
						value.src ||
						value.path ||
						value.videoUrl ||
						value.video_url ||
						value.videoUrls ||
						value.video_urls ||
						value.videos ||
						value.mediaUrl ||
						value.media_url ||
						value.mediaUrls ||
						value.media_urls
				);
			}
			return String(value)
				.split(/[\n|,;，；]/)
				.map((item) => this.normalizeMediaUrl(item))
				.filter(Boolean);
		},
		normalizeMediaUrl(value) {
			const text = this.stringifyValue(value).trim();
			if (!text) return '';
			if (/^https?:\/\//i.test(text)) return text;
			if (text.startsWith('/')) return MEDIA_BASE + text;
			return `${MEDIA_BASE}/${text}`;
		},
		resolveMediaAssetUrls(value) {
			if (!value) return [];
			if (Array.isArray(value)) {
				return Array.from(new Set(value.flatMap((item) => this.resolveMediaAssetUrls(item))));
			}
			if (typeof value === 'object') {
				const direct = this.resolveMediaAssetUrl(value);
				const nested = [
					...this.resolveMediaAssetUrls(value.images),
					...this.resolveMediaAssetUrls(value.imageUrls),
					...this.resolveMediaAssetUrls(value.imgs),
					...this.resolveMediaAssetUrls(value.videos),
					...this.resolveMediaAssetUrls(value.videoUrls),
					...this.resolveMediaAssetUrls(value.media)
				];
				return Array.from(new Set([direct, ...nested].filter(Boolean)));
			}
			return this.parseMediaUrls(value);
		},
		resolveMediaAssetUrl(value) {
			if (!value) return '';
			if (typeof value === 'object') {
				return this.parseMediaUrls(value.url || value.path || value.src || value.href)[0] || '';
			}
			return this.parseMediaUrls(value)[0] || '';
		},
		async loadInventoryItemMedia(item) {
			if (!item || !item.id) {
				return;
			}
			console.log('[inventory] open media', item.id);
			this.activeInventoryItem = item;
			this.activeInventoryMedia = { images: [], videos: [] };
			this.activeInventoryMediaLoading = true;

			try {
				const res = await request({
					url: `/pricing-inventory/items/${encodeURIComponent(item.id)}/media`
				});
				const media = res?.data || res || {};
				this.activeInventoryMedia = {
					images: this.resolveMediaAssetUrls([media.images, media.imageUrls, media.imgs]),
					videos: this.resolveMediaAssetUrls([media.videos, media.videoUrls])
				};
			} catch (error) {
				console.error('load pricing inventory item media failed', error);
				this.activeInventoryMedia = { images: [], videos: [] };
				uni.showToast({ title: '加载失败', icon: 'none' });
			} finally {
				this.activeInventoryMediaLoading = false;
			}
		},
		closeModelModal() {
			this.activeInventoryItem = null;
			this.activeInventoryMedia = { images: [], videos: [] };
			this.activeInventoryMediaLoading = false;
		},
		async openModelDetailModal(group = {}) {
			this.activeModelDetail = this.buildModelDetail(group.modelName || group.name || group);
			this.activeModelDetailImages = [];
			const itemIds = this.resolveGroupItemIds(group);
			const url = this.buildInventoryMediaUrl(itemIds, 1);
			this.activeModelDetailRequestKey = url;
			if (!url) {
				this.activeModelDetailLoading = false;
				return;
			}

			this.activeModelDetailLoading = true;
			try {
				const res = await request({ url });
				if (this.activeModelDetailRequestKey !== url) {
					return;
				}
				const data = res?.data || res || {};
				const mediaItems = Array.isArray(data.items) ? data.items : [];
				this.activeModelDetailImages = this.resolveMediaAssetUrls(
					mediaItems.map((item) => [item.images, item.imageUrls, item.imgs])
				);
			} catch (error) {
				console.error('load pricing inventory model media failed', error);
				this.activeModelDetailImages = [];
			} finally {
				if (this.activeModelDetailRequestKey === url) {
					this.activeModelDetailLoading = false;
				}
			}
		},
		closeModelDetailModal() {
			this.activeModelDetail = null;
			this.activeModelDetailImages = [];
			this.activeModelDetailLoading = false;
			this.activeModelDetailRequestKey = '';
		},
		resolveGroupItemIds(group = {}) {
			const items = Array.isArray(group?.items) ? group.items : [];
			return Array.from(new Set(items.map((item) => this.stringifyValue(item?.id)).filter(Boolean)));
		},
		buildInventoryMediaUrl(itemIds = [], category = 0) {
			if (!Array.isArray(itemIds) || !itemIds.length) {
				return '';
			}
			return `/pricing-inventory/media?itemIds=${itemIds.map(encodeURIComponent).join(',')}&category=${category}`;
		},
		buildModelDetail(modelName) {
			const rawName = this.stringifyValue(modelName).trim();
			if (!rawName) {
				return { name: '-', rows: [] };
			}

			const segments = rawName
				.split('/')
				.map((segment) => segment.trim())
				.filter(Boolean);
			const head = segments.shift() || rawName;
			const headYear = this.extractModelYear(head);
			let name = headYear.name || head;
			let year = headYear.year;
			let drive = '';
			let displacement = '';
			const configurations = [];

			for (const segment of segments) {
				if (!year) {
					const segmentYear = this.extractModelYear(segment);
					if (segmentYear.year && !segmentYear.name) {
						year = segmentYear.year;
						continue;
					}
				}

				if (!drive && this.isDriveText(segment)) {
					drive = segment;
					continue;
				}

				if (!displacement && this.isDisplacementText(segment)) {
					displacement = segment;
					continue;
				}

				configurations.push(segment);
			}

			const rows = [];
			if (year) rows.push({ label: 'Год', value: year });
			if (drive) rows.push({ label: 'Привод', value: drive });
			if (displacement) rows.push({ label: 'Объём двигателя', value: displacement });
			if (configurations.length) rows.push({ label: 'Комплектация', value: configurations.join(' / ') });

			return {
				name: name || rawName,
				rows
			};
		},
		extractModelYear(value) {
			const text = this.stringifyValue(value).trim();
			const match = text.match(/(^|\s)(19\d{2}|20\d{2}|[2-9]\d)(?=$|\s)/);
			if (!match) {
				return { name: text, year: '' };
			}
			const rawYear = match[2];
			const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
			const name = `${text.slice(0, match.index)} ${text.slice(match.index + match[0].length)}`
				.replace(/\s+/g, ' ')
				.trim();
			return { name, year };
		},
		isDriveText(value) {
			return /^(2wd|4wd|awd|fwd|rwd|两驱|四驱|前驱|后驱)$/i.test(this.stringifyValue(value).trim());
		},
		isDisplacementText(value) {
			return /^\d+(?:\.\d+)?\s*(?:l|t)$/i.test(this.stringifyValue(value).trim());
		},
		downloadVideo(url) {
			if (!url || this.downloadingVideo) {
				return;
			}
			this.downloadingVideo = true;
			uni.showLoading({ title: '下载中...', mask: true });
			uni.downloadFile({
				url,
				success: (res) => {
					if (res.statusCode !== 200) {
						uni.showToast({ title: '下载失败', icon: 'none' });
						return;
					}
					const filePath = res.tempFilePath || res.filePath;
					if (!filePath) {
						uni.showToast({ title: '下载失败', icon: 'none' });
						return;
					}
					uni.saveVideoToPhotosAlbum({
						filePath,
						success: () => uni.showToast({ title: '视频已保存', icon: 'success' }),
						fail: () => uni.showToast({ title: '保存失败', icon: 'none' })
					});
				},
				fail: () => uni.showToast({ title: '下载失败', icon: 'none' }),
				complete: () => {
					this.downloadingVideo = false;
					uni.hideLoading();
				}
			});
		},
		previewInventoryImage(current) {
			const urls = this.activeImageUrls;
			if (!current || !urls.length) {
				return;
			}
			uni.previewImage({
				current,
				urls
			});
		},
		previewModelDetailImage(current) {
			const urls = this.activeModelDetailImageUrls;
			if (!current || !urls.length) {
				return;
			}
			uni.previewImage({
				current,
				urls
			});
		},
		formatQuantity(item = {}) {
			if (item.isInTransit) {
				return 'В пути';
			}
			const quantity = Number(item.quantity || 0);
			return Number.isNaN(quantity) ? '-' : String(quantity);
		},
		colorSwatch(color) {
			const text = this.stringifyValue(color).trim();
			if (/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(text)) {
				return text;
			}
			const lower = text.toLowerCase();
			if (/(银|сереб|silver)/i.test(lower)) return '#c9cdd2';
			if (/(白|бел|white)/i.test(lower)) return '#f7f7f2';
			if (/(黑|черн|black)/i.test(lower)) return '#1f2328';
			if (/(灰|сер|gray|grey)/i.test(lower)) return '#8f959e';
			if (/(红|красн|red)/i.test(lower)) return '#d64545';
			if (/(蓝|син|blue)/i.test(lower)) return '#2f6fd6';
			if (/(绿|зелен|green)/i.test(lower)) return '#2e9d62';
			if (/(黄|желт|yellow|金|gold)/i.test(lower)) return '#e2b33c';
			if (/(橙|оранж|orange)/i.test(lower)) return '#ff7a00';
			if (/(棕|корич|brown)/i.test(lower)) return '#8a5a36';
			return '#d8dbe0';
		},
		buildGroupedItems(items = []) {
			const groups = [];
			for (const item of items) {
				const modelName = this.stringifyValue(item?.modelName) || '-';
				const lastGroup = groups[groups.length - 1];
				if (lastGroup && lastGroup.modelName === modelName) {
					lastGroup.items.push(item);
					continue;
				}
				groups.push({
					items: [item],
					key: `${modelName}-${item?.id || groups.length}`,
					modelName
				});
			}
			return groups;
		},
		formatPrice(value) {
			if (value === undefined || value === null || value === '') {
				return '-';
			}
			if (typeof value === 'string' && value.includes('$')) {
				return value;
			}
			const normalized = Number(value);
			if (Number.isNaN(normalized)) {
				return String(value);
			}
			return `$${normalized.toLocaleString('en-US')}`;
		}
	}
};
</script>

<style lang="scss" scoped>
.page {
	min-height: 100vh;
	background: $page-bg;
	padding: 12rpx 8rpx 24rpx;
	box-sizing: border-box;
}

.inventory-sheet {
	width: 100%;
	background: #fff;
	border: 1rpx solid #f3dfcc;
	box-sizing: border-box;
}

.model-header,
.model-row {
	display: grid;
	grid-template-columns: 1fr;
}

.head-cell {
	display: flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
	height: 74rpx;
	border-right: 1rpx solid #f3dfcc;
	border-bottom: 1rpx solid #f3dfcc;
	font-size: 27rpx;
	font-weight: 700;
	color: #fff;
	background: linear-gradient(180deg, #ff9a00 0%, #ff6b00 100%);
}

.head-cell:last-child {
	border-right: 0;
}

.model-scroll {
	height: calc(100vh - 36rpx - 74rpx);
}

.model-group {
	border-bottom: 1rpx solid #f3dfcc;
}

.model-row {
	min-height: 86rpx;
	background: #fff;
}

.model-row-open {
	background: #fffaf4;
}

.model-row-active {
	background: #fff3e5;
}

.model-name {
	display: flex;
	align-items: center;
	box-sizing: border-box;
	padding: 10rpx;
}

.model-name {
	justify-content: flex-start;
	gap: 10rpx;
	font-size: 26rpx;
	line-height: 1.28;
	color: #7a4a18;
	word-break: break-word;
}

.model-accent {
	width: 6rpx;
	height: 42rpx;
	border-radius: 6rpx;
	background: #ff7a00;
	flex: 0 0 auto;
}

.model-title {
	flex: 1;
}

.model-chevron {
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

.model-chevron-open {
	transform: rotate(180deg);
}

.detail-panel {
	background: #fffaf4;
	border-top: 1rpx solid #f3dfcc;
}

.detail-header {
	display: grid;
	grid-template-columns: 1fr 96rpx 96rpx 162rpx;
}

.detail-group {
	display: grid;
	grid-template-columns: 1fr 354rpx;
	background: #fff;
}

.detail-group-rows {
	display: flex;
	flex-direction: column;
}

.detail-row-merged {
	display: grid;
	grid-template-columns: 96rpx 96rpx 162rpx;
}

.quantity-value {
	font-size: 26rpx;
	font-weight: 700;
	color: #ff6b00;
}

.in-transit {
	color: #a66a22;
}

.detail-merged-model {
	display: flex;
	align-items: center;
	justify-content: flex-start;
	padding: 0 14rpx;
	border-right: 1rpx solid #f3dfcc;
	border-bottom: 1rpx solid #f3dfcc;
	background: #fff8f0;
	box-sizing: border-box;
	overflow: hidden;
}

.model-detail-active {
	background: #fff3e5;
}

.detail-merged-model-text {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	overflow: hidden;
	font-size: 25rpx;
	font-weight: 600;
	line-height: 1.35;
	color: #6f4317;
	text-align: left;
	word-break: break-word;
}

.detail-cell {
	display: flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
	min-height: 68rpx;
	border-right: 1rpx solid #f3dfcc;
	border-bottom: 1rpx solid #f3dfcc;
	padding: 8rpx;
	font-size: 24rpx;
	color: #2b2b2b;
	text-align: center;
	word-break: break-word;
}

.detail-cell:last-child {
	border-right: 0;
}

.detail-header .detail-cell {
	justify-content: center;
	min-height: 58rpx;
	font-size: 22rpx;
	font-weight: 700;
	color: #7a4a18;
	background: #fff1df;
	text-align: center;
}

.detail-header .quantity-col {
	padding-left: 2rpx;
	padding-right: 2rpx;
	font-size: 20rpx;
	white-space: nowrap;
	word-break: keep-all;
}

.price-cell {
	font-size: 30rpx;
	font-family: Georgia, 'Times New Roman', serif;
	color: #ff6b00;
	white-space: nowrap;
	word-break: keep-all;
}

.detail-group-rows .color-col {
	justify-content: flex-start;
	text-align: left;
	padding-left: 12rpx;
}

.detail-group-rows .color-cell {
	justify-content: center;
	padding-left: 8rpx;
	padding-right: 8rpx;
}

.color-cell-active {
	background: #fff3e5;
}

.color-swatch-wrap {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 44rpx;
	height: 44rpx;
	transition: transform 0.16s ease;
}

.color-cell-active .color-swatch-wrap {
	transform: scale(0.94);
}

.color-swatch {
	width: 34rpx;
	height: 34rpx;
	border-radius: 8rpx;
	border: 1rpx solid #d7c5ad;
	box-shadow: inset 0 1rpx 2rpx rgba(255, 255, 255, 0.65), 0 2rpx 5rpx rgba(0, 0, 0, 0.08);
	box-sizing: border-box;
}

.color-swatch-play-hint {
	position: absolute;
	right: 0;
	bottom: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 22rpx;
	height: 18rpx;
	border-radius: 10rpx;
	border: 1rpx solid rgba(255, 107, 0, 0.42);
	background: #fffaf4;
	box-shadow: 0 2rpx 6rpx rgba(122, 74, 24, 0.16);
	box-sizing: border-box;
}

.color-swatch-play-icon {
	width: 0;
	height: 0;
	margin-left: 2rpx;
	border-top: 4rpx solid transparent;
	border-bottom: 4rpx solid transparent;
	border-left: 6rpx solid #ff6b00;
}

.detail-group-rows .price-col {
	justify-content: flex-end;
	text-align: right;
	padding-right: 12rpx;
}

.empty-state,
.detail-empty {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 180rpx;
	color: #999;
	font-size: 26rpx;
}

.detail-empty {
	min-height: 92rpx;
	background: #fffaf4;
}

.model-modal-mask {
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

.model-modal {
	background: #fff;
	border-radius: 24rpx 24rpx 0 0;
	padding: 24rpx 24rpx 18rpx;
	max-height: 76vh;
	display: flex;
	flex-direction: column;
	box-sizing: border-box;
}

.model-info-modal {
	padding-bottom: 28rpx;
}

.model-modal-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 20rpx;
}

.model-modal-title-block {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 4rpx;
}

.model-modal-title {
	flex: 1;
	min-width: 0;
	font-size: 30rpx;
	font-weight: 700;
	color: #2b2b2b;
	line-height: 1.35;
	word-break: break-word;
}

.model-modal-title-block .model-modal-title {
	flex: 0 1 auto;
}

.model-modal-context {
	font-size: 23rpx;
	line-height: 1.35;
	color: #8a6a46;
	word-break: break-word;
}

.model-modal-close {
	flex: 0 0 auto;
	width: 52rpx;
	height: 52rpx;
	line-height: 52rpx;
	border-radius: 50%;
	text-align: center;
	background: #f6f6f6;
	color: #666;
	font-size: 28rpx;
}

.model-info-table {
	margin-top: 20rpx;
	border: 1rpx solid #f3dfcc;
	border-bottom: 0;
	border-radius: 8rpx;
	overflow: hidden;
}

.model-detail-images {
	display: flex;
	flex-direction: column;
	flex-wrap: nowrap;
	margin-top: 20rpx;
	height: 560rpx;
	overflow: hidden;
}

.model-detail-image {
	display: block;
	width: 100%;
	border-radius: 10rpx;
	background: #f0f0f0;
}

.model-detail-image + .model-detail-image {
	margin-top: 16rpx;
}

.model-info-row {
	display: grid;
	grid-template-columns: 260rpx 1fr;
	min-height: 68rpx;
	border-bottom: 1rpx solid #f3dfcc;
}

.model-info-label,
.model-info-value {
	display: flex;
	align-items: center;
	box-sizing: border-box;
	padding: 12rpx 16rpx;
	font-size: 24rpx;
	line-height: 1.35;
	word-break: break-word;
}

.model-info-label {
	background: #fff8f0;
	border-right: 1rpx solid #f3dfcc;
	color: #7a4a18;
	font-weight: 700;
}

.model-info-value {
	color: #2b2b2b;
}

.model-modal-body {
	margin-top: 20rpx;
	height: 560rpx;
	overflow: hidden;
	border-radius: 16rpx;
	background: #fff;
}

.model-modal-empty {
	text-align: center;
	color: #b08a63;
	font-size: 26rpx;
	padding: 80rpx 0;
}

.inventory-modal-media {
	display: flex;
	flex-wrap: wrap;
	gap: 12rpx;
	padding-bottom: 20rpx;
}

.inventory-video-hint {
	width: 100%;
	padding: 0 4rpx 4rpx;
	box-sizing: border-box;
	font-size: 22rpx;
	line-height: 1.4;
	color: #b08a63;
	text-align: center;
}

.inventory-image {
	width: 216rpx;
	height: 216rpx;
	border-radius: 10rpx;
	background: #f0f0f0;
}

.inventory-video {
	display: block;
	width: 100%;
	height: 420rpx;
	background: #111820;
}

.inventory-video + .inventory-video {
	margin-top: 16rpx;
}
</style>
