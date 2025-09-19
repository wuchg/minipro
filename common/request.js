const baseUrl = 'http://127.0.0.1:8888/api'

export function request(options) {
  const token = uni.getStorageSync('token') || ''
  return new Promise((resolve, reject) => {
    uni.request({
      url: baseUrl + options.url, // 自动拼接
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        Authorization: token ? `Bearer ${token}` : ''
      },
      success: (res) => resolve(res.data),
      fail: (err) => reject(err)
    })
  })
}
