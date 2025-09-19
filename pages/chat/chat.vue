<template>
	<view class="chat-page">
		<scroll-view
			class="chat-scroll"
			scroll-y
			:scroll-into-view="scrollToView"
		>
			<view
				v-for="(msg, index) in messages"
				:key="index"
				:id="'msg_' + index"
				class="chat-message"
			>
				<view class="msg-bubble" :class="msg.from === 'me' ? 'me' : 'other'">
					<text>{{ msg.content }}</text>
				</view>
			</view>
		</scroll-view>

		<view class="chat-input">
			<input
				v-model="inputText"
				placeholder="输入消息..."
				confirm-type="send"
				@confirm="sendMessage"
			/>
			<button @click="sendMessage">发送</button>
		</view>
	</view>
</template>

<script>
import * as RongIMLib from '@rongcloud/imlib-next'
export default {
	data() {
		const conversation = { conversationType: RongIMLib.ConversationType.PRIVATE };
		return {
			carId: null,
			messages: [],
			inputText: '',
			scrollToView: '',
			targetId:null,
			conversation:conversation
		};
	},
	onLoad(options) {
		const Events = RongIMLib.Events
		const listener = (evt) => {
		  console.log(evt.messages)
		  const msg =evt.messages[0];
		  this.conversation.targetId = msg.senderUserId;
		  this.messages.push({
		  	from: msg.senderUserId,
		  	content: msg.senderUserId+":"+msg.content.content+" At "+ msg.sentTime
		  });
		};
		RongIMLib.addEventListener(Events.MESSAGES, listener)
		//  获取历史记录
		RongIMLib.getConversationList({
			count:30
		}).then(
		res => {
		  if (res.code === 0) {
		    console.log(res.code, res.data)
			res.data.map(msg=>{
				this.targetId = msg.latestMessage.senderUserId;
				this.messages.push({
					from: msg.latestMessage.senderUserId,
					content:msg.latestMessage.senderUserId+":"+msg.latestMessage.content.content+" At "+ msg.latestMessage.sentTime
				})
			})
		  } else {
		    console.log(res.code, res.msg)
		  }
		}
		)
		this.groupId = options.groupId;
		this.carId = options.carId;
		this.scrollToBottom();
	},
	methods: {
		sendMessage() {
			if (!this.inputText.trim()) return;
			const message = new RongIMLib.TextMessage({ content: this.inputText.trim() })
			RongIMLib.sendMessage(this.conversation, message).then(res => {
			  if (res.code === RongIMLib.ErrorCode.SUCCESS) {
			    // 消息发送成功，可以根据返回结果中的 messageId 字段将列表中的该消息状态改为发送成功。
			    console.log('消息发送成功', res.data)
				this.messages.push({
					from: this.targetId,
					content: this.inputText
				});
				this.inputText = '';
				this.scrollToBottom();
			  } else {
			    console.log('消息发送失败', res.code, res.msg)
			  }
			})
		},
		scrollToBottom() {
			this.scrollToView = `msg_${this.messages.length - 1}`;
		}
	}
};
</script>

<style>
.chat-page {
	display: flex;
	flex-direction: column;
	height: 100vh;
}

.chat-scroll {
	flex: 1;
	padding: 20rpx;
	background: #f5f5f5;
}

.chat-message {
	margin-bottom: 20rpx;
}

.msg-bubble {
	display: inline-block;
	padding: 16rpx 20rpx;
	border-radius: 12rpx;
	max-width: 70%;
	font-size: 28rpx;
	line-height: 40rpx;
	word-break: break-word;
}

.msg-bubble.me {
	background-color: #9eea6a;
	align-self: flex-end;
}

.msg-bubble.other {
	background-color: #fff;
	border: 1rpx solid #ddd;
}

.chat-input {
	display: flex;
	padding: 10rpx;
	background: #fff;
	border-top: 1rpx solid #ddd;
}

.chat-input input {
	flex: 1;
	padding: 10rpx;
	font-size: 28rpx;
	border: 1rpx solid #ddd;
	border-radius: 8rpx;
	margin-right: 10rpx;
}
</style>
