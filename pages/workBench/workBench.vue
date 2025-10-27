<template>
	<view class="workbench-page">
		<view class="workbench-grid">
			<view class="grid-item" v-for="(item, index) in menuList" :key="index" @click="onItemClick(item)">
				<image :src="item.icon" class="grid-icon" mode="aspectFit"></image>
				<text class="grid-text">{{ item.name }}</text>
			</view>
		</view>
	</view>
</template>

<script>
import { request } from '@/common/request.js';
export default {
	data() {
		return {
			menuList: []
		};
	},
	onLoad() {
		this.loadMenus();
		// 监听页面变化
		uni.$on('userChanged', (data) => {
			console.log('检测到用户变化:', data);
			this.loadMenus(); // 重新加载工作台菜单
		});
	},
	onUnload() {
		uni.$off('userChanged');
	},
	methods: {
		loadMenus() {
			request({
				url: '/auth/workbench-menus'
			}).then((res) => {
				if (res.code === 0) {
					this.menuList = [];
					const data = res.data;
					data?.forEach((it) => {
						this.menuList.push({ name: it.name, icon: `${getApp().globalData.baseImgUrl}/workbench/` + it.icon, url: '/pages' + it.path });
					});
				}
			});
		},
		onItemClick(item) {
			if (item.url) {
				uni.navigateTo({ url: item.url });
			} else {
				uni.showToast({
					title: `未设置跳转页面`,
					icon: 'none'
				});
			}
		}
	}
};
</script>

<style scoped>
.workbench-page {
	padding: 20rpx;
	background-color: #f5f5f5;
	min-height: 100vh;
}

.workbench-grid {
	display: flex;
	flex-wrap: wrap;
	justify-content: space-between;
}

.grid-item {
	width: 23%;
	margin-bottom: 30rpx;
	background-color: #fff;
	border-radius: 16rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 20rpx 0;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.grid-icon {
	width: 60rpx;
	height: 60rpx;
	margin-bottom: 10rpx;
}

.grid-text {
	font-size: 26rpx;
	color: #333;
	text-align: center;
}
</style>