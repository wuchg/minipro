<template>
	<div class="message-video">
		<div class="message-video-box" @click="handlerVideoPlay" @longpress="onLongPress">
			<image :src="props.content.snapshotUrl" class="message-video-box" />
			<Icon v-if="props.messageItem.status === 'success' || props.messageItem.progress === 1" class="video-play" :file="playIcon" />
		</div>
	</div>
</template>

<script lang="ts" setup>
import { withDefaults } from '../../../../adapter-vue';
import type { IMessageModel } from '@tencentcloud/chat-uikit-engine';
import Icon from '../../../common/Icon.vue';
import playIcon from '../../../../assets/icon/video-play.png';
import type { IVideoMessageContent } from '../../../../interface';

const props = withDefaults(
	defineProps<{
		content: IVideoMessageContent;
		messageItem: IMessageModel;
	}>(),
	{
		content: () => ({} as IVideoMessageContent),
		messageItem: () => ({} as IMessageModel)
	}
);

function handlerVideoPlay() {
	const encodedUrl = encodeURIComponent(props.content.url);
	uni.navigateTo({
		url: `/components/TUIChat/video-play?videoUrl=${encodedUrl}`
	});
}

function showActionMenu() {
	uni.showActionSheet({
		itemList: ['下载视频'],
		success: (res) => {
			switch (res.tapIndex) {
				case 0:
					downloadVideo();
					break;
				case 1:
					break;
				case 2:
					break;
			}
		}
	});
}

function onLongPress() {
	showActionMenu();
}

function onMoreClick() {
	showActionMenu();
}

function downloadVideo() {
	const url = props.content.url;
	if (!url) return;
	uni.showLoading({ title: '下载中...' });
	uni.downloadFile({
		url,
		success: (res) => {
			if (res.statusCode === 200) {
				// 保存到相册
				uni.saveVideoToPhotosAlbum({
					filePath: res.tempFilePath,
					success: () => uni.showToast({ title: '已保存到相册' }),
					fail: () => uni.showToast({ title: '保存失败', icon: 'none' })
				});
			}
		},
		complete: () => {
			uni.hideLoading();
		}
	});
}
</script>
<style lang="scss" scoped>
.message-video {
	position: relative;

	&-box {
		width: 120px;
		max-width: 120px;
		background-color: rgba(#000, 0.3);
		border-radius: 6px;
		height: 200px;
		font-size: 0;
	}

	.video-play {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
	}
	.video-more {
		position: absolute;
		right: 6px;
		bottom: 6px;
		width: 20px;
		height: 20px;
		opacity: 0.8;
	}
}

.message-video-box:active {
	opacity: 0.8;
	transform: scale(0.98);
}
</style>
