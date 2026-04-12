<script lang="ts">
export default {
	onLaunch: function () {
		// 拦截 navigateTo
		uni.addInterceptor('navigateTo', {
			invoke(e) {
				const whiteList = ['/pages/index/index', '/pages/login/login', '/pages/order/detail'];
				const accessToken = uni.getStorageSync('access_token');
				if (!accessToken && !whiteList.includes(e.url.split('?')[0])) {
					uni.navigateTo({
						url: `/pages/login/login?redirect=${encodeURIComponent(e.url)}`
					});
					return false;
				}
			}
		});
		console.log('App Launch');
	},
	onShow: function () {
		console.log('App Show');
	},
	onHide: function () {
		console.log('App Hide');
	},
	globalData: {
		baseUrl: 'https://www.autoboss.cloud/api',
		// baseUrl: 'http://127.0.0.1:8888/api',
		baseImgUrl: 'https://img.autoboss.cloud'
	}
};
</script>

<style>
uni-page-body,
html,
body,
page {
	width: 100% !important;
	height: 100% !important;
	overflow: hidden;
}
</style>
