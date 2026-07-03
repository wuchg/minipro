import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../pages/inventory/inventory.vue', import.meta.url), 'utf8');
const scriptMatch = source.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(scriptMatch, 'inventory.vue should contain a script block');

const script = scriptMatch[1]
	.replace(/^import\s+[\s\S]*?;\n/gm, '')
	.replace('export default', 'const component =');

const context = { console };
vm.runInNewContext(`${script}\nthis.component = component;`, context);

const methods = context.component.methods;
const inventoryContext = { ...methods };

assert.doesNotMatch(
	source,
	/DEFAULT_[A-Z_]*URL|activeModelUrl|resolveModelUrl|isKnownIncompatibleModelUrl|parseModelUrls|model3dUrl|model3d_url|modelUrl|model_url/i,
	'inventory should not keep 3D model fallback or parsing code'
);

assert.equal(
	methods.normalizeMediaUrl.call(inventoryContext, '/static/media/car-front.jpg'),
	'https://autobss-1300679246.cos.accelerate.myqcloud.com/static/media/car-front.jpg',
	'root static media paths should use the COS accelerated host'
);

assert.equal(
	methods.normalizeMediaUrl.call(inventoryContext, 'static/media/car-drive.mp4'),
	'https://autobss-1300679246.cos.accelerate.myqcloud.com/static/media/car-drive.mp4',
	'static media paths without a leading slash should use the COS accelerated host'
);

assert.deepEqual(
	Array.from(
		methods.resolveMediaAssetUrls.call(inventoryContext, [
			{ url: '/static/media/a.jpg' },
			{ path: 'static/media/b.mp4' },
			{ images: [{ src: '/static/media/c.jpg' }], videos: [{ href: '/static/media/d.mp4' }] }
		])
	),
	[
		'https://autobss-1300679246.cos.accelerate.myqcloud.com/static/media/a.jpg',
		'https://autobss-1300679246.cos.accelerate.myqcloud.com/static/media/b.mp4',
		'https://autobss-1300679246.cos.accelerate.myqcloud.com/static/media/c.jpg',
		'https://autobss-1300679246.cos.accelerate.myqcloud.com/static/media/d.mp4'
	],
	'API media URL normalization should keep supporting nested image and video objects'
);
