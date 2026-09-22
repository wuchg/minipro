import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {
	getInventorySearchIndex,
	searchInventorySeries,
	setInventorySearchIndex
} from '../common/inventorySearch.js';

const brandSource = fs.readFileSync(new URL('../pages/inventory/inventory.vue', import.meta.url), 'utf8');
const detailSource = fs.readFileSync(new URL('../pages/inventoryBrand/inventoryBrand.vue', import.meta.url), 'utf8');
const pagesJson = JSON.parse(fs.readFileSync(new URL('../pages.json', import.meta.url), 'utf8'));

assert.match(brandSource, /url:\s*'\/pricing-inventory\/brand-index'/, 'inventory tab should load the brand index');
assert.match(brandSource, /url:\s*'\/car-brands'/, 'inventory tab should load deployed brand sort orders');
assert.match(brandSource, /url:\s*'\/pricing-inventory\/models'/, 'inventory tab should load searchable series');
assert.match(brandSource, /url:\s*'\/pricing-inventory\/source-items'/, 'inventory tab should index concrete inventory model names');
assert.match(brandSource, /v-for="section in brandSections"/, 'inventory tab should preserve the home-page brand grouping');
assert.match(brandSource, /class="brand-logo"/, 'inventory tab should render the home-page brand logo treatment');
assert.match(brandSource, /placeholder="Поиск марки или модели"/, 'inventory tab should describe brand and series search');
assert.match(detailSource, /placeholder="Поиск марки или модели"/, 'brand detail should use the same search prompt as the inventory tab');
assert.match(brandSource, /class="search-clear-icon"/, 'inventory tab should use a compact clear icon');
assert.match(detailSource, /class="search-clear-icon"/, 'brand detail should use the same compact clear icon');
assert.doesNotMatch(brandSource, />Очистить<\/text>/, 'inventory tab should not show the old clear text');
assert.doesNotMatch(detailSource, />Очистить<\/text>/, 'brand detail should not show the old clear text');
assert.ok(
	detailSource.indexOf('class="search-bar"') < detailSource.indexOf('class="brand-head"'),
	'brand detail should place global search above the current brand heading'
);
assert.match(brandSource, />Модельный ряд</, 'series matches should be shown in a separate result section');
assert.match(brandSource, /@click="openSeries\(seriesItem\)"/, 'series search results should be directly selectable');
assert.match(brandSource, /Number\(model\.stockCount \|\| 0\) > 0/, 'series search should hide models without stock');
assert.match(brandSource, /\[\\s_&'’‘‐‑‒–—-\]\+/, 'brand search should ignore common connector characters');
assert.match(brandSource, /sortOrder:\s*Number\(brand\.sortOrder \?\? taxonomySortOrder \?\? 0\)/, 'brands should use the deployed taxonomy sort order as a fallback');
assert.match(brandSource, /\.sort\(\(left, right\) => right\.sortOrder - left\.sortOrder\)/, 'brands should be sorted by sortOrder descending');
assert.match(brandSource, /@click="openBrand\(brand\)"/, 'brand rows should open a separate page');
assert.match(
	brandSource,
	/\/pages\/inventoryBrand\/inventoryBrand\?brandId=\$\{encodeURIComponent\(brand\.id\)\}&brand=\$\{encodeURIComponent\(brand\.brandName\)\}/,
	'brand navigation should include the selected brand id and name'
);
assert.match(brandSource, /&seriesId=\$\{encodeURIComponent\(seriesItem\.id\)\}/, 'series navigation should identify the selected series');
assert.doesNotMatch(brandSource, /buildSeriesGroups|loadInventoryItemMedia|detail-panel/, 'the inventory tab should only show brands');

const brandScriptMatch = brandSource.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(brandScriptMatch, 'inventory.vue should contain a script block');
const brandScript = brandScriptMatch[1]
	.replace(/^import\s+[\s\S]*?;\n/gm, '')
	.replace('export default', 'const component =');
let navigatedUrl = '';
const brandContext = {
	console,
	getApp: () => ({ globalData: { baseImgUrl: 'https://assets.example.com' } }),
	setInventorySearchIndex: () => {},
	request: async ({ url }) => {
		if (url === '/pricing-inventory/brand-index') {
			return { data: { groups: [{ initial: 'L', brands: [{ id: 'brand-1', name: 'Leapmotor' }] }] } };
		}
		if (url === '/car-brands') {
			return { data: { brands: [{ id: 'brand-1', name: 'Leapmotor', sortOrder: 100 }] } };
		}
		if (url === '/pricing-inventory/models') {
			return {
				data: {
					items: [
						{ id: 'series-1', brandId: 'brand-1', modelName: 'Leapmotor', stockCount: 5 },
						{ id: 'series-0', brandId: 'brand-1', modelName: 'Unused', stockCount: 0 }
					]
				}
			};
		}
		if (url === '/pricing-inventory/source-items') {
			return {
				data: {
					items: [
						{ modelId: 'series-1', itemName: 'Leapmotor A10（768）\n2026/2WD/505', itemNameCn: '零跑 A10（768）2026/2WD/505' }
					]
				}
			};
		}
		throw new Error(`unexpected request: ${url}`);
	},
	uni: {
		navigateTo: ({ url }) => {
			navigatedUrl = url;
		}
	}
};
vm.runInNewContext(`${brandScript}\nthis.component = component;`, brandContext);
const brandMethods = brandContext.component.methods;
const brandLoadContext = {
	...brandMethods,
	brands: [],
	loading: false,
	refreshing: false,
	resetSearchOnReturn: false,
	searchKeyword: '',
	series: []
};
await brandMethods.loadBrands.call(brandLoadContext);
assert.equal(brandLoadContext.brands[0].sortOrder, 100);
assert.deepEqual(Array.from(brandLoadContext.series, (series) => series.seriesName), ['Leapmotor'], 'series without stock should not be searchable');
const searchableSeries = brandContext.component.computed.filteredSeries.call({
	...brandLoadContext,
	searchKeyword: 'A10'
});
assert.deepEqual(Array.from(searchableSeries, (series) => series.resultName), ['Leapmotor A10']);
brandMethods.openSeries.call(brandLoadContext, searchableSeries[0]);
assert.equal(navigatedUrl, '/pages/inventoryBrand/inventoryBrand?brandId=brand-1&brand=Leapmotor&seriesId=series-1&keyword=A10');
assert.equal(brandLoadContext.resetSearchOnReturn, true, 'opening a series should schedule search reset on return');
brandLoadContext.searchKeyword = 'A10';
brandContext.component.onShow.call(brandLoadContext);
assert.equal(brandLoadContext.searchKeyword, '', 'returning from a series should clear the brand-page search');
assert.equal(brandLoadContext.resetSearchOnReturn, false, 'search reset should only run once');

assert.ok(
	pagesJson.pages.some((page) => page.path === 'pages/inventoryBrand/inventoryBrand'),
	'the brand series page should be registered'
);
assert.match(detailSource, /\/pricing-inventory\/brands\/\$\{encodeURIComponent\(this\.brandId\)\}\/items/, 'the new page should load all items for the selected brand');
assert.match(detailSource, /v-for="series in seriesGroups"/, 'the new page should list car series');
assert.match(detailSource, /@click="toggleSeries\(series\)"/, 'clicking a series should expand it on the current page');
assert.match(detailSource, /series-group-open/, 'the expanded series should have a distinct group treatment');
assert.match(detailSource, /\.series-row-open \.series-accent/, 'the expanded series should strengthen its accent marker');
assert.match(detailSource, /\.series-row-open[\s\S]*background:\s*#ff6b00/, 'the expanded series should use a solid theme-color header');
assert.doesNotMatch(detailSource, /<text[^>]*model-chevron[^>]*>⌄<\/text>/, 'series toggles should not use the old circular glyph');
assert.match(detailSource, /v-if="expandedSeriesId === series\.key" class="detail-panel"/, 'expanded series should push the concrete models downward');
assert.match(detailSource, /buildGroupedItems\(series\.items\)/, 'the expanded series should render concrete models');
assert.match(detailSource, /options\.seriesId/, 'the brand page should accept a requested series id');
assert.match(detailSource, /options\.keyword/, 'the brand page should preserve the concrete model search keyword');
assert.match(detailSource, /series\.seriesId === this\.requestedSeriesId/, 'the requested series should be expanded after loading');
assert.match(detailSource, />В других марках</, 'brand detail search should show a separate cross-brand result section');
assert.match(detailSource, /excludeBrandId:\s*this\.brandId/, 'cross-brand results should exclude the current brand');
assert.match(detailSource, /limit:\s*5/, 'cross-brand search should remain compact');
assert.match(detailSource, /uni\.redirectTo/, 'opening a cross-brand result should replace the current detail page');

const scriptMatch = detailSource.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(scriptMatch, 'inventoryBrand.vue should contain a script block');
const script = scriptMatch[1]
	.replace(/^import\s+[\s\S]*?;\n/gm, '')
	.replace('export default', 'const component =');

let requestedUrl = '';
let redirectedUrl = '';
const context = {
	console,
	getInventorySearchIndex,
	request: async ({ url }) => {
		requestedUrl = url;
		return {
			data: {
				items: [
					{ id: 'item-1', modelId: 'series-1', modelName: 'CX-5', itemName: 'Comfort', color: 'white', interiorColor: 'black', quantity: 2, status: 1 },
					{ id: 'item-2', modelId: 'series-1', modelName: 'CX-5', itemName: 'Premium', color: 'red', interiorColor: 'black', quantity: 1, status: 1 },
					{ id: 'item-3', modelId: 'series-2', modelName: 'CX-50', itemName: 'Touring', quantity: 3, status: 1 },
					{ id: 'item-0', modelId: 'series-3', modelName: 'CX-60', itemName: 'Zero stock', quantity: 0, status: 1 }
				]
			}
		};
	},
	searchInventorySeries,
	setInventorySearchIndex,
	uni: {
		redirectTo: ({ url }) => {
			redirectedUrl = url;
		}
	}
};
vm.runInNewContext(`${script}\nthis.component = component;`, context);

const methods = context.component.methods;
assert.equal(methods.normalizeSearchKeyword.call(methods, 'CX-5'), 'cx5');
assert.equal(methods.normalizeSearchKeyword.call(methods, 'cx 5'), 'cx5');
assert.ok(
	methods.normalizeSearchKeyword.call(methods, 'CX-5').includes(methods.normalizeSearchKeyword.call(methods, 'cx5')),
	'series search should match names when the query omits the hyphen'
);
const otherBrandSeriesMatches = context.component.computed.otherBrandSeriesMatches.call({
	...methods,
	brandId: 'brand/1',
	globalSeries: [
		{ aliases: ['Mazda A10'], brandId: 'brand/1', brandName: 'Mazda', id: 'series-current', searchText: 'Mazda A10', seriesName: 'Mazda A10' },
		{ aliases: ['Leapmotor A10'], brandId: 'brand/2', brandName: 'Leapmotor', id: 'series-other', searchText: 'Leapmotor A10', seriesName: 'Leapmotor' }
	],
	searchKeyword: 'A10'
});
assert.deepEqual(Array.from(otherBrandSeriesMatches, (series) => series.brandId), ['brand/2']);
const limitedOtherBrandMatches = context.component.computed.otherBrandSeriesMatches.call({
	...methods,
	brandId: 'brand/1',
	globalSeries: Array.from({ length: 7 }, (_, index) => ({
		aliases: [],
		brandId: `brand-${index + 2}`,
		brandName: `Brand ${index + 2}`,
		id: `series-${index + 2}`,
		searchText: `A10 ${index + 2}`,
		seriesName: `A10 ${index + 2}`
	})),
	searchKeyword: 'A10'
});
assert.equal(limitedOtherBrandMatches.length, 5, 'cross-brand search should return at most five series');
methods.openOtherBrandSeries.call({ ...methods, searchKeyword: 'A10' }, otherBrandSeriesMatches[0]);
assert.equal(redirectedUrl, '/pages/inventoryBrand/inventoryBrand?brandId=brand%2F2&brand=Leapmotor&seriesId=series-other&keyword=A10');
const loadContext = {
	...methods,
	allItems: [],
	brandId: 'brand/1',
	expandedSeriesId: '',
	loading: false,
	requestedSeriesId: 'series-2',
	refreshing: false
};
await methods.loadBrandItems.call(loadContext);
assert.equal(requestedUrl, '/pricing-inventory/brands/brand%2F1/items');
assert.equal(loadContext.allItems.length, 3, 'zero-quantity inventory should stay hidden on the new page');
assert.equal(loadContext.expandedSeriesId, 'brand/1::series-2', 'a series opened from search should expand automatically');

const seriesGroups = methods.buildSeriesGroups.call(loadContext, loadContext.allItems, loadContext.brandId);
assert.equal(seriesGroups.length, 2);
assert.equal(seriesGroups[0].seriesName, 'CX-5');
assert.deepEqual(Array.from(seriesGroups[0].items, (item) => item.modelName), ['Comfort', 'Premium']);
