import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../pages/inventory/inventory.vue', import.meta.url), 'utf8');
const scriptMatch = source.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(scriptMatch, 'inventory.vue should contain a script block');

assert.match(source, /@click\.stop="openModelDetailModal\(group\)"/, 'merged model name should open a bottom detail modal');
assert.match(source, /activeModelDetail/, 'inventory should keep model detail modal state');
assert.match(source, /activeModelDetailImages/, 'model detail modal should keep API images separately from parsed model rows');
assert.match(source, /\/pricing-inventory\/media\?itemIds=\$\{itemIds\.map\(encodeURIComponent\)\.join\(','\)\}&category=\$\{category\}/, 'model detail modal should load batch inventory media by item ids and category');
assert.match(source, /buildInventoryMediaUrl\(itemIds, 1\)/, 'model detail media should request category 1');
assert.doesNotMatch(source, /buildInventoryMediaUrl\(itemIds, 0\)/, 'model detail media should not request category 0');
assert.match(source, /v-else-if="activeModelDetailImageUrls\.length"/, 'model detail modal should render images only when the API returns them');
assert.match(source, /<scroll-view scroll-y class="model-detail-images"/, 'model detail images should use a vertical scroll area');
assert.match(source, /\.model-detail-images\s*\{[\s\S]*flex-direction:\s*column;/, 'model detail images should be stacked vertically');
assert.match(source, /\.model-detail-images\s*\{[\s\S]*flex-wrap:\s*nowrap;/, 'model detail images should not wrap into a grid');
const modelDetailImageStyle = source.match(/\.model-detail-image\s*\{([\s\S]*?)\n\}/)?.[1] || '';
assert.match(modelDetailImageStyle, /width:\s*100%;/, 'each model detail image should take a full row');
assert.doesNotMatch(modelDetailImageStyle, /width:\s*216rpx;/, 'model detail images should not use thumbnail sizing');
assert.match(source, /v-else[\s\S]*class="model-info-table"/, 'model detail modal should fall back to the current table layout when there are no images');
assert.match(source, /Название модели/, 'model detail modal should show the model name');
assert.match(source, /Год/, 'model detail modal should show the year row when parsed');
assert.match(source, /Привод/, 'model detail modal should show the drive row when parsed');
assert.match(source, /Объём двигателя/, 'model detail modal should show the displacement row when parsed');
assert.match(source, /Комплектация/, 'model detail modal should show the configuration row when parsed');

const script = scriptMatch[1]
	.replace(/^import\s+[\s\S]*?;\n/gm, '')
	.replace('export default', 'const component =');

const context = { console };
vm.runInNewContext(`${script}\nthis.component = component;`, context);

const methods = context.component.methods;
const inventoryContext = { ...methods };

const standardDetail = methods.buildModelDetail.call(inventoryContext, 'CX-5 Comfort 2026/2WD/2.0L/155PS');
assert.equal(standardDetail.name, 'CX-5 Comfort');
assert.deepEqual(
	Array.from(standardDetail.rows).map((row) => ({ label: row.label, value: row.value })),
	[
		{ label: 'Год', value: '2026' },
		{ label: 'Привод', value: '2WD' },
		{ label: 'Объём двигателя', value: '2.0L' },
		{ label: 'Комплектация', value: '155PS' }
	],
	'standard slash-separated model names should become structured detail rows'
);

const compactYearDetail = methods.buildModelDetail.call(inventoryContext, 'Mazda EZ-60 25/200MAX/Streaming media rearview mirror');
assert.equal(compactYearDetail.name, 'Mazda EZ-60');
assert.deepEqual(
	Array.from(compactYearDetail.rows).map((row) => ({ label: row.label, value: row.value })),
	[
		{ label: 'Год', value: '2025' },
		{ label: 'Комплектация', value: '200MAX / Streaming media rearview mirror' }
	],
	'two-digit model years should be shown as 20xx and remaining segments as configuration'
);

const nameOnlyDetail = methods.buildModelDetail.call(inventoryContext, 'Special Edition Name Only');
assert.equal(nameOnlyDetail.name, 'Special Edition Name Only');
assert.deepEqual(
	Array.from(nameOnlyDetail.rows).map((row) => ({ label: row.label, value: row.value })),
	[],
	'unstructured model names should only show the model name'
);

assert.deepEqual(
	Array.from(
		methods.resolveGroupItemIds.call(inventoryContext, {
			items: [{ id: 'item-2' }, { id: 'item-1' }, { id: 'item-2' }, { id: '' }]
		})
	),
	['item-2', 'item-1'],
	'model detail media requests should include unique ids from every row in the merged model group'
);

assert.equal(
	methods.buildInventoryMediaUrl.call(inventoryContext, ['item-2', 'item-1'], 1),
	'/pricing-inventory/media?itemIds=item-2,item-1&category=1',
	'model detail media requests should use the batch API URL shape'
);
