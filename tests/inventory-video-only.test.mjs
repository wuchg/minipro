import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const inventorySource = fs.readFileSync(new URL('../pages/inventory/inventory.vue', import.meta.url), 'utf8');
const pagesJson = JSON.parse(fs.readFileSync(new URL('../pages.json', import.meta.url), 'utf8'));

assert.ok(
	!pagesJson.pages.some((page) => page.path === 'pages/panorama/panorama'),
	'phase one should not register the panorama web-view page'
);

assert.match(inventorySource, /loadInventoryItemMedia\(item\)/, 'color swatch click should load item media before showing the modal content');
assert.match(
	inventorySource,
	/<view class="detail-cell color-col">Цвет<\/view>/,
	'color header should stay as a plain color label'
);
assert.match(
	inventorySource,
	/class="color-swatch-play-hint"[\s\S]*<view class="color-swatch-play-icon"><\/view>/,
	'individual color swatches should show a theme-matched play icon hint'
);
assert.match(
	inventorySource,
	/\.color-swatch-play-hint\s*\{[\s\S]*background:\s*#fffaf4;/,
	'color swatch play hint should use a restrained warm theme chip'
);
assert.match(
	inventorySource,
	/\.color-swatch-play-icon\s*\{[\s\S]*border-left:\s*6rpx solid #ff6b00;/,
	'color swatch play icon should use the orange theme color'
);
assert.doesNotMatch(inventorySource, /color-header-hint|color-header-play-icon|>Видео<\/text>|Фото|>▶<\/text>/, 'media hint should not use header text or swatch text labels');
assert.match(inventorySource, /\/pricing-inventory\/items\/\$\{encodeURIComponent\(item\.id\)\}\/media/, 'inventory media should be loaded from the item media API');
assert.match(inventorySource, />Реальные фотографии автомобиля</, 'inventory media modal should use a business-specific photo/video title');
assert.match(inventorySource, /v-if="activeVideoUrls\.length" class="inventory-video-hint">Нажмите и удерживайте видео, чтобы сохранить его в альбом/, 'inventory modal should explain long-press video saving only when videos exist');
assert.match(inventorySource, /<image\b[\s\S]*v-for="\(imageUrl, index\) in activeImageUrls"[\s\S]*:src="imageUrl"[\s\S]*@click="previewInventoryImage\(imageUrl\)"/, 'inventory modal should render every media image from the API');
assert.match(inventorySource, /<video\b[\s\S]*v-for="\(videoUrl, index\) in activeVideoUrls"[\s\S]*:src="videoUrl"[\s\S]*@longpress="downloadVideo\(videoUrl\)"/, 'inventory modal should render every API video vertically with long-press download');
assert.match(inventorySource, /activeImageUrls/, 'inventory modal should support API images for one car');
assert.match(inventorySource, /class="inventory-video"/, 'inventory video should have stable modal sizing');
assert.match(inventorySource, /controls/, 'inventory video should expose player controls');
assert.match(inventorySource, /activeVideoUrls/, 'inventory modal should support multiple videos for one car');
assert.match(inventorySource, /downloadVideo\(url\)/, 'inventory modal should keep a per-video download handler');
assert.match(inventorySource, /uni\.downloadFile/, 'inventory video download should use the mini-program download API');
assert.match(inventorySource, /uni\.saveVideoToPhotosAlbum/, 'inventory video download should save videos to the photo album');
assert.doesNotMatch(inventorySource, /vehicle-video-landscape\.mp4|vehicle-video-portrait\.mp4|DEFAULT_VIDEO_URL/, 'inventory modal should not use hard-coded fallback demo videos');
assert.doesNotMatch(inventorySource, /model-modal-sub|modal-color-swatch|model-modal-meta/, 'inventory modal should not show color swatch or price under the title');
assert.doesNotMatch(inventorySource, /formatPrice\(activeInventoryItem\.price\)/, 'inventory modal should not render the item price');
assert.doesNotMatch(inventorySource, /download-video-button|>下载视频</, 'inventory modal should not show a visible download button');
assert.doesNotMatch(inventorySource, /video-tabs|video-tab|switchVideo|activeVideoIndex|视频\{\{ index \+ 1 \}\}/, 'inventory modal should not use video switch tabs');
assert.doesNotMatch(inventorySource, /:poster=|activeVideoPosterUrl|DEFAULT_VIDEO_POSTER_URL|resolveVideoPosterUrl|videoPosterUrl|video-poster\.svg/, 'inventory modal should not render a video placeholder poster');
assert.doesNotMatch(inventorySource, /openPanoramaPage/, 'inventory should not navigate to the panorama web-view page');
assert.doesNotMatch(inventorySource, /krpano-demo\/index\.html/, 'inventory should not open the krpano H5 demo in phase one');
assert.doesNotMatch(inventorySource, /<web-view|pages\/panorama\/panorama/, 'inventory should not reference web-view panorama routing');
assert.doesNotMatch(inventorySource, /<xr-[^>]*viewer|<model-viewer/, 'inventory modal should not auto-load a 3D viewer in phase one');

const scriptMatch = inventorySource.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(scriptMatch, 'inventory.vue should contain a script block');

const script = scriptMatch[1]
	.replace(/^import\s+[\s\S]*?;\n/gm, '')
	.replace('export default', 'const component =');

const context = { console };
vm.runInNewContext(`${script}\nthis.component = component;`, context);

const methods = context.component.methods;
const inventoryContext = { ...methods };

const multiVideoContext = {
	...inventoryContext,
	activeInventoryMedia: {
		images: [
			'https://autobss-1300679246.cos.accelerate.myqcloud.com/static/one.jpg',
			{ path: '/static/two.jpg' }
		],
		videos: [
			'https://autobss-1300679246.cos.accelerate.myqcloud.com/static/one.mp4',
			{ url: 'static/two.mp4' }
		]
	}
};
multiVideoContext.activeImageUrls = context.component.computed.activeImageUrls.call(multiVideoContext);
multiVideoContext.activeVideoUrls = context.component.computed.activeVideoUrls.call(multiVideoContext);
assert.deepEqual(
	Array.from(multiVideoContext.activeImageUrls),
	[
		'https://autobss-1300679246.cos.accelerate.myqcloud.com/static/one.jpg',
		'https://autobss-1300679246.cos.accelerate.myqcloud.com/static/two.jpg'
	],
	'active modal image list should expose all API images'
);
assert.deepEqual(
	Array.from(multiVideoContext.activeVideoUrls),
	[
		'https://autobss-1300679246.cos.accelerate.myqcloud.com/static/one.mp4',
		'https://autobss-1300679246.cos.accelerate.myqcloud.com/static/two.mp4'
	],
	'active modal video list should expose all API videos'
);

assert.deepEqual(
	Array.from(methods.resolveMediaAssetUrls.call(inventoryContext, {
		images: [{ url: '/static/a.jpg' }, { path: 'static/b.jpg' }],
		videos: [{ path: '/static/a.mp4' }]
	})),
	[
		'https://autobss-1300679246.cos.accelerate.myqcloud.com/static/a.jpg',
		'https://autobss-1300679246.cos.accelerate.myqcloud.com/static/b.jpg',
		'https://autobss-1300679246.cos.accelerate.myqcloud.com/static/a.mp4'
	],
	'API media asset objects should normalize url and path fields'
);
