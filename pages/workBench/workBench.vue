<template>
	<view class="workbench-page">
		<block v-if="menuList.length">
			<view class="menu-card" v-for="(item, index) in menuList" :key="index" @click="onItemClick(item)">
				<view class="menu-icon-box">
					<image :src="item.icon" class="menu-icon" mode="aspectFit"></image>
				</view>

				<view class="menu-info">
					<text class="menu-name">{{ item.name }}</text>
					<text class="menu-desc">{{ item.desc }}</text>
				</view>
				<text class="arrow">›</text>
			</view>
		</block>

		<view v-else class="empty">
			{{ $t('common.noData') }}
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
		// 用户变化时自动刷新菜单
		uni.$on('userChanged', (data) => {
			console.log('检测到用户变化:', data);
			this.loadMenus();
		});
	},
	onUnload() {
		uni.$off('userChanged');
	},
	methods: {
		loadMenus() {
			request({
				url: '/auth/workbench-menus'
			})
				.then((res) => {
					if (res.code === 0) {
						const base = getApp().globalData.baseImgUrl;
						this.menuList =
							res.data?.map((it) => ({
								name: it.name || '',
								desc: it.desc || it.name,
								icon: `/static/${it.icon}`,
								url: it.path ? '/pages' + it.path : ''
							})) || [];
					} else {
						uni.showToast({
							title: res.msg || this.$t('common.loadFail'),
							icon: 'none'
						});
					}
				})
				.catch((err) => {
					console.error('加载菜单失败', err);
					uni.showToast({
						title: this.$t('common.loadFail'),
						icon: 'none'
					});
				});
		},
		onItemClick(item) {
			if (item.url) {
				uni.navigateTo({ url: item.url });
			} else {
				uni.showToast({
					title: this.$t('common.pageNotSet') || '未设置跳转页面',
					icon: 'none'
				});
			}
		}
	}
};
</script>

<style scoped>
.workbench-page {
	background: #f7f8fa;
	min-height: 100vh;
	padding: 20rpx;
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}

/* 菜单卡片 */
.menu-card {
	display: flex;
	align-items: center;
	background: #fff;
	border-radius: 16rpx;
	padding: 20rpx 24rpx;
	box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
	transition: transform 0.2s;
}

.menu-card:active {
	transform: scale(0.98);
}

.menu-icon {
	width: 60rpx;
	height: 60rpx;
	margin-right: 20rpx;
}

.menu-info {
	flex: 1;
	display: flex;
	flex-direction: column;
}

.menu-name {
	font-size: 30rpx;
	color: #333;
	font-weight: 600;
	word-break: break-word;
}

.menu-desc {
	font-size: 24rpx;
	color: #888;
	margin-top: 4rpx;
	word-break: break-word;
}

.arrow {
	font-size: 38rpx;
	color: #bbb;
}

/* 空数据状态 */
.empty {
	text-align: center;
	color: #999;
	font-size: 28rpx;
	padding: 100rpx 0;
}
</style>
