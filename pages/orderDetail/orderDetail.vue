<template>
	<view class="page">
		<scroll-view scroll-y class="timeline-wrapper">
			<!-- 左侧竖线 -->
			<view class="timeline-line"></view>
			<view v-for="(item, idx) in timeline" :key="idx" class="timeline-item" :class="[item.status]">
				<!-- dot -->
				<view class="dot"></view>

				<view class="content">
					<!-- 阶段名称 + 箭头 -->
					<view class="item-title-wrapper" @tap="toggleCard(idx)">
						<text class="item-title">{{ item.title }}</text>
						<text class="collapse-icon-text">{{ item.open ? '▲' : '▼' }}</text>
					</view>
					<text class="item-time">{{ item.time }}</text>
					<!-- 卡片内容 -->
					<view class="card" v-show="item.open">
						<view class="card-content">
							<!-- <text class="desc">{{ item.desc }}</text> -->
							<image v-if="item.img" :src="item.img" mode="widthFix" class="card-img"></image>
							<video v-if="item.video" :src="item.video" controls class="card-video"></video>
							<text v-if="item.file" class="card-file" :class="{ 'disabled-file': !item.downloadable }" @tap="item.downloadable && downloadFile(item.fileUrl)">
								{{ item.file }}
								<text v-if="item.downloadable">⬇️</text>
							</text>
						</view>
					</view>
				</view>
			</view>
		</scroll-view>
	</view>
</template>

<script>
import { request } from '@/common/request.js';
export default {
	data() {
		return {
			orderId: null,
			timeline: []
		};
	},
	onLoad(query) {
		this.orderId = query.orderId || null;
		this.trackOrder(this.orderId);
	},
	methods: {
		toggleCard(idx) {
			this.timeline[idx].open = !this.timeline[idx].open;
		},
		trackOrder(orderId) {
			request({
				url: '/orders/' + orderId
			}).then((res) => {
				if (res.code === 0) {
					const trackRecords = res.data.stages;
					trackRecords?.map((it) => {
						this.timeline.push({
							title: it.stageLabel,
							time: it.createdAt,
							desc: it.stageLabel,
							img: it.img ? 'https://img.autoboss.cloud' + it.img : null,
							video: it.video ? 'https://img.autoboss.cloud' + it.video : null,
							file: it.file ? 'https://img.autoboss.cloud' + it.file : null,
							fileName: it.fileName,
							status: it.createdAt === '' ? 'future' : 'completed',
							open: it.createdAt === '' ? false : true
						});
					});
				} else {
					uni.showToast({
						title: res.msg || '加载失败',
						icon: 'none'
					});
					return;
				}
			});
		},
		// 下载并打开文件
		downloadFile(fileUrl) {
			uni.downloadFile({
				url: fileUrl,
				success: (res) => {
					if (res.statusCode === 200) {
						// 打开文档（微信小程序、App 生效）
						uni.openDocument({
							filePath: res.tempFilePath,
							showMenu: true,
							success: () => {
								console.log('打开文档成功');
							}
						});
					}
				},
				fail: (err) => {
					uni.showToast({
						title: '下载失败',
						icon: 'none'
					});
					console.error('下载失败', err);
				}
			});
		}
	}
};
</script>

<style>
.page {
	background: #f4f6fa;
	height: 100vh;
	position: relative;
	display: flex;
	flex-direction: column;
}

.timeline-wrapper {
	padding-left: 40rpx;
	position: relative;
	flex: 1;
	overflow: hidden;
}

/* 左侧整条竖线 */
.timeline-line {
	position: absolute;
	left: 12rpx;
	/* dot 中心 */
	top: 0;
	bottom: 0;
	width: 4rpx;
	background: #ccc;
	z-index: 0;
}

.timeline-item {
	position: relative;
	display: flex;
	margin-bottom: 40rpx;
	z-index: 1;
}

.dot {
	width: 24rpx;
	height: 24rpx;
	border-radius: 50%;
	background: #0078d7;
	position: absolute;
	left: 0;
	top: 0;
	z-index: 1;
}

.timeline-item.completed .dot {
	background: #b0b0b0;
}

.timeline-item.future .dot {
	background: #9e9e9e;
}

.timeline-item.doing .dot {
	background: #ff9800;
}

.content {
	flex: 1;
	margin-left: 40rpx;
	/* dot 与内容间距 */
}

.item-title-wrapper {
	display: flex;
	/*justify-content: space-between;*/
	align-items: center;
	cursor: pointer;
	position: relative;
	z-index: 2;
	/* 保证箭头显示在 dot 上层 */
}

.item-title {
	font-size: 28rpx;
	font-weight: bold;
	color: #333;
	flex-shrink: 0;
	max-width: 70%;
}

.collapse-icon-text {
	font-size: 28rpx;
	color: #0078d7;
	flex-shrink: 0;
	margin-left: 8rpx;
}

.item-time {
	font-size: 24rpx;
	color: #666;
	margin-top: 6rpx;
}

.card {
	background: #fff;
	border-radius: 12rpx;
	padding: 20rpx;
	margin-top: 16rpx;
	box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.card-content {
	margin-top: 16rpx;
}

.desc {
	font-size: 26rpx;
	color: #444;
	margin-bottom: 12rpx;
	display: block;
}

.card-img,
.card-video {
	/* 	width: 100% */
	border-radius: 8rpx;
	margin-top: 12rpx;
}

.card-file {
	color: #0078d7;
	font-size: 24rpx;
	margin-top: 8rpx;
	display: block;
}
.disabled-file {
	color: #999;
}
</style>
