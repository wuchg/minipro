// const baseUrl = 'http://127.0.0.1:8888/api'
const baseUrl = 'https://www.autoboss.cloud/api'

function handleUnauthorized() {
	// 清除 token
	uni.removeStorageSync('access_token')
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

function getAcceptLanguage() {
	const lang = uni.getStorageSync('language') || 'system'
	if (lang === 'system') {
		return uni.getLocale() || 'zh-CN'
	}
	const map = {
		zh: 'zh-CN',
		en: 'en-US',
		ru: 'ru-RU'
	}
	return map[lang] || 'en-US'
}

export function request(options) {
	const token = uni.getStorageSync('access_token') || ''
	const acceptLanguage = getAcceptLanguage()
	const requestUrl = (options.baseUrl || baseUrl) + options.url

	return new Promise((resolve, reject) => {
		uni.request({
			url: requestUrl, // 自动拼接（可按调用传 baseUrl 覆盖）
			method: options.method || 'GET',
			data: options.data || {},
			timeout: options.timeout ?? 10000,
			header: {
				'content-type': 'application/json',
				'Authorization': token ? `Bearer ${token}` : '',
				'Accept-Language': acceptLanguage
			},
			success(res) {
				if (res.statusCode === 401) {
					handleUnauthorized()
					return
				}
				resolve(res.data)
			},
			fail(err) {
				if (options.logFail !== false) {
					console.error('[api] fail', options.url, requestUrl, err)
				}
				reject(err)
			}
		})
	})
}
