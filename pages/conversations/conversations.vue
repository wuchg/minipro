<template>
	<view></view>
</template>

<script>
import { checkLogin } from '@/common/auth.js';
export default {
	onLoad() {},
	onShow() {
		const currentPage = '/pages/conversations/conversations';
		if (!checkLogin(currentPage)) return;
		uni.redirectTo({
			url: '/TUIKit/components/TUIConversation/index'
		});
	}
};
</script>
