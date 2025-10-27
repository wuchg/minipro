// const baseUrl = 'http://127.0.0.1:8888/api'
const baseUrl = 'https://www.autoboss.cloud/api'

function handleUnauthorized() {
	// 清除 token
	uni.removeStorageSync('access_token')
	uni.removeStorageSync('IMID');
	uni.removeStorageSync('IM_token');
	// 当前页面路径
	const pages = getCurrentPages()
	const currentPage = pages[pages.length - 1]
	const currentPath = '/' + currentPage.route
	const query = currentPage.options ?
		Object.keys(currentPage.options)
		.map(k => `${k}=${encodeURIComponent(currentPage.options[k])}`)
		.join('&') :
		''
	const redirectUrl = query ? `${currentPath}?${query}` : currentPath
	console.log(redirectUrl)
	// 跳转到登录页并传参 redirect
	uni.redirectTo({
		url: `/pages/login/login?redirect=${encodeURIComponent(redirectUrl)}`
	})
}

export function request(options) {
	const token = uni.getStorageSync('access_token') || ''
	return new Promise((resolve, reject) => {
		uni.request({
			url: baseUrl + options.url, // 自动拼接
			method: options.method || 'GET',
			data: options.data || {},
			header: {
				'content-type': 'application/json',
				'Authorization': token ? `Bearer ${token}` : ''
			},
			success(res) {
				if (res.statusCode === 401) {
					handleUnauthorized()
					return
				}
				resolve(res.data)
			},
			fail(err) {
				reject(err)
			}
		})
	})
}