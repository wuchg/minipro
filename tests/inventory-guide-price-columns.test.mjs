import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../pages/inventory/inventory.vue', import.meta.url), 'utf8');
const scriptMatch = source.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(scriptMatch, 'inventory.vue should contain a script block');

assert.doesNotMatch(source, /guide-price-col|guide-price-cell|formatPrice\(item\.guidePrice\)/, 'inventory table should not render a guide price column');
assert.doesNotMatch(source, /Рек\. цена|指导价<\/view>/, 'inventory table should not show a guide price header');
assert.doesNotMatch(source, /displayModelName|formatModelListName|resolveGuidePrice/, 'inventory row model column should not use compact display-name helpers');
assert.match(source, /modelName:\s*this\.stringifyValue\(item\.modelName\)/, 'inventory rows should keep the full model name in the table');
assert.match(source, /grid-template-columns:\s*1fr 112rpx 146rpx 144rpx;/, 'detail header should give quantity more width while keeping the non-model columns balanced');
assert.match(source, /grid-template-columns:\s*1fr 402rpx;/, 'group layout should reserve wider color and quantity columns plus the existing price column');
assert.match(source, /grid-template-columns:\s*112rpx 146rpx 144rpx;/, 'detail rows should keep in-transit quantity text on one line without widening the whole table');
assert.doesNotMatch(source, /grid-template-columns:\s*1fr 96rpx 96rpx 162rpx;/, 'inventory table should not keep the previous compact color and quantity columns');
assert.doesNotMatch(source, /grid-template-columns:\s*1fr 354rpx;/, 'inventory table should not keep the previous non-model column total width');
assert.doesNotMatch(source, /grid-template-columns:\s*1fr 84rpx 96rpx 162rpx;/, 'inventory table should not keep color narrower than quantity');
assert.doesNotMatch(source, /grid-template-columns:\s*1fr 140rpx 150rpx 132rpx;/, 'inventory table should not keep the old wide color and quantity columns');
assert.doesNotMatch(source, /grid-template-columns:\s*1fr 422rpx;/, 'inventory table should not keep the old non-model column total width');
const detailHeaderCellStyle = source.match(/\.detail-header \.detail-cell\s*\{([\s\S]*?)\n\}/)?.[1] || '';
assert.match(detailHeaderCellStyle, /justify-content:\s*center;/, 'detail header cells should be horizontally centered');
assert.match(detailHeaderCellStyle, /text-align:\s*center;/, 'detail header text should be centered');
const quantityHeaderStyle = source.match(/\.detail-header \.quantity-col\s*\{([\s\S]*?)\n\}/)?.[1] || '';
assert.match(quantityHeaderStyle, /white-space:\s*nowrap;/, 'quantity header should stay on one line in the compact column');
assert.match(quantityHeaderStyle, /word-break:\s*keep-all;/, 'quantity header should not break the Russian label');
assert.match(quantityHeaderStyle, /padding-left:\s*2rpx;/, 'quantity header should reduce horizontal padding instead of stretching the column');
const quantityValueStyle = source.match(/\.quantity-value\s*\{([\s\S]*?)\n\}/)?.[1] || '';
assert.match(quantityValueStyle, /white-space:\s*nowrap;/, 'quantity value should stay on one line when transit text is present');
assert.match(quantityValueStyle, /word-break:\s*keep-all;/, 'quantity value should keep the transit marker together');
const inTransitStyle = source.match(/\.in-transit\s*\{([\s\S]*?)\n\}/)?.[1] || '';
assert.match(inTransitStyle, /font-size:\s*22rpx;/, 'in-transit quantities should use a slightly smaller font so date text fits the widened column');
assert.doesNotMatch(
	source,
	/\.detail-header \.(?:model-detail-col|color-col|price-col)/,
	'data-cell alignment rules should not override detail header alignment'
);

const script = scriptMatch[1]
	.replace(/^import\s+[\s\S]*?;\n/gm, '')
	.replace('export default', 'const component =');

const context = { console };
vm.runInNewContext(`${script}\nthis.component = component;`, context);

const methods = context.component.methods;
const inventoryContext = { ...methods };

const grouped = methods.buildGroupedItems.call(inventoryContext, [
	{
		modelName: 'CX-5 Comfort 2026/2WD/2.0L/155PS',
		id: 'item-1'
	}
]);
assert.equal(grouped[0].modelName, 'CX-5 Comfort 2026/2WD/2.0L/155PS');

const detailContext = {
	...inventoryContext,
	activeModelDetail: null,
	activeModelDetailImages: [],
	activeModelDetailLoading: false,
	activeModelDetailRequestKey: '',
	resolveGroupItemIds: () => [],
	buildInventoryMediaUrl: () => ''
};
await methods.openModelDetailModal.call(detailContext, grouped[0]);
assert.equal(detailContext.activeModelDetail.name, 'CX-5 Comfort');
assert.deepEqual(
	Array.from(detailContext.activeModelDetail.rows).map((row) => row.label),
	['Год', 'Привод', 'Объём двигателя', 'Комплектация'],
	'detail modal should still expand the hidden configuration fields'
);
