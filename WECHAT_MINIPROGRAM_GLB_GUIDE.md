# 微信小程序加载 GLB 正确方式

本文记录当前项目在微信小程序中加载 `.glb` 的稳定做法，适用于 uni-app 编译到 `MP-WEIXIN` 后使用微信 XR Frame 渲染 3D 模型。

产品决策更新：3D 链路已经验证可加载和显示，但第一期不启用 3D 展示，优先使用自己拍摄的视频展示车辆。GLB/XR Frame 方案作为后续增强能力保留。

2026-07-01 更新：krpano 360 全景链路暂时放弃，第一期库存弹窗只直接播放视频，不再通过 `web-view` 打开全景 H5。

参考文档：

- [XR Frame GLTF 使用说明](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/gltf/specification.html)
- [XR Frame 相机](https://developers.weixin.qq.com/miniprogram/dev/component/xr-frame/render/camera.html)

## 结论

在微信小程序里不要把 GLB 当成普通网页 3D 资源处理。稳定路径是：

1. 用原生小程序自定义组件承载 XR Frame。
2. 组件 JSON 必须声明 `"renderer": "xr-frame"`。
3. WXML 顶层直接使用 `<xr-scene>`，不要在 XR 场景里混入 `<view>`、`<text>` 等普通节点。
4. 用 `<xr-assets>` + `<xr-asset-load type="gltf">` 加载 GLB。
5. 用 `<xr-gltf model="assetId">` 渲染已加载资源。
6. 相机的 `target` 必须指向一个 `xr-node` 的 `node-id`，不能写坐标字符串。

## 一期展示策略

第一期库存详情建议使用自摄视频，而不是 3D 模型：

1. 视频更接近真实车况，能展示外观、内饰、漆面、灯光、轮毂和细节瑕疵。
2. 小程序端的视频兼容性、审核风险、首屏稳定性都比 GLB 更可控。
3. 3D 模型需要处理尺寸、材质扩展、相机、文件大小、加载性能和授权来源，适合作为第二期增强体验。
4. 现有 XR Frame 代码可以保留为技术预研结果，暂时不要作为第一期主流程依赖。

推荐第一期媒体字段：

```js
{
  videoUrl: 'https://.../vehicle-demo.mp4',
  posterUrl: 'https://.../vehicle-demo-cover.jpg',
  modelUrl: 'https://.../vehicle.glb'
}
```

展示优先级建议：

1. 有 `videoUrl` 时优先展示视频。
2. 没有视频但有图片时展示图片。
3. 后续确认启用 3D 后，再把 `modelUrl` 作为可选入口或增强按钮。

## 一期视频接入

当前库存页点击颜色块后，弹窗直接使用小程序原生 `<video>` 播放车辆视频，不走 `web-view`、krpano 或 XR Frame。

默认演示视频：

```text
https://autobss-1300679246.cos.accelerate.myqcloud.com/static/krpano-demo/assets/vehicle-video-landscape.mp4
```

备用竖屏视频：

```text
https://autobss-1300679246.cos.accelerate.myqcloud.com/static/krpano-demo/assets/vehicle-video-portrait.mp4
```

当前解析字段：

```js
{
  videoUrl: 'https://.../vehicle-demo.mp4',
  video_url: 'https://.../vehicle-demo.mp4',
  posterUrl: 'https://.../vehicle-demo-cover.jpg',
  videoPosterUrl: 'https://.../vehicle-demo-cover.jpg'
}
```

历史说明：

- `demos/krpano-demo/` 保留为 krpano/H5 技术预研目录，但第一期业务链路不再依赖它的 `index.html`。
- `pages/panorama/panorama.vue` 已移除，`pages.json` 不再注册全景 `web-view` 页面。

视频资源建议：

- 使用 HTTPS/COS 加速地址。
- 编码优先使用 MP4/H.264，音频 AAC。
- 准备一张封面图，避免视频加载前空白。
- 单车视频控制在合理体积，优先保证加载速度和真实展示效果。
- 小程序后台需要配置视频 COS 域名为合法下载/业务域名。

## 文件结构

推荐放在原生小程序组件目录，例如：

```text
wxcomponents/xr-glb-viewer/
  index.json
  index.wxml
  index.wxss
  index.js
```

在页面中按平台分支使用：

```vue
<!-- #ifdef MP-WEIXIN -->
<xr-glb-viewer class="xr-model-viewer" :src="activeModelUrl"></xr-glb-viewer>
<!-- #endif -->

<!-- #ifndef MP-WEIXIN -->
<glb-viewer :src="activeModelUrl"></glb-viewer>
<!-- #endif -->
```

## 注册组件

页面或全局配置里注册原生组件：

```json
{
  "usingComponents": {
    "xr-glb-viewer": "/wxcomponents/xr-glb-viewer/index"
  }
}
```

## index.json

`renderer` 是关键项。没有它，`xr-scene` 不会按 XR Frame 渲染器运行。

```json
{
  "component": true,
  "usingComponents": {},
  "renderer": "xr-frame"
}
```

## index.wxml

最小可用结构如下：

```xml
<xr-scene class="xr-glb-viewer" disable-scroll bind:ready="handleSceneReady">
  <xr-assets bind:progress="handleAssetsProgress" bind:loaded="handleAssetsLoaded">
    <xr-asset-load
      wx:if="{{src}}"
      type="gltf"
      asset-id="{{assetId}}"
      src="{{src}}"
    ></xr-asset-load>
  </xr-assets>

  <xr-light type="ambient" color="1 1 1" intensity="1.2"></xr-light>
  <xr-light type="directional" color="1 1 1" intensity="2" rotation="40 45 0"></xr-light>

  <xr-node node-id="model-target" position="0 0 0"></xr-node>

  <xr-node position="0 -0.15 0" rotation="{{rotation}}" scale="{{scale}}">
    <xr-gltf
      wx:if="{{src}}"
      id="model"
      model="{{assetId}}"
      bind:gltf-loaded="handleGltfLoaded"
    ></xr-gltf>
  </xr-node>

  <xr-camera
    position="0 0.8 4"
    target="model-target"
    camera-orbit-control=""
    clear-color="0.97 0.98 0.99 1"
  ></xr-camera>
</xr-scene>
```

注意：

- `xr-camera target="model-target"` 是正确写法。
- `target="0 0 0"` 是错误写法。官方相机文档里 `target` 指的是节点 `node-id`。
- `camera-orbit-control=""` 可提供基础旋转控制。
- GLB 本身可能尺寸很小或很大，必要时通过外层 `xr-node scale="{{scale}}"` 适配视野。

## index.wxss

XR 组件必须有稳定尺寸。父容器只有背景色但没有明确高度时，很容易看起来像“加载成功但空白”。

```css
:host {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 520rpx;
}

.xr-glb-viewer {
  display: block;
  width: 100%;
  height: 100%;
  min-height: 520rpx;
  background: #f7f8fa;
}
```

页面侧也要给组件宿主稳定布局：

```scss
.model-modal-body {
  height: 520rpx;
  overflow: hidden;
}

.xr-model-viewer {
  display: block;
  width: 100%;
  height: 100%;
}
```

## index.js 要点

每次切换 `src` 时生成新的 `assetId`，让 XR 资源重新加载：

```js
let assetSeed = 0;

Component({
  properties: {
    src: {
      type: String,
      value: '',
      observer(value) {
        this.prepareSource(value);
      }
    }
  },
  data: {
    assetId: 'gltfModel0',
    rotation: '0 25 0',
    scale: '1 1 1'
  },
  methods: {
    prepareSource(source) {
      if (!source) return;

      const assetId = `gltfModel${++assetSeed}`;
      this.setData({
        assetId,
        scale: this.resolveScale(source)
      });

      console.log('[xr-glb-viewer] xr load', source, assetId);
    },
    resolveScale(source) {
      if (/\/ToyCar\.glb(?:[?#].*)?$/i.test(source || '')) {
        return '30 30 30';
      }
      return '1 1 1';
    },
    handleAssetsProgress(event) {
      const detail = event && event.detail ? event.detail : {};
      const value = detail.value || detail;
      const progress = typeof value.progress === 'number' ? Math.round(value.progress * 100) : '';
      console.log('[xr-glb-viewer] assets progress', this.data.src, progress);
    },
    handleAssetsLoaded() {
      console.log('[xr-glb-viewer] assets loaded', this.data.src, this.data.assetId);
    },
    handleGltfLoaded() {
      console.log('[xr-glb-viewer] gltf loaded', this.data.src, this.data.assetId);
    }
  }
});
```

实战注意：

- 不要把 XR 原始事件对象直接 `setData`。
- 日志里尽量只打印字符串、数字、`assetId` 等简单值。
- `gltf-loaded` 后不要反复 `setData` 改 XR 节点，微信开发者工具里可能出现 renderer timeout。

## GLB 地址

当前项目默认使用 COS 全球加速资源：

```js
const DEFAULT_GLB_URL = 'https://autobss-1300679246.cos.accelerate.myqcloud.com/static/models/free_concept_car_006_-_public_domain_cc0.glb';
```

本地包内资源可以作为排查网络问题时的临时兜底：

```js
const localDebugUrl = '/static/models/ToyCarLite.glb';
```

建议：

- 优先用 HTTPS。
- 远程域名需要配置到小程序合法域名里。
- 如果排查渲染问题，先用本地 `/static/models/*.glb` 排除网络和域名影响。
- 不要盲目把所有 `/static/...` 转成 COS URL；本地包内路径可以直接传给 `xr-asset-load`。

## GLB 文件兼容性

微信 XR Frame 对 GLTF 有限制。常见要求：

- GLTF 2.0 / GLB。
- 不依赖未支持的 `extensionsRequired`。
- 顶点 UV 不超过 2 组。
- `JOINTS` 不超过 1 组。
- `WEIGHTS` 不超过 1 组。
- 不使用 sparse accessor。
- accessor 的 `normalized` 不为 `true`。
- morph target 数量不超过 8。
- primitive mode 不使用 `LINE_LOOP` 或 `TRIANGLE_FAN`。

如果控制台出现 GLTF validation error，可以根据错误码临时使用：

```xml
<xr-asset-load type="gltf" asset-id="..." src="..." options="ignoreError: 10602"></xr-asset-load>
```

`ignoreError: -1` 可以忽略所有错误，但不推荐作为默认方案。

## 排查顺序

遇到“加载成功但空白”，按这个顺序查：

1. 控制台是否有 `assets loaded` 和 `gltf loaded`。
2. `index.json` 是否有 `"renderer": "xr-frame"`。
3. 组件 WXML 顶层是否是 `<xr-scene>`。
4. 是否混入了 `<view>`、`<text>` 等普通节点。
5. 组件宿主和 `xr-scene` 是否有明确高度。
6. `xr-camera target` 是否是 `node-id`，不是坐标。
7. 模型是否太小、太大或离原点太远，需要调整 `scale`、`position`、相机位置。
8. GLB 是否有 XR Frame 不支持的扩展或 accessor。
9. 远程 URL 是否是 HTTPS，域名是否已配置。

## 当前项目的经验结论

这次库存页的问题经历过三个阶段：

1. GLB 远程地址和本地地址都能触发加载，但没有正确进入 XR renderer。
2. 加上原生组件和 `"renderer": "xr-frame"` 后，`assets loaded`、`gltf loaded` 能正常出现。
3. 最后仍然空白的关键点是相机 `target` 写成了坐标；改成真实 `node-id` 后才符合 XR Frame 相机规则。

后续新增模型时，先用一个简化 GLB 验证渲染链路，再替换正式模型。这样能把“模型文件问题”和“XR 场景配置问题”分开。
