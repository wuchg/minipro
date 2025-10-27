<template>
	<view></view>
</template>

<script>
import { checkLogin } from '@/common/auth.js';
export default {
	onLoad() {},
	onShow() {
		const currentPage = '/pages/contact/contact';
		if (!checkLogin(currentPage)) return;
		uni.redirectTo({
			url: '/TUIKit/components/TUIContact/index'
		});
	}
};
</script>
