<template>
	<view class="page">
		<scroll-view class="excel-scroll" scroll-x enhanced show-scrollbar>
			<view class="excel-sheet">
				<view class="excel-row header-row">
					<view class="head-cell model-col">Модель</view>
					<view class="head-cell color-col">Цвет</view>
					<view class="head-cell stock-col">Кол-во</view>
					<view class="head-cell usd-col">Цена</view>
				</view>

				<scroll-view class="sheet-body-scroll" scroll-y enhanced show-scrollbar>
					<view class="sheet-body">
						<template v-for="(row, index) in paddedRows" :key="index">
							<view v-if="row.modelSpan" class="body-cell model-col model-cell" :style="cellStyle(index, 1, row.modelSpan)">
								{{ row.model }}
							</view>
							<view class="body-cell color-col" :style="cellStyle(index, 2)">{{ row.color }}</view>
							<view class="body-cell stock-col stock-cell" :style="cellStyle(index, 3)">{{ row.stock }}</view>
							<view class="body-cell usd-col usd-cell" :style="cellStyle(index, 4)">{{ row.usd }}</view>
						</template>
					</view>
				</scroll-view>
			</view>
		</scroll-view>
	</view>
</template>

<script>
import { request } from '../../common/request.js';

export default {
	data() {
		return {
			minVisibleRows: 14,
			rows: []
		};
	},
	onLoad() {
		this.calculateMinVisibleRows();
		this.loadInventory();
	},
	computed: {
		displayRows() {
			return this.rows.map((row, index) => {
				const previousModel = index > 0 ? this.rows[index - 1].model : '';
				if (row.model === previousModel) {
					return {
						...row,
						modelSpan: 0
					};
				}

				let modelSpan = 1;
				for (let i = index + 1; i < this.rows.length; i += 1) {
					if (this.rows[i].model !== row.model) {
						break;
					}
					modelSpan += 1;
				}

				return {
					...row,
					modelSpan
				};
			});
		},
		paddedRows() {
			const rows = [...this.displayRows];
			const placeholderCount = Math.max(this.minVisibleRows - rows.length, 0);
			for (let i = 0; i < placeholderCount; i += 1) {
				rows.push({
					model: '',
					modelSpan: 1,
					color: '',
					stock: '',
					usd: '',
					isPlaceholder: true
				});
			}
			return rows;
		}
	},
	methods: {
		async loadInventory() {
			try {
				const res = await request({
					url: '/inventory'
				});
				const list = Array.isArray(res?.data) ? res.data : [];
				this.rows = list
					.filter((item, index) => !this.isHeaderRow(item, index))
					.map((item) => this.normalizeRow(item));
			} catch (error) {
				console.error('load inventory failed', error);
				this.rows = [];
			}
		},
		normalizeRow(item = {}) {
			return {
				model: this.stringifyValue(item.model),
				color: this.stringifyValue(item.color),
				stock: this.stringifyValue(item.stock),
				usd: this.formatPrice(item.usd)
			};
		},
		isHeaderRow(item = {}, index = 0) {
			if (index !== 0) {
				return false;
			}
			return item.model === '车型' || item.color === '颜色/Цвет' || item.stock === '剩余数量';
		},
		stringifyValue(value) {
			if (value === undefined || value === null || value === '') {
				return '';
			}
			return String(value);
		},
		formatPrice(value) {
			if (value === undefined || value === null || value === '') {
				return '';
			}
			if (typeof value === 'string' && value.includes('$')) {
				return value;
			}
			const normalized = Number(value);
			if (Number.isNaN(normalized)) {
				return String(value);
			}
			return `$${normalized.toLocaleString('en-US')}`;
		},
		calculateMinVisibleRows() {
			const { windowHeight = 667, windowWidth = 375 } = uni.getSystemInfoSync();
			const pxPerRpx = windowWidth / 750;
			const verticalPadding = (12 + 24) * pxPerRpx;
			const headerHeight = 74 * pxPerRpx;
			const rowHeight = 72 * pxPerRpx;
			const availableHeight = Math.max(windowHeight - verticalPadding - headerHeight, rowHeight * 14);
			this.minVisibleRows = Math.max(Math.ceil(availableHeight / rowHeight), 14);
		},
		cellStyle(rowIndex, column, span = 1) {
			return {
				gridColumn: String(column),
				gridRow: `${rowIndex + 1} / span ${span}`
			};
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

.excel-scroll {
	width: 100%;
	white-space: nowrap;
}

.excel-sheet {
	width: 716rpx;
	background: #fff;
	border: 1rpx solid #f3dfcc;
}

.excel-row {
	display: flex;
	align-items: stretch;
}

.head-cell,
.body-cell {
	display: flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
	border-right: 1rpx solid #f3dfcc;
	border-bottom: 1rpx solid #f3dfcc;
	text-align: center;
	padding: 0 8rpx;
	white-space: pre-line;
	word-break: break-word;
}

.head-cell {
	height: 74rpx;
	font-size: 27rpx;
	font-weight: 700;
	color: #fff;
	background: linear-gradient(180deg, #ff9a00 0%, #ff6b00 100%);
}

.body-cell {
	font-size: 24rpx;
	color: #2b2b2b;
	background: #fff;
}

.sheet-body {
	display: grid;
	grid-template-columns: 176rpx 156rpx 126rpx 258rpx;
	grid-auto-rows: 72rpx;
}

.sheet-body-scroll {
	height: calc(100vh - 36rpx - 74rpx);
}

.model-col {
	width: 176rpx;
	min-width: 176rpx;
}

.color-col {
	width: 156rpx;
	min-width: 156rpx;
}

.stock-col {
	width: 126rpx;
	min-width: 126rpx;
}

.usd-col {
	width: 258rpx;
	min-width: 258rpx;
}

.model-cell {
	font-size: 25rpx;
	line-height: 1.28;
	padding: 6rpx 10rpx;
	background: #fff;
	color: #7a4a18;
}

.stock-cell {
	background: #fff;
}

.usd-cell {
	font-size: 34rpx;
	font-family: Georgia, 'Times New Roman', serif;
	color: #ff6b00;
}
</style>
