<template>
	<view class="page-wrap">
		<scroll-view class="page" scroll-y refresher-enabled :refresher-triggered="refreshing" @refresherrefresh="refreshInventory">
			<view class="content">
				<view class="search-bar">
					<view class="search-icon"></view>
					<input v-model="searchKeyword" class="search-input" placeholder="Поиск марки или модели" confirm-type="search" />
					<view v-if="searchKeyword" class="search-clear" role="button" aria-label="Очистить поиск" @click="clearSearch">
						<view class="search-clear-icon"></view>
					</view>
				</view>

				<view class="inventory-sheet">
					<view v-if="loading && !brands.length" class="empty-state">Загрузка...</view>
					<view v-else-if="!brandSections.length && !filteredSeries.length" class="empty-state">
						{{ hasSearchKeyword ? 'Ничего не найдено' : 'Нет данных' }}
					</view>

					<view v-if="hasSearchKeyword && filteredBrands.length" class="search-section-title">Марки</view>
					<view v-for="section in brandSections" :key="section.initial" class="brand-section">
						<view v-for="brand in section.brands" :key="brand.id" class="brand-group">
							<view class="brand-row" hover-class="brand-row-active" @click="openBrand(brand)">
								<view class="brand-name">
									<view class="brand-logo">
										<image v-if="brand.logoUrl" :src="brand.logoUrl" class="brand-logo-img" mode="aspectFit"></image>
										<text v-else class="brand-logo-fallback">{{ brand.logoText }}</text>
									</view>
									<text class="brand-title">{{ brand.brandName }}</text>
									<text class="brand-arrow">›</text>
								</view>
							</view>
						</view>
					</view>

					<view v-if="hasSearchKeyword && filteredSeries.length" class="series-result-section">
						<view class="search-section-title">Модельный ряд</view>
						<view
							v-for="seriesItem in filteredSeries"
							:key="seriesItem.id"
							class="series-result-row"
							hover-class="series-result-row-active"
							@click="openSeries(seriesItem)"
						>
							<view class="series-result-logo">
								<image v-if="seriesItem.logoUrl" :src="seriesItem.logoUrl" class="series-result-logo-img" mode="aspectFit"></image>
								<text v-else class="brand-logo-fallback">{{ seriesItem.logoText }}</text>
							</view>
							<view class="series-result-copy">
								<text class="series-result-title">{{ seriesItem.resultName || seriesItem.seriesName }}</text>
								<text class="series-result-brand">{{ seriesItem.brandName }}</text>
							</view>
							<text class="brand-arrow">›</text>
						</view>
					</view>
				</view>

				<view class="bottom-space"></view>
			</view>
		</scroll-view>
	</view>
</template>

<script>
import { request } from '../../common/request.js';
import { setInventorySearchIndex } from '../../common/inventorySearch.js';

