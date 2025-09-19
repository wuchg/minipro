export const whiteList = [
  '/pages/index/index',
  '/pages/login/login',
]

// 检查是否登录
export function checkLogin(targetUrl) {
  const accessToken = uni.getStorageSync('access_token')
  if (!accessToken && !whiteList.includes(targetUrl?.split('?')?.[0])) {
    uni.navigateTo({
      url: `/pages/login/login?redirect=${encodeURIComponent(targetUrl)}`
    })
    return false
  }
  return true
}
