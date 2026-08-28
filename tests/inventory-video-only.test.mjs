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
	'color split swatch should show a compact play icon hint'
);
assert.match(
	inventorySource,
	/color-split-swatch[\s\S]*class="color-split-segment color-split-exterior"/,
	'color cell should render one split swatch container'
);
assert.match(
	inventorySource,
	/:class="\['color-split-swatch', isSameColorSwatch\(item\) \? 'color-split-swatch-same' : ''\]"/,
	'split swatch should add a stronger divider class only when exterior and interior map to the same color'
);
assert.match(
	inventorySource,
	/class="color-split-segment color-split-exterior"[\s\S]*backgroundColor:\s*colorSwatch\(item\.color\)/,
	'color cell should render exterior color as the left split half'
);
assert.match(
	inventorySource,
	/class="color-split-segment color-split-interior"[\s\S]*backgroundColor:\s*colorSwatch\(item\.interiorColor\)/,
	'color cell should render interior color as the right split half'
);
assert.match(
	inventorySource,
	/\.color-swatch-wrap\s*\{[\s\S]*position:\s*relative;[\s\S]*width:\s*76rpx;[\s\S]*height:\s*42rpx;/,
	'color swatch wrapper should contain one compact split swatch'
);
assert.match(
	inventorySource,
	/\.detail-group-rows \.color-cell\s*\{[\s\S]*padding:\s*4rpx;/,
	'color cells should use tight padding without letting the swatch fill the whole cell'
);
assert.match(
	inventorySource,
	/\.color-split-swatch\s*\{[\s\S]*display:\s*flex;[\s\S]*width:\s*64rpx;[\s\S]*height:\s*34rpx;[\s\S]*border-radius:\s*8rpx;[\s\S]*border:\s*1rpx solid #d7c5ad;[\s\S]*overflow:\s*hidden;/,
	'color swatch should be one rounded split container'
);
assert.match(
	inventorySource,
	/\.color-split-segment\s*\{[\s\S]*flex:\s*1;[\s\S]*height:\s*100%;/,
	'each split half should fill half of the unified swatch'
);
assert.match(
	inventorySource,
	/\.color-split-interior\s*\{[\s\S]*border-left:\s*1rpx solid rgba\(122, 74, 24, 0\.24\);/,
	'split swatch should keep a subtle center divider'
);
assert.match(
	inventorySource,
	/\.color-split-swatch-same \.color-split-interior\s*\{[\s\S]*border-left:\s*2rpx solid rgba\(255, 107, 0, 0\.58\);/,
	'same-color split swatches should use a more visible theme divider'
);
assert.match(
	inventorySource,
	/\.color-swatch-play-hint\s*\{[\s\S]*position:\s*absolute;[\s\S]*right:\s*0;[\s\S]*bottom:\s*0;[\s\S]*background:\s*#fffaf4;/,
	'color swatch play hint should be a small warm overlay'
);
assert.match(
	inventorySource,
	/\.color-swatch-play-icon\s*\{[\s\S]*border-left:\s*6rpx solid #ff6b00;/,
	'color swatch play icon should use the orange theme color'
);
assert.doesNotMatch(inventorySource, /color-swatch-frame/, 'color swatches should not use inset frames that make light and dark colors look different sizes');
assert.doesNotMatch(inventorySource, /color-swatch-pair|class="color-swatch color-swatch-(?:exterior|interior)"/, 'color cell should not use two independent color blocks');
assert.doesNotMatch(inventorySource, /color-infinity|∞/, 'color cell should not use the infinity glyph variant');
assert.doesNotMatch(inventorySource, /color-infinity-core/, 'infinity color swatch should not use separate fill dots inside the glyph');
assert.doesNotMatch(inventorySource, /color-infinity-half/, 'infinity color swatch should not be replaced by two joined pill blocks');
assert.doesNotMatch(inventorySource, /box-shadow:/, 'infinity color swatches should not use shadows that create visual offset');
assert.doesNotMatch(inventorySource, /min-height:\s*68rpx;[\s\S]*border-radius:\s*0;/, 'color swatch should not keep the abrupt full-cell fill style');
assert.doesNotMatch(
	inventorySource,
	/color-swatch-half/,
	'color cell should not use the previous joined half-swatch structure'
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

assert.equal(
	methods.resolveInteriorColor.call(inventoryContext, { interiorColor: 'black' }),
	'black',
	'inventory item should read direct interiorColor'
);
assert.equal(
	methods.resolveInteriorColor.call(inventoryContext, { interior_color: 'red' }),
	'red',
	'inventory item should read snake_case interior color'
);
assert.equal(
	methods.resolveInteriorColor.call(inventoryContext, { payload: { 内饰颜色: '米色' } }),
	'米色',
	'inventory item should read interior color from localized payload fields'
);
assert.equal(methods.colorSwatch.call(inventoryContext, '紫色'), '#7e57c2', 'Chinese purple color names should map to purple');
assert.equal(methods.colorSwatch.call(inventoryContext, 'purple'), '#7e57c2', 'English purple color names should map to purple');
assert.equal(methods.colorSwatch.call(inventoryContext, 'фиолетовый'), '#7e57c2', 'Russian purple color names should map to purple');
assert.equal(
	methods.isSameColorSwatch.call(inventoryContext, { color: '黑色', interiorColor: 'black' }),
	true,
	'same color swatch detection should compare normalized exterior and interior colors'
);
assert.equal(
	methods.isSameColorSwatch.call(inventoryContext, { color: '白色', interiorColor: 'black' }),
	false,
	'same color swatch detection should leave different exterior and interior colors subtle'
);

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
