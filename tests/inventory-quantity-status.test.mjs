import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../pages/inventory/inventory.vue', import.meta.url), 'utf8');
const scriptMatch = source.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(scriptMatch, 'inventory.vue should contain a script block');

assert.match(source, /<view class="detail-cell quantity-col">Кол-во<\/view>/, 'quantity column header should be Russian Кол-во');
assert.doesNotMatch(source, /<view class="detail-cell quantity-col">数量<\/view>/, 'quantity column header should not stay Chinese');
assert.match(source, /formatQuantity\(item\)/, 'quantity cells should use a single display formatter');
assert.match(source, /in-transit/, 'quantity cells should expose an in-transit state class');
assert.doesNotMatch(source, /quantity-cell-transit/, 'in-transit quantity cells should share the same background as numeric cells');
assert.doesNotMatch(source, /Налич\.\/Всего/, 'quantity header should not say in-stock/total');
assert.doesNotMatch(source, /qty-instock|qty-sep|qty-total/, 'quantity cell should not render in-stock/total fragments');

const script = scriptMatch[1]
	.replace(/^import\s+[\s\S]*?;\n/gm, '')
	.replace('export default', 'const component =');

const context = { console };
vm.runInNewContext(`${script}\nthis.component = component;`, context);

const methods = context.component.methods;
const inventoryContext = { ...methods };

assert.match(source, /isInTransit:\s*item\.status === 0/, 'inventory rows should mark in-transit cars from status 0');
assert.equal(
	methods.resolveArrivalDateText.call(inventoryContext, { arrivalDateText: '7.27' }),
	'7.27',
	'inventory rows should read direct arrivalDateText values'
);
assert.equal(
	methods.resolveArrivalDateText.call(inventoryContext, { payload: { arrival_date_text: '4.7' } }),
	'4.7',
	'inventory rows should read arrival_date_text from payload fallbacks'
);
assert.equal(
	methods.formatQuantity.call(inventoryContext, { isInTransit: true, quantity: 7, arrivalDateText: '7.27', inStock: 2 }),
	'7（7.27）'
);
assert.equal(
	methods.formatQuantity.call(inventoryContext, { isInTransit: true, quantity: 7, arrivalDateText: '', inStock: 2 }),
	'7（В пути）'
);
assert.equal(methods.formatQuantity.call(inventoryContext, { isInTransit: false, quantity: 7, inStock: 2 }), '7');
assert.equal(methods.formatQuantity.call(inventoryContext, { isInTransit: false, quantity: 0, inStock: 0 }), '0');
