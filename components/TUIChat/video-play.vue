<template>
	<div class="dialog-video">
		<video v-if="isShow" id="videoEle" class="video-box" :src="videoData" @longpress="onLongPress" controls autoplay />
	</div>
</template>

<script lang="ts" setup>
import { ref } from '../../adapter-vue';
import { TUIGlobal } from '@tencentcloud/universal-api';
import { onLoad, onReady } from '@dcloudio/uni-app';

const videoData = ref();
const isShow = ref(false);
const videoContext = ref();
onLoad((option: any) => {
	const decodedUrl = decodeURIComponent(option?.videoUrl);
	videoData.value = decodedUrl;
	isShow.value = true;
});

onReady(() => {
	isShow.value = true;
	videoContext.value = TUIGlobal.createVideoContext('videoEle');
});

function onLongPress() {
	showActionMenu();
}

function showActionMenu() {
	uni.showActionSheet({
		itemList: ['下载视频'],
		success: (res) => {
			if (res.tapIndex === 0) checkPermissionAndDownload();
		}
	});
}

function checkPermissionAndDownload() {
	uni.authorize({
		scope: 'scope.writePhotosAlbum',
		success: downloadVideo,
		fail: () => {
			uni.showModal({
				title: '提示',
				content: '需要授权保存到相册',
				success: (res) => {
					if (res.confirm) uni.openSetting();
				}
			});
		}
	});
}
function downloadVideo() {
	const url = videoData.value;
	if (!url) return;
	uni.showLoading({ title: '下载中...' });
	uni.downloadFile({
		url,
		success: (res) => {
			if (res.statusCode === 200) {
				uni.saveVideoToPhotosAlbum({
					filePath: res.tempFilePath,
					success: () => uni.showToast({ title: '已保存到相册' }),
					fail: () => uni.showToast({ title: '保存失败', icon: 'none' })
				});
			}
		},
		complete: uni.hideLoading
	});
}
</script>
<style lang="scss" scoped>
.dialog-video {
	position: fixed;
	z-index: 999;
	width: 100vw;
	height: 100vh;
	background: rgba(#000, 0.6);
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	display: flex;
	justify-content: center;
	align-items: center;

	.video-box {
		position: absolute;
		width: 100vw;
		height: 100vh;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
	}
}
</style>
