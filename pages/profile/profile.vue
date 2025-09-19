<template>
  <view class="profile-page">
    <view class="avatar">
      <image src="/static/icons/user.png" class="avatar-img"></image>
    </view>
    <view class="user-info">
      <text class="user-name">游客用户</text>
      <text class="user-id">ID: 123456</text>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {}
  }
}
</script>

<style>
.profile-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx;
}
.avatar-img {
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
}
.user-info {
  margin-top: 20rpx;
  text-align: center;
}
.user-name {
  font-size: 36rpx;
  font-weight: bold;
}
.user-id {
  font-size: 28rpx;
  color: #888;
}
</style>
