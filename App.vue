<script>
	import * as RongIMLib from '@rongcloud/imlib-next'

	export default {
		onLaunch: function() {
			// 拦截 navigateTo
			uni.addInterceptor('navigateTo', {
				invoke(e) {
					const whiteList = ['/pages/index/index', '/pages/login/login','/pages/order/detail']
					const accessToken = uni.getStorageSync('access_token')
					if (!accessToken && !whiteList.includes(e.url.split('?')[0])) {
						uni.navigateTo({
							url: `/pages/login/login?redirect=${encodeURIComponent(e.url)}`
						})
						return false
					}
				}
			})

			console.log('App Launch')
			RongIMLib.init({
				appkey: '25wehl3u24ulw'
			});
			const userToken = uni.getStorageSync('userToken')
			console.log('用户信息:', userToken)
			RongIMLib.connect(userToken ||
				'QoCqUCAmfiqpbF5Zv+UbMxXQA7x9k1dfttDALQwnpCY=@iw33.cn.rongnav.com;iw33.cn.rongcfg.com').then((
				res) => {
					if (res.code === 0) {
						console.log(res.data.userId)
						uni.setStorageSync("userId", res.data.userId)
					}
				})
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
		},
		globalData: {
			baseUrl: 'http://127.0.0.1:8888/api'
		}
	}
</script>

<style>
	/*每个页面公共css */
</style>