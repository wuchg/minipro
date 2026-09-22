
<template>
	<view class="page-shell">
		<scroll-view class="page" scroll-y refresher-enabled :refresher-triggered="refreshing" @refresherrefresh="refreshInventory">
			<view class="content">
				<view class="search-bar">
					<view class="search-icon"></view>
					<input v-model="searchKeyword" class="search-input" placeholder="Поиск марки или модели" confirm-type="search" />
					<view v-if="searchKeyword" class="search-clear" role="button" aria-label="Очистить поиск" @click="clearSearch">
						<view class="search-clear-icon"></view>
					</view>
				</view>

				<view class="brand-head">
					<text class="brand-title">{{ brandName || 'Модельный ряд' }}</text>
					<text class="brand-subtitle">{{ seriesGroups.length }} серий</text>
				</view>

			<view v-if="loading || seriesGroups.length || (!globalSearchLoading && !otherBrandSeriesMatches.length)" class="inventory-sheet">
				<view class="model-scroll">
					<view v-if="loading" class="empty-state">Загрузка...</view>
					<view v-else-if="!seriesGroups.length" class="empty-state">{{ searchKeyword ? 'Ничего не найдено' : 'Нет данных' }}</view>

					<view :class="['series-group', expandedSeriesId === series.key ? 'series-group-open' : '']" v-for="series in seriesGroups" :key="series.key">
						<view :class="['series-row', expandedSeriesId === series.key ? 'series-row-open' : '']" hover-class="series-row-active" @click="toggleSeries(series)">
							<view class="series-name">
								<view class="series-accent"></view>
								<text class="series-title">{{ series.seriesName }}</text>
								<view :class="['model-chevron', expandedSeriesId === series.key ? 'model-chevron-open' : '']"></view>
							</view>
						</view>

						<view v-if="expandedSeriesId === series.key" class="detail-panel">
								<view class="detail-header">
									<view class="detail-cell model-detail-col">Модель</view>
									<view class="detail-cell color-col">Цвет</view>
									<view class="detail-cell quantity-col">Кол-во</view>
									<view class="detail-cell price-col">Цена</view>
								</view>

								<view v-for="group in buildGroupedItems(series.items)" :key="group.key" class="detail-group">
									<view class="detail-merged-model" hover-class="model-detail-active" @click.stop="openModelDetailModal(group)">
										<text class="detail-merged-model-text">{{ group.modelName || '-' }}</text>
									</view>
									<view class="detail-group-rows">
										<view v-for="item in group.items" :key="item.id" class="detail-row-merged">
											<view class="detail-cell color-col color-cell" hover-class="color-cell-active" @click.stop="loadInventoryItemMedia(item)">
												<view class="color-swatch-wrap">
													<view :class="['color-split-swatch', isSameColorSwatch(item) ? 'color-split-swatch-same' : '']">
														<view class="color-split-segment color-split-exterior" :style="{ backgroundColor: colorSwatch(item.color) }"></view>
														<view class="color-split-segment color-split-interior" :style="{ backgroundColor: colorSwatch(item.interiorColor) }"></view>
													</view>
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
				</view>
			</view>

			<view v-if="hasSearchKeyword && globalSearchLoading && !seriesGroups.length" class="global-search-loading">
				Поиск по всем маркам...
			</view>

			<view v-if="otherBrandSeriesMatches.length" class="cross-brand-results">
				<view class="cross-brand-heading">В других марках</view>
				<view
					v-for="seriesItem in otherBrandSeriesMatches"
					:key="`${seriesItem.brandId}-${seriesItem.id}`"
					class="cross-brand-row"
					hover-class="cross-brand-row-active"
					@click="openOtherBrandSeries(seriesItem)"
				>
					<view class="cross-brand-logo">
						<image v-if="seriesItem.logoUrl" :src="seriesItem.logoUrl" class="cross-brand-logo-image" mode="aspectFit"></image>
						<text v-else class="cross-brand-logo-text">{{ seriesItem.logoText }}</text>
					</view>
					<view class="cross-brand-copy">
						<text class="cross-brand-title">{{ seriesItem.resultName || seriesItem.seriesName }}</text>
						<text class="cross-brand-subtitle">{{ seriesItem.brandName }}</text>
					</view>
					<view class="cross-brand-arrow"></view>
				</view>
			</view>

				<view class="bottom-space"></view>
			</view>
		</scroll-view>

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
import {
	buildInventorySeriesIndex,
	getInventorySearchIndex,
	searchInventorySeries,
	setInventorySearchIndex
} from '../../common/inventorySearch.js';

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
			allItems: [],
			brandId: '',
			brandName: '',
			downloadingVideo: false,
			expandedSeriesId: '',
			globalSearchLoading: false,
			globalSeries: [],
			loading: false,
			refreshing: false,
			requestedSeriesId: '',
			searchKeyword: ''
		};
	},
	onLoad(options = {}) {
		this.brandId = decodeURIComponent(options.brandId || options.id || '');
		this.brandName = decodeURIComponent(options.brand || '');
		this.requestedSeriesId = decodeURIComponent(options.seriesId || '');
		this.searchKeyword = decodeURIComponent(options.keyword || '');
		this.globalSeries = getInventorySearchIndex().series || [];
		if (!this.globalSeries.length) this.loadGlobalSearchIndex();
		this.loadBrandItems();
	},
	computed: {
		hasSearchKeyword() {
			return Boolean(this.normalizeSearchKeyword(this.searchKeyword));
		},
		filteredItems() {
			const keyword = this.normalizeSearchKeyword(this.searchKeyword);
			return this.allItems.filter((item) => !keyword || this.normalizeSearchKeyword(item.searchText).includes(keyword));
		},
		seriesGroups() {
			return this.buildSeriesGroups(this.filteredItems, this.brandId);
		},
		otherBrandSeriesMatches() {
			const keyword = this.normalizeSearchKeyword(this.searchKeyword);
			if (keyword.length < 2) return [];
			return searchInventorySeries(this.globalSeries, this.searchKeyword, {
				excludeBrandId: this.brandId,
				limit: 5
			});
		},
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
		async loadGlobalSearchIndex() {
			if (this.globalSearchLoading) return;
			this.globalSearchLoading = true;
			try {
				const [modelsRes, sourceItemsRes, brandsRes] = await Promise.all([
					request({ url: '/pricing-inventory/models', method: 'GET' }),
					request({ url: '/pricing-inventory/source-items', method: 'GET' }),
					request({ url: '/car-brands', method: 'GET' })
				]);
				const modelsData = modelsRes?.data || modelsRes || {};
				const sourceItemsData = sourceItemsRes?.data || sourceItemsRes || {};
				const brandsData = brandsRes?.data || brandsRes || {};
				this.globalSeries = buildInventorySeriesIndex({
					brands: Array.isArray(brandsData.brands) ? brandsData.brands : [],
					models: Array.isArray(modelsData.items) ? modelsData.items : [],
					sourceItems: Array.isArray(sourceItemsData.items) ? sourceItemsData.items : []
				});
				const cachedIndex = getInventorySearchIndex();
				setInventorySearchIndex({ brands: cachedIndex.brands, series: this.globalSeries });
			} catch (error) {
				console.error('load cross-brand inventory search index failed', error);
				this.globalSeries = [];
			} finally {
				this.globalSearchLoading = false;
			}
		},
		async loadBrandItems() {
			if (!this.brandId) {
				this.allItems = [];
				this.refreshing = false;
				return;
			}

			this.loading = true;
			try {
				const res = await request({
					url: `/pricing-inventory/brands/${encodeURIComponent(this.brandId)}/items`
				});
				const data = res?.data || res || {};
				const list = Array.isArray(data.items) ? data.items : [];
				this.allItems = list
					.map((item) => {
						const mapped = {
							arrivalDateText: this.resolveArrivalDateText(item),
							carId: this.resolveCarId(item),
							color: this.resolveColor(item),
							interiorColor: this.resolveInteriorColor(item),
							id: this.stringifyValue(item.id),
							modelName: this.stringifyValue(item.itemName || item.itemNameCn || item.modelName),
							seriesId: this.stringifyValue(item.modelId),
							seriesName: this.stringifyValue(item.modelName || item.modelNameCn) || '-',
							price: item.price,
							quantity: Number(item.quantity || 0),
							inStock: Number(item.inStockQuantity || 0),
							searchText: `${item.modelName || ''} ${item.modelNameCn || ''} ${item.itemName || ''} ${item.itemNameCn || ''} ${item.color || ''} ${item.interiorColor || ''}`
						};
						return {
							...mapped,
							isInTransit: item.status === 0
						};
					})
					.filter((item) => item.quantity > 0);
				const seriesGroups = this.buildSeriesGroups(this.allItems, this.brandId);
				const requestedSeries = seriesGroups.find((series) => series.seriesId === this.requestedSeriesId);
				this.expandedSeriesId = requestedSeries?.key || seriesGroups[0]?.key || '';
			} catch (error) {
				console.error('load pricing inventory brand items failed', error);
				this.allItems = [];
			} finally {
				this.loading = false;
				this.refreshing = false;
			}
		},
		refreshInventory() {
			this.refreshing = true;
			this.expandedSeriesId = '';
			this.loadBrandItems();
		},
		clearSearch() {
			this.searchKeyword = '';
			this.expandedSeriesId = '';
		},
		openOtherBrandSeries(seriesItem) {
			if (!seriesItem?.brandId || !seriesItem?.id) return;
			const keyword = this.stringifyValue(this.searchKeyword).trim();
			const keywordQuery = keyword ? `&keyword=${encodeURIComponent(keyword)}` : '';
			uni.redirectTo({
				url: `/pages/inventoryBrand/inventoryBrand?brandId=${encodeURIComponent(seriesItem.brandId)}&brand=${encodeURIComponent(seriesItem.brandName)}&seriesId=${encodeURIComponent(seriesItem.id)}${keywordQuery}`
			});
		},
		normalizeSearchKeyword(value = '') {
			return this.stringifyValue(value).trim().toLowerCase().replace(/[\s_‐‑‒–—-]+/g, '');
		},
		toggleSeries(series) {
			if (!series || !series.key) {
				return;
			}
			this.expandedSeriesId = this.expandedSeriesId === series.key ? '' : series.key;
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
		resolveInteriorColor(item = {}) {
			const payload = item.payload || {};
			return this.stringifyValue(
				item.interiorColor ||
					item.interior_color ||
					item.interior ||
					item.trimColor ||
					item.trim_color ||
					item.car?.interiorColor ||
					item.car?.interior_color ||
					item.car?.interior ||
					this.getPayloadValue(payload, [
						'内饰颜色',
						'内饰色',
						'内饰',
						'座椅颜色',
						'Салон',
						'Цвет салона',
						'Цвет интерьера',
						'interiorColor',
						'interior_color',
						'interior'
					])
			);
		},
		resolveArrivalDateText(item = {}) {
			const payload = item.payload || {};
			return this.stringifyValue(
				item.arrivalDateText ||
					item.arrival_date_text ||
					item.arrivalDate ||
					item.arrival_date ||
					this.getPayloadValue(payload, ['arrivalDateText', 'arrival_date_text', 'arrivalDate', 'arrival_date'])
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
			const quantity = Number(item.quantity || 0);
			if (Number.isNaN(quantity)) {
				return '-';
			}
			const quantityText = String(quantity);
			if (!item.isInTransit) {
				return quantityText;
			}
			const arrivalDateText = this.stringifyValue(item.arrivalDateText).trim();
			return arrivalDateText ? `${quantityText}（${arrivalDateText}）` : `${quantityText}（В пути）`;
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
			if (/(紫|фиолет|сирен|пурпур|purple|violet|lilac)/i.test(lower)) return '#7e57c2';
			if (/(绿|зелен|green)/i.test(lower)) return '#2e9d62';
			if (/(黄|желт|yellow|金|gold)/i.test(lower)) return '#e2b33c';
			if (/(橙|оранж|orange)/i.test(lower)) return '#ff7a00';
			if (/(棕|корич|brown)/i.test(lower)) return '#8a5a36';
			if (/(米|米色|беж|beige|cream|крем)/i.test(lower)) return '#d8c1a3';
			return '#d8dbe0';
		},
		isSameColorSwatch(item = {}) {
			const exteriorText = this.stringifyValue(item.color).trim();
			const interiorText = this.stringifyValue(item.interiorColor).trim();
			if (!exteriorText || !interiorText) {
				return false;
			}
			return this.colorSwatch(exteriorText).toLowerCase() === this.colorSwatch(interiorText).toLowerCase();
		},
		buildSeriesGroups(items = [], brandId = '') {
			const groups = [];
			const groupById = new Map();
			for (const item of items || []) {
				const seriesId = this.stringifyValue(item?.seriesId || item?.seriesName) || 'unknown';
				if (!groupById.has(seriesId)) {
					const group = {
						items: [],
						key: `${brandId || 'brand'}::${seriesId}`,
						seriesId,
						seriesName: this.stringifyValue(item?.seriesName) || '-'
					};
					groupById.set(seriesId, group);
					groups.push(group);
				}
				groupById.get(seriesId).items.push(item);
			}
			return groups;
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
.page-shell,
.page {
	height: 100vh;
	background: $page-bg;
	overflow: hidden;
}

.page-shell {
	position: relative;
}

.content {
	padding: 12rpx 8rpx 24rpx;
	box-sizing: border-box;
}

.brand-head {
	display: flex;
	align-items: flex-end;
	justify-content: space-between;
	gap: 20rpx;
	padding: 12rpx 18rpx 20rpx;
}

.brand-title {
	font-size: 36rpx;
	font-weight: 800;
	line-height: 1.2;
	color: #5f360f;
}

.brand-subtitle {
	flex: 0 0 auto;
	font-size: 22rpx;
	color: #b08a63;
}

.search-bar {
	display: flex;
	align-items: center;
	margin: 0 18rpx 24rpx;
	height: 82rpx;
	box-sizing: border-box;
	background: #fff;
	border: 1rpx solid #efd2b5;
	border-radius: 16rpx;
	padding: 0 22rpx;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
}

.search-icon {
	position: relative;
	width: 28rpx;
	height: 28rpx;
	border: 4rpx solid #b9b9b9;
	border-radius: 50%;
	box-sizing: border-box;
	margin-right: 16rpx;
	flex: 0 0 auto;
}

.search-icon::after {
	content: '';
	position: absolute;
	width: 13rpx;
	height: 4rpx;
	border-radius: 4rpx;
	background: #b9b9b9;
	right: -10rpx;
	bottom: -5rpx;
	transform: rotate(45deg);
}

.search-input {
	flex: 1;
	min-width: 0;
	height: 82rpx;
	font-size: 26rpx;
	color: #333;
}

.search-clear {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	flex: 0 0 auto;
	width: 56rpx;
	height: 56rpx;
}

.search-clear-icon {
	position: relative;
	width: 34rpx;
	height: 34rpx;
	border-radius: 50%;
	background: #fff0e3;
}

.search-clear-icon::before,
.search-clear-icon::after {
	content: '';
	position: absolute;
	left: 9rpx;
	top: 16rpx;
	width: 16rpx;
	height: 2rpx;
	border-radius: 2rpx;
	background: #ff6b00;
}

.search-clear-icon::before {
	transform: rotate(45deg);
}

.search-clear-icon::after {
	transform: rotate(-45deg);
}

.global-search-loading {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 120rpx;
	font-size: 24rpx;
	color: #999;
}

.cross-brand-results {
	width: 100%;
	box-sizing: border-box;
	margin-top: 16rpx;
	background: #fff;
	border-top: 1rpx solid #f3dfcc;
	border-bottom: 1rpx solid #f3dfcc;
}

.cross-brand-heading {
	display: flex;
	align-items: center;
	height: 54rpx;
	box-sizing: border-box;
	padding: 0 24rpx;
	background: #fff8ef;
	border-bottom: 1rpx solid rgba(255, 107, 0, 0.2);
	font-size: 22rpx;
	font-weight: 700;
	color: #85501f;
}

.cross-brand-row {
	display: flex;
	align-items: center;
	min-height: 104rpx;
	box-sizing: border-box;
	padding: 14rpx 24rpx;
	gap: 18rpx;
	background: #fff;
	border-bottom: 1rpx solid rgba(255, 107, 0, 0.2);
}

.cross-brand-row:last-child {
	border-bottom: 0;
}

.cross-brand-row-active {
	background: #fff5ea;
}

.cross-brand-logo {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 62rpx;
	height: 62rpx;
	flex: 0 0 auto;
}

.cross-brand-logo-image {
	display: block;
	width: 56rpx;
	height: 56rpx;
}

.cross-brand-logo-text {
	font-size: 18rpx;
	font-weight: 800;
	color: #ff6b00;
}

.cross-brand-copy {
	display: flex;
	flex: 1;
	min-width: 0;
	flex-direction: column;
	gap: 5rpx;
}

.cross-brand-title,
.cross-brand-subtitle {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cross-brand-title {
	font-size: 27rpx;
	font-weight: 700;
	line-height: 1.25;
	color: #5f360f;
}

.cross-brand-subtitle {
	font-size: 21rpx;
	line-height: 1.2;
	color: #999;
}

.cross-brand-arrow {
	width: 13rpx;
	height: 13rpx;
	flex: 0 0 auto;
	border: solid #dc711b;
	border-width: 3rpx 3rpx 0 0;
	transform: rotate(45deg);
	margin-right: 8rpx;
	box-sizing: border-box;
}

.inventory-sheet {
	width: 100%;
	background: #fff;
	border: 1rpx solid #f3dfcc;
	box-sizing: border-box;
}

.series-row {
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
	min-height: 180rpx;
}

.brand-group {
	border-bottom: 1rpx solid #f3dfcc;
}

.brand-row {
	min-height: 86rpx;
	background: #fff;
}

.brand-row-open {
	background: #fffaf4;
}

.brand-row-active {
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

.series-panel {
	background: #fffaf4;
	border-top: 1rpx solid #f3dfcc;
}

.series-group {
	border-bottom: 1rpx solid #f3dfcc;
}

.series-group-open {
	border-bottom: 12rpx solid #eceff2;
}

.series-group:last-child {
	border-bottom: 0;
}

.series-row {
	min-height: 74rpx;
	background: #fff;
	transition: background-color 0.16s ease, box-shadow 0.16s ease;
}

.series-row-active {
	background: #fff8f0;
}

.series-row-open,
.series-row-open.series-row-active {
	background: #ff6b00;
	box-shadow: none;
}

.series-name {
	display: flex;
	align-items: center;
	gap: 10rpx;
	box-sizing: border-box;
	padding: 10rpx 10rpx 10rpx 30rpx;
	font-size: 25rpx;
	font-weight: 600;
	line-height: 1.28;
	color: #6f4317;
}

.series-accent {
	width: 4rpx;
	height: 30rpx;
	border-radius: 4rpx;
	background: #f0a04b;
	flex: 0 0 auto;
}

.series-row-open .series-accent {
	width: 5rpx;
	height: 34rpx;
	border-radius: 5rpx;
	background: rgba(255, 255, 255, 0.92);
}

.series-title {
	flex: 1;
	word-break: break-word;
}

.series-row-open .series-title {
	color: #fff;
	font-weight: 800;
}

.model-chevron {
	width: 14rpx;
	height: 14rpx;
	border: solid #d56a16;
	border-width: 0 3rpx 3rpx 0;
	border-radius: 1rpx;
	transform: rotate(45deg);
	transition: transform 0.18s ease, border-color 0.18s ease;
	margin: 0 10rpx 7rpx 4rpx;
	flex: 0 0 auto;
	box-sizing: border-box;
}

.model-chevron-open {
	transform: rotate(225deg);
	border-color: #fff;
	margin-top: 8rpx;
	margin-bottom: 0;
}

.detail-panel {
	background: #fffaf4;
	border-top: 1rpx solid #f3dfcc;
}

.detail-header {
	display: grid;
	grid-template-columns: 1fr 112rpx 146rpx 144rpx;
}

.detail-group {
	display: grid;
	grid-template-columns: 1fr 402rpx;
	background: #fff;
}

.detail-group-rows {
	display: flex;
	flex-direction: column;
}

.detail-row-merged {
	display: grid;
	grid-template-columns: 112rpx 146rpx 144rpx;
}

.quantity-value {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	max-width: 100%;
	font-size: 26rpx;
	font-weight: 700;
	color: #ff6b00;
	line-height: 1.15;
	white-space: nowrap;
	word-break: keep-all;
}

.in-transit {
	color: #a66a22;
	font-size: 22rpx;
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
	padding-left: 8rpx;
}

.detail-group-rows .color-cell {
	align-items: center;
	justify-content: center;
	padding: 4rpx;
}

.color-cell-active {
	background: #fff3e5;
}

.color-swatch-wrap {
	position: relative;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 76rpx;
	height: 42rpx;
	transition: transform 0.16s ease;
}

.color-cell-active .color-swatch-wrap {
	transform: scale(0.94);
}

.color-split-swatch {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 64rpx;
	height: 34rpx;
	border-radius: 8rpx;
	border: 1rpx solid #d7c5ad;
	overflow: hidden;
	box-sizing: border-box;
}

.color-split-segment {
	flex: 1;
	height: 100%;
	min-width: 0;
	box-sizing: border-box;
}

.color-split-interior {
	border-left: 1rpx solid rgba(122, 74, 24, 0.24);
}

.color-split-swatch-same .color-split-interior {
	border-left: 2rpx solid rgba(255, 107, 0, 0.58);
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
	padding-right: 8rpx;
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
	width: 100%;
	background: #fff;
	border-radius: 24rpx 24rpx 0 0;
	padding: 24rpx 24rpx calc(18rpx + env(safe-area-inset-bottom));
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

.bottom-space {
	height: 24rpx;
}
</style>
