import { request } from '@/common/request.js';

// 稳定的匿名访客 ID（用于 UV 统计），首次生成后持久化
function getVisitorId() {
	let id = uni.getStorageSync('visitor_id');
	if (!id) {
		id = 'v_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
		uni.setStorageSync('visitor_id', id);
	}
	return id;
}

function currentPlatform() {
	// #ifdef MP-WEIXIN
	return 'mp-weixin';
	// #endif
	// #ifdef APP-PLUS
	return 'app';
	// #endif
	// #ifdef H5
	return 'h5';
	// #endif
	// eslint-disable-next-line no-unreachable
	return 'unknown';
}

let lastPath = '';
let lastAt = 0;

// 上报一次页面访问；埋点失败静默，不影响业务
export function reportPageView(path) {
	if (!path) return;
	const now = Date.now();
	// 300ms 内同一路径去重，避免 App 前台恢复时重复上报
	if (path === lastPath && now - lastAt < 300) return;
	lastPath = path;
	lastAt = now;

	request({
		url: '/analytics/pageview',
		method: 'POST',
		data: {
			path,
			visitorId: getVisitorId(),
			platform: currentPlatform()
		}
	}).catch(() => {});
}
