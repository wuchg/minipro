import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const demoDir = join(root, 'demos', 'krpano-demo');
const indexPath = join(demoDir, 'index.html');
const krpanoScriptPath = join(demoDir, 'krpano.js');
const tourPath = join(demoDir, 'tour.xml');
const readmePath = join(demoDir, 'README.md');
const panoAssetPath = join(demoDir, 'assets', 'pano-placeholder.svg');
const posterAssetPath = join(demoDir, 'assets', 'video-poster.svg');
const demoVideoPath = join(demoDir, 'assets', 'demo-video.mp4');
const landscapeVideoPath = join(demoDir, 'assets', 'vehicle-video-landscape.mp4');
const portraitVideoPath = join(demoDir, 'assets', 'vehicle-video-portrait.mp4');
const yarisPanoPath = join(demoDir, 'assets', 'yaris-interior-garage.jpg');

assert.ok(existsSync(indexPath), 'krpano demo should include an index.html entry');
assert.ok(existsSync(krpanoScriptPath), 'krpano demo should include the official krpano.js viewer');
assert.ok(existsSync(tourPath), 'krpano demo should include a tour.xml startup file');
assert.ok(existsSync(readmePath), 'krpano demo should document COS upload steps');
assert.ok(existsSync(panoAssetPath), 'krpano demo should include a panorama placeholder asset');
assert.ok(existsSync(posterAssetPath), 'krpano demo should include a video poster placeholder asset');
assert.ok(existsSync(demoVideoPath), 'krpano demo should include a downloadable car video test asset');
assert.ok(existsSync(landscapeVideoPath), 'krpano demo should include the uploaded landscape vehicle video as MP4');
assert.ok(existsSync(portraitVideoPath), 'krpano demo should include the uploaded portrait vehicle video as MP4');
assert.ok(existsSync(yarisPanoPath), 'krpano demo should include a real car interior panorama test asset');

const indexHtml = readFileSync(indexPath, 'utf8');
assert.match(indexHtml, /<script\s+src="\.\/krpano\.js"/, 'index.html should load krpano.js from the uploaded folder');
assert.match(indexHtml, /embedpano\(\{/, 'index.html should initialize krpano with embedpano');
assert.match(indexHtml, /xml:\s*["']\.\/tour\.xml["']/, 'embedpano should load ./tour.xml');
assert.match(indexHtml, /target:\s*["']pano["']/, 'embedpano should target the pano element');
assert.match(indexHtml, /passQueryParameters:\s*false/, 'demo should not pass arbitrary query parameters to krpano');
assert.match(indexHtml, /krpano\.js/, 'fallback copy should mention missing krpano.js');
assert.match(indexHtml, /autobss-1300679246\.cos\.accelerate\.myqcloud\.com/, 'demo should show the global acceleration URL pattern');
assert.match(indexHtml, /<video\b/, 'demo should include a phase-one vehicle video preview area');
assert.match(indexHtml, /id="vehicleVideo"/, 'demo should expose a stable video element for switching sources');
assert.match(indexHtml, /vehicle-video-landscape\.mp4/, 'demo should use the uploaded landscape vehicle video');
assert.match(indexHtml, /vehicle-video-portrait\.mp4/, 'demo should allow switching to the uploaded portrait vehicle video');
assert.match(indexHtml, /data-video-src=/, 'demo should include video source switch controls');
assert.match(indexHtml, /data-demo-ready="true"/, 'demo should include a plain HTML readiness marker for web-view debugging');
assert.match(indexHtml, /\[krpano-demo\] boot/, 'demo should log when the H5 page script executes');
assert.match(indexHtml, /id="startPanoButton"/, 'demo should not auto-start krpano before the first visible paint');
assert.match(indexHtml, /addEventListener\('click', startKrpano\)/, 'demo should start krpano from an explicit user action');
assert.match(indexHtml, /assets\/yaris-interior-garage\.jpg/, 'demo fallback should show the real panorama image before krpano starts');

const krpanoScript = readFileSync(krpanoScriptPath, 'utf8');
assert.match(krpanoScript, /embedpano/, 'krpano.js should expose the embedpano integration function');

const tourXml = readFileSync(tourPath, 'utf8');
assert.match(tourXml, /<krpano\b[^>]*version=/, 'tour.xml should be a krpano XML file');
assert.match(tourXml, /<sphere\s+url="assets\/yaris-interior-garage\.jpg"/, 'tour.xml should use the included Yaris car interior panorama');
assert.match(tourXml, /<hotspot\b/, 'tour.xml should include at least one hotspot for interaction');

const readme = readFileSync(readmePath, 'utf8');
assert.match(readme, /static\/krpano-demo\//, 'README should document the COS object prefix');
assert.match(readme, /https:\/\/autobss-1300679246\.cos\.accelerate\.myqcloud\.com\/static\/krpano-demo\/index\.html/, 'README should include the global acceleration access URL');
assert.match(readme, /krpano\.js/, 'README should explain where to place the krpano viewer file');
assert.match(readme, /static\/krpano-demo\/assets\/demo-video\.mp4/, 'README should include the car video upload path');
assert.match(readme, /static\/krpano-demo\/assets\/vehicle-video-landscape\.mp4/, 'README should include the landscape video upload path');
assert.match(readme, /static\/krpano-demo\/assets\/vehicle-video-portrait\.mp4/, 'README should include the portrait video upload path');
assert.match(readme, /static\/krpano-demo\/assets\/yaris-interior-garage\.jpg/, 'README should include the panorama upload path');
assert.match(readme, /file:\/\//, 'README should warn that krpano cannot reliably load tour.xml from file://');
assert.match(readme, /python3 -m http\.server 8088 -d demos\/krpano-demo/, 'README should include a localhost preview command');
assert.match(readme, /Mixkit/, 'README should document the car video source');
assert.match(readme, /Poly Haven/, 'README should document the panorama source');
assert.match(readme, /Yaris Interior Garage/, 'README should document the selected car interior panorama');
