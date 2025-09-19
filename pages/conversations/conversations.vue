<template>
	<view class="page">
		<view v-for="conv in conversations" :key="conv.id" class="conversation" @click="goChat(conv)">
			<image class="avatar" :src="conv.avatar"></image>
			<view class="info">
				<view class="top-row">
					<text class="title">{{ conv.target }}</text>
					<text class="time">{{ conv.time }}</text>
				</view>
				<view class="bottom-row">
					<text class="last-msg">{{ conv.content }}</text>
					<view v-if="conv.unread > 0" class="unread">{{ conv.unread }}</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import { checkLogin } from '@/common/auth.js'
	
	import * as RongIMLib from '@rongcloud/imlib-next'
	export default {

		data() {
			return {
				conversations: []
			}
		},
		onLoad() {
			const currentPage = '/pages/conversations/conversations'
			if (!checkLogin(currentPage)) return
			RongIMLib.getConversationList({
				count: 30
			}).then(
				res => {
					if (res.code === 0) {
						console.log(res.code, res.data)
						res.data.map(msg => {
							const lastMsg = msg.latestMessage;
							this.conversations.push({
								target: msg.targetId,
								time: lastMsg.sentTime,
								from: lastMsg.senderUserId,
								content: lastMsg.content.content,
								unread: msg.unreadMessageCount,
								l_m_id: lastMsg.messageId
							})
						})
					} else {
						console.log(res.code, res.msg)
					}
				}
			)
		},
		methods: {
			goChat(conv) {
				uni.navigateTo({
					//   cID 传过去,拉取最后一条消息
					url: `/pages/tempChat/tempChat?t_id=${conv.target}`
				})
			}
		}
	}
</script>

<style>
	.page {
		padding: 20rpx;
	}

	.conversation {
		display: flex;
		flex-direction: row;
		padding: 20rpx 0;
		border-bottom: 1rpx solid #eee;
	}

	.avatar {
		width: 100rpx;
		height: 100rpx;
		border-radius: 50%;
		margin-right: 20rpx;
	}

	.info {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}

	.top-row {
		display: flex;
		justify-content: space-between;
	}

	.title {
		font-weight: bold;
		font-size: 30rpx;
	}

	.time {
		color: #999;
		font-size: 24rpx;
	}

	.bottom-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.last-msg {
		color: #666;
		font-size: 26rpx;
	}

	.unread {
		background: red;
		color: #fff;
		border-radius: 50%;
		min-width: 40rpx;
		text-align: center;
		font-size: 24rpx;
		padding: 4rpx;
	}
</style>