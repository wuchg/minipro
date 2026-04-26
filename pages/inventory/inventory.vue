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
							<view class="detail-merged-model">
								<text class="detail-merged-model-text">{{ group.modelName || '-' }}</text>
							</view>
							<view class="detail-group-rows">
								<view v-for="item in group.items" :key="item.id" class="detail-row-merged">
									<view class="detail-cell color-col">{{ item.color || '-' }}</view>
									<view class="detail-cell quantity-col">{{ item.quantity }}</view>
									<view class="detail-cell price-col price-cell">{{ formatPrice(item.price) }}</view>
								</view>
							</view>
						</view>
					</view>
				</view>
			</scroll-view>
		</view>
	</view>
</template>

<script>
import { request } from '../../common/request.js';

export default {
	data() {
		return {
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
					list.map((item) => ({
						color: this.resolveColor(item),
						id: this.stringifyValue(item.id),
						modelName: this.stringifyValue(item.modelName),
						price: item.price,
						quantity: Number(item.quantity || 0)
					}))
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

<style scoped>
.page {
	min-height: 100vh;
	background: #ffffff;
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
	grid-template-columns: 1fr 148rpx 108rpx 132rpx;
}

.detail-group {
	display: grid;
	grid-template-columns: 1fr 388rpx;
	background: #fff;
}

.detail-group-rows {
	display: flex;
	flex-direction: column;
}

.detail-row-merged {
	display: grid;
	grid-template-columns: 148rpx 108rpx 132rpx;
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
	min-height: 58rpx;
	font-size: 22rpx;
	font-weight: 700;
	color: #7a4a18;
	background: #fff1df;
}



.price-cell {
	font-size: 30rpx;
	font-family: Georgia, 'Times New Roman', serif;
	color: #ff6b00;
	white-space: nowrap;
	word-break: keep-all;
}


.detail-group-rows .color-col,
.detail-header .model-detail-col,
.detail-header .color-col {
	justify-content: flex-start;
	text-align: left;
	padding-left: 12rpx;
}

.detail-group-rows .price-col,
.detail-header .price-col {
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
</style>