export default {
	data() {
		return {
			brands: [],
			loading: false,
			refreshing: false,
			resetSearchOnReturn: false,
			searchKeyword: '',
			series: []
		};
	},
	onLoad() {
		this.loadBrands();
	},
	onShow() {
		if (!this.resetSearchOnReturn) return;
		this.resetSearchOnReturn = false;
		this.clearSearch();
	},
	computed: {
		hasSearchKeyword() {
			return Boolean(this.normalizeSearchKeyword(this.searchKeyword));
		},
		filteredBrands() {
			const keyword = this.normalizeSearchKeyword(this.searchKeyword);
			return this.brands.filter((brand) => !keyword || this.normalizeSearchKeyword(brand.searchText).includes(keyword));
		},
		brandSections() {
			return this.filteredBrands.length ? [{ initial: 'all', brands: this.filteredBrands }] : [];
		},
		filteredSeries() {
			const keyword = this.normalizeSearchKeyword(this.searchKeyword);
			if (!keyword) return [];
			return this.series.reduce((matches, seriesItem) => {
				if (!this.normalizeSearchKeyword(seriesItem.searchText).includes(keyword)) return matches;
				const directMatch = this.normalizeSearchKeyword(seriesItem.seriesName).includes(keyword);
				const matchingAlias = directMatch
					? ''
					: seriesItem.aliases.find((alias) => this.normalizeSearchKeyword(alias).includes(keyword)) || '';
				matches.push({
					...seriesItem,
					detailKeyword: matchingAlias ? this.stringifyValue(this.searchKeyword).trim() : '',
					resultName: matchingAlias ? this.compactSeriesAlias(matchingAlias) : seriesItem.seriesName
				});
				return matches;
			}, []);
		}
	},
	methods: {
		async loadBrands() {
			this.loading = true;
			try {
				const [res, taxonomyRes, modelsRes, sourceItemsRes] = await Promise.all([
					request({ url: '/pricing-inventory/brand-index' }),
					request({ url: '/car-brands', method: 'GET' }).catch((error) => {
						console.warn('load car brand sort orders failed', error);
						return null;
					}),
					request({ url: '/pricing-inventory/models', method: 'GET' }).catch((error) => {
						console.warn('load pricing inventory series failed', error);
						return null;
					}),
					request({ url: '/pricing-inventory/source-items', method: 'GET' }).catch((error) => {
						console.warn('load pricing inventory search aliases failed', error);
						return null;
					})
				]);
				const data = res?.data || res || {};
				const groups = Array.isArray(data.groups) ? data.groups : [];
				const taxonomyData = taxonomyRes?.data || taxonomyRes || {};
				const taxonomyBrands = Array.isArray(taxonomyData.brands) ? taxonomyData.brands : [];
				const sortOrderById = new Map(
					taxonomyBrands.map((brand) => [this.stringifyValue(brand.id), Number(brand.sortOrder || 0)])
				);
				this.brands = groups.flatMap((group) =>
					(Array.isArray(group.brands) ? group.brands : []).map((brand) =>
						this.normalizeBrand(brand, group.initial, sortOrderById.get(this.stringifyValue(brand.id)))
					)
				).sort((left, right) => right.sortOrder - left.sortOrder);
				const brandById = new Map(this.brands.map((brand) => [brand.id, brand]));
				const modelsData = modelsRes?.data || modelsRes || {};
				const models = Array.isArray(modelsData.items) ? modelsData.items : [];
				const sourceItemsData = sourceItemsRes?.data || sourceItemsRes || {};
				const sourceItems = Array.isArray(sourceItemsData.items) ? sourceItemsData.items : [];
				const aliasesByModelId = this.buildSeriesAliases(sourceItems);
				this.series = models
					.filter((model) => Number(model.stockCount || 0) > 0)
					.map((model) => this.normalizeSeries(model, brandById, aliasesByModelId));
				setInventorySearchIndex({ brands: this.brands, series: this.series });
			} catch (error) {
				console.error('load pricing inventory brands failed', error);
				this.brands = [];
				this.series = [];
			} finally {
				this.loading = false;
				this.refreshing = false;
			}
		},
		normalizeBrand(brand = {}, sectionInitial = '', taxonomySortOrder) {
			const brandName = this.stringifyValue(brand.name || brand.displayName || brand.nameCn) || '-';
			const initial = this.stringifyValue(brand.initial || sectionInitial || brandName.slice(0, 1)).toUpperCase();
			return {
				brandName,
				id: this.stringifyValue(brand.id),
				initial: initial || '#',
				logoText: this.brandLogoText(brandName),
				logoUrl: this.resolveLogoUrl(brand.logoUrl),
				searchText: `${brandName} ${brand.name || ''} ${brand.nameCn || ''} ${brand.displayName || ''}`,
				sortOrder: Number(brand.sortOrder ?? taxonomySortOrder ?? 0),
				stockCount: Number(brand.stockCount || 0)
			};
		},
		buildSeriesAliases(sourceItems = []) {
			const aliasesByModelId = new Map();
			for (const item of sourceItems) {
				const modelId = this.stringifyValue(item.modelId);
				if (!modelId) continue;
				const aliases = aliasesByModelId.get(modelId) || [];
				for (const value of [item.itemName, item.itemNameCn]) {
					const alias = this.stringifyValue(value).trim();
					if (alias && !aliases.includes(alias)) aliases.push(alias);
				}
				aliasesByModelId.set(modelId, aliases);
			}
			return aliasesByModelId;
		},
		normalizeSeries(model = {}, brandById = new Map(), aliasesByModelId = new Map()) {
			const brandId = this.stringifyValue(model.brandId);
			const brand = brandById.get(brandId) || {};
			const modelId = this.stringifyValue(model.id);
			const seriesName = this.stringifyValue(model.modelName || model.modelNameCn) || '-';
			const aliases = aliasesByModelId.get(modelId) || [];
			return {
				aliases,
				brandId,
				brandName: brand.brandName || '',
				id: modelId,
				logoText: brand.logoText || this.brandLogoText(brand.brandName || seriesName),
				logoUrl: brand.logoUrl || '',
				searchText: `${seriesName} ${model.modelName || ''} ${model.modelNameCn || ''} ${aliases.join(' ')}`,
				seriesName,
				stockCount: Number(model.stockCount || 0)
			};
		},
		compactSeriesAlias(value = '') {
			const text = this.stringifyValue(value).replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
			return text
				.replace(/\s*[（(]\s*\d+(?:[.,]\d+)?\s*[）)].*$/, '')
				.replace(/\s+20\d{2}\/.*$/, '')
				.trim() || text;
		},
		normalizeSearchKeyword(value = '') {
			return this.stringifyValue(value).trim().toLowerCase().replace(/[\s_&'’‘‐‑‒–—-]+/g, '');
		},
		resolveLogoUrl(value) {
			const url = this.stringifyValue(value).trim();
			if (!url || /^https?:\/\//i.test(url)) return url;
			const base = getApp()?.globalData?.baseImgUrl || '';
			if (!base) return url;
			return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
		},
		brandLogoText(brandName = '') {
			const words = this.stringifyValue(brandName).trim().split(/\s+/).filter(Boolean);
			if (!words.length) return '?';
			return words.length > 1 ? words.map((word) => word.slice(0, 1)).join('').slice(0, 3).toUpperCase() : words[0].slice(0, 3).toUpperCase();
		},
		stringifyValue(value) {
			if (value === undefined || value === null || value === '') return '';
			return String(value);
		},
		clearSearch() {
			this.searchKeyword = '';
		},
		refreshInventory() {
			this.refreshing = true;
			this.loadBrands();
		},
		openBrand(brand) {
			if (!brand?.id) return;
			this.resetSearchOnReturn = true;
			uni.navigateTo({
				url: `/pages/inventoryBrand/inventoryBrand?brandId=${encodeURIComponent(brand.id)}&brand=${encodeURIComponent(brand.brandName)}`,
				fail: () => {
					this.resetSearchOnReturn = false;
				}
			});
		},
		openSeries(seriesItem) {
			if (!seriesItem?.brandId || !seriesItem?.id) return;
			const keyword = seriesItem.detailKeyword
				? `&keyword=${encodeURIComponent(seriesItem.detailKeyword)}`
				: '';
			this.resetSearchOnReturn = true;
			uni.navigateTo({
				url: `/pages/inventoryBrand/inventoryBrand?brandId=${encodeURIComponent(seriesItem.brandId)}&brand=${encodeURIComponent(seriesItem.brandName)}&seriesId=${encodeURIComponent(seriesItem.id)}${keyword}`,
				fail: () => {
					this.resetSearchOnReturn = false;
				}
			});
		}
	}
};
</script>

<style lang="scss" scoped>
.page-wrap,
.page {
	height: 100vh;
	background: $page-bg;
	overflow: hidden;
}

.content {
	padding: 12rpx 8rpx 24rpx;
	box-sizing: border-box;
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

.inventory-sheet,
.brand-section {
	width: 100%;
	background: #fff;
	box-sizing: border-box;
}

.brand-group {
	border-bottom: 1rpx solid rgba(255, 107, 0, 0.24);
}

.brand-row {
	display: grid;
	grid-template-columns: 1fr;
	min-height: 116rpx;
	background: #fff;
}

.brand-row-active {
	background: #fff3e5;
}

.brand-name {
	display: flex;
	align-items: center;
	justify-content: flex-start;
	gap: 22rpx;
	box-sizing: border-box;
	padding: 20rpx 26rpx;
	font-size: 32rpx;
	line-height: 1.28;
	color: #5f360f;
	font-weight: 700;
}

.brand-logo {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 76rpx;
	height: 76rpx;
	border-radius: 50%;
	background: #fff;
	color: #ff6b00;
	font-size: 20rpx;
	font-weight: 900;
	line-height: 1;
	flex: 0 0 auto;
	box-sizing: border-box;
}

.brand-logo-img {
	width: 64rpx;
	height: 64rpx;
	display: block;
}

.brand-logo-fallback {
	font-size: 20rpx;
	font-weight: 900;
	color: #ff6b00;
	line-height: 1;
}

.brand-title {
	flex: 1;
	min-width: 0;
	word-break: break-word;
}

.brand-arrow {
	flex: 0 0 auto;
	font-size: 42rpx;
	font-weight: 400;
	color: #ff8b26;
	line-height: 1;
}

.search-section-title {
	display: flex;
	align-items: center;
	height: 56rpx;
	box-sizing: border-box;
	padding: 0 26rpx;
	background: #fff8ef;
	border-bottom: 1rpx solid rgba(255, 107, 0, 0.2);
	font-size: 23rpx;
	font-weight: 700;
	color: #85501f;
}

.series-result-row {
	display: flex;
	align-items: center;
	min-height: 108rpx;
	box-sizing: border-box;
	padding: 16rpx 26rpx;
	gap: 22rpx;
	background: #fff;
	border-bottom: 1rpx solid rgba(255, 107, 0, 0.24);
}

.series-result-row-active {
	background: #fff3e5;
}

.series-result-logo {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 76rpx;
	height: 64rpx;
	flex: 0 0 auto;
}

.series-result-logo-img {
	display: block;
	width: 58rpx;
	height: 58rpx;
}

.series-result-copy {
	display: flex;
	flex: 1;
	min-width: 0;
	flex-direction: column;
	justify-content: center;
	gap: 5rpx;
}

.series-result-title,
.series-result-brand {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.series-result-title {
	font-size: 29rpx;
	line-height: 1.25;
	font-weight: 700;
	color: #5f360f;
}

.series-result-brand {
	font-size: 22rpx;
	line-height: 1.2;
	color: #999;
}

.empty-state {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 240rpx;
	color: #999;
	font-size: 26rpx;
}

.bottom-space {
	height: 24rpx;
}
</style>
