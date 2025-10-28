<template>
	<view class="page">
		<scroll-view scroll-y class="timeline-wrapper">
			<view v-for="(item, idx) in timeline" :key="idx" class="timeline-item">
				<!-- dot -->
				<view class="dot" :class="item.status"></view>

				<!-- vertical line -->
				<view v-if="idx !== timeline.length - 1" class="timeline-segment" :class="item.status"></view>

				<view class="content">
					<view class="item-title-wrapper" @tap="toggleCard(idx)">
						<text class="item-title">{{ item.title }}</text>
						<text class="collapse-icon-text">{{ item.open ? '▲' : '▼' }}</text>
					</view>
					<text class="item-time">{{ item.time }}</text>

					<view class="card" v-show="item.open">
						<view class="card-content">
							<template v-if="!item.img && !item.video && !item.fileName">
								<view class="card-placeholder fade-in">
									<image :src="noDataImg" class="placeholder-img"></image>
									<text class="placeholder-text">暂无数据</text>
								</view>
							</template>

							<image v-if="item.img" :src="item.img" mode="widthFix" class="card-media" @tap="previewMedia(item.img)"></image>

							<video v-if="item.video" :src="item.video" controls class="card-media" @longpress="handleMedia(item.video)"></video>

							<text v-if="item.fileName && item.downloadable" class="card-file" @longpress="handleMedia(item.fileUrl)">{{ item.fileName }}️</text>
							<text v-else-if="item.fileName" class="card-file no-data">{{ item.fileName }}</text>
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
			timeline: [],
			noDataImg: `${getApp().globalData.baseImgUrl}/static/no_data.png`
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
			request({ url: '/orders/' + orderId }).then((res) => {
				if (res.code === 0) {
					const trackRecords = res.data.stages || [];
					this.timeline = trackRecords.map((it) => ({
						title: it.stageLabel,
						time: it.createdAt,
						img: it.img ? `${getApp().globalData.baseImgUrl}/` + it.img : null,
						video: it.video ? `${getApp().globalData.baseImgUrl}/` + it.video : null,
						fileUrl: it.file ? `${getApp().globalData.baseImgUrl}/` + it.file : null,
						fileName: it.fileName || '',
						status: it.createdAt ? 'completed' : 'future',
						open: true,
						downloadable: !!it.file
					}));
				} else {
					uni.showToast({ title: res.msg || '加载失败', icon: 'none' });
				}
			});
		},
		handleMedia(url) {
			if (!url) return;
			uni.downloadFile({
				url,
				success: (res) => {
					if (res.statusCode === 200) {
						const ext = url.split('.').pop().toLowerCase();
						if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) {
							uni.saveVideoToPhotosAlbum({
								filePath: res.tempFilePath,
								success: () => uni.showToast({ title: '视频已保存', icon: 'success' }),
								fail: () => uni.showToast({ title: '保存失败', icon: 'none' })
							});
						} else {
							uni.openDocument({ filePath: res.tempFilePath, showMenu: true });
						}
					}
				},
				fail: () => uni.showToast({ title: '下载失败', icon: 'none' })
			});
		},
		previewMedia(url) {
			if (!url) return;
			uni.previewImage({ urls: [url], current: url });
		}
	}
};
</script>

<style>
.page {
	background: #f4f6fa;
	height: 100vh;
	display: flex;
	flex-direction: column;
}
.timeline-wrapper {
	padding-left: 40rpx;
	position: relative;
	flex: 1;
	overflow: hidden;
}
.timeline-item {
	position: relative;
	display: flex;
	margin-bottom: 40rpx;
}
.dot {
	width: 24rpx;
	height: 24rpx;
	border-radius: 50%;
	position: absolute;
	left: 12rpx;
	top: 0;
	z-index: 1;
}
.dot.completed {
	background: #b0b0b0;
}
.dot.future {
	background: #9e9e9e;
}
.timeline-segment {
	position: absolute;
	left: 23rpx; /* dot中心对齐 */
	width: 4rpx;
	top: 24rpx;
	bottom: -40rpx; /* 覆盖到下一个 dot */
	z-index: 0;
}
.timeline-segment.completed {
	background: #b0b0b0;
}
.timeline-segment.future {
	background: #9e9e9e;
}

.content {
	flex: 1;
	margin-left: 60rpx;
}
.item-title-wrapper {
	display: flex;
	align-items: center;
	cursor: pointer;
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
.card-media {
	width: 90%;
	height: 300rpx;
	border-radius: 8rpx;
	margin-top: 12rpx;
	background: #f0f0f0;
	object-fit: contain;
}
.card-placeholder {
	width: 90%;
	height: 600rpx;
	border-radius: 8rpx;
	margin-top: 12rpx;
	background: #f0f0f0;
	display: flex;
	align-items: center;
	justify-content: center;
	position: relative;
}
.placeholder-img {
	width: 120rpx;
	height: 120rpx;
	opacity: 0.5;
	object-fit: contain;
}
.placeholder-text {
	color: #999;
	font-size: 28rpx;
	font-weight: bold;
}
.card-file {
	color: #0078d7;
	font-size: 24rpx;
	margin-top: 12rpx;
	display: block;
	cursor: pointer;
}
.no-data {
	opacity: 0.5;
	cursor: default;
}
@keyframes fadeIn {
	from {
		opacity: 0;
	}
	to {
		opacity: 0.5;
	}
}
.fade-in {
	animation: fadeIn 0.5s ease-in-out;
}
</style>
