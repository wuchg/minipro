<template>
	<div class="file-message-montainer" :title="TUITranslateService.t('TUIChat.单击下载')" @click="download">
		<Icon :file="files" class="file-icon" />
		<div>
			<div>{{ props.content.name }}</div>
			<div>{{ props.content.size }}</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { withDefaults } from '../../../../adapter-vue';
import { TUITranslateService, IMessageModel } from '@tencentcloud/chat-uikit-engine';
import Icon from '../../../common/Icon.vue';
import files from '../../../../assets/icon/file-light.svg';
import type { IFileMessageContent } from '../../../../interface';

const props = withDefaults(
	defineProps<{
		content: IFileMessageContent;
		messageItem: IMessageModel;
	}>(),
	{
		content: () => ({} as IFileMessageContent),
		messageItem: () => ({} as IMessageModel)
	}
);

const download = () => {
	if (props.messageItem.hasRiskContent) {
		return;
	}

	// #ifdef MP-WEIXIN
	// ✅ 微信小程序专用
	uni.downloadFile({
		url: props.content.url,
		success(res) {
			if (res.statusCode === 200) {
				console.log(props.content.url);
				console.log(res);
				const { tempFilePath } = res;
				const ext = tempFilePath.split('.').pop().toLowerCase();

				if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'].includes(ext)) {
					// 可直接用 openDocument 打开
					uni.openDocument({
						filePath: tempFilePath,
						showMenu: true,
						fail: (err) => {
							console.error('openDocument 失败', err);
							uni.showToast({ title: '文件类型不支持预览', icon: 'none' });
						}
					});
				} else if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
					// 图片预览
					uni.previewImage({
						urls: [tempFilePath]
					});
				} else if (['mp4', 'mov'].includes(ext)) {
					// 视频播放
					uni.navigateTo({
						url: `/pages/video-player/video-player?src=${encodeURIComponent(tempFilePath)}`
					});
				} else {
					uni.showToast({
						title: '暂不支持预览此文件类型',
						icon: 'none'
					});
				}
			}
		},
		fail(err) {
			console.error('下载失败', err);
			uni.showToast({
				title: '下载失败',
				icon: 'none'
			});
		}
	});
	// #endif

	// #ifdef H5
	const option = {
		mode: 'cors',
		headers: new Headers({
			'Content-Type': 'application/x-www-form-urlencoded'
		})
	} as RequestInit;
	// If the browser supports fetch, use blob to download, so as to avoid the browser clicking the a tag and jumping to the preview of the new page
	if ((window as any)?.fetch) {
		fetch(props.content.url, option)
			.then((res) => res.blob())
			.then((blob) => {
				const a = document.createElement('a');
				const url = window.URL.createObjectURL(blob);
				a.href = url;
				a.download = props.content.name;
				a.click();
			});
	} else {
		const a = document.createElement('a');
		a.href = props.content.url;
		a.target = '_blank';
		a.download = props.content.name;
		a.click();
	}
	// #endif
};
</script>
<style lang="scss" scoped>
@import '../../../../assets/styles/common';

.file-message-montainer {
	display: flex;
	flex-direction: row;
	cursor: pointer;

	.file-icon {
		margin: auto 8px;
	}
}
</style>
