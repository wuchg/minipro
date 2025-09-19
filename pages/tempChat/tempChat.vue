<template>
	<view class="chat-page">
		<scroll-view scroll-y class="chat-list" :scroll-into-view="scrollIntoView">
			<view v-for="(msg, idx) in messages" :key="idx" :id="'msg-' + idx"
				:class="['msg-item', msg.direction === 'SEND' ? 'msg-right' : 'msg-left']">
				<!-- 接收消息头像在前 -->
				<image v-if="msg.direction === 'RECEIVE'" :src="msg.avatar" class="avatar" />

				<view class="msg-content">{{ msg.content }}</view>

				<!-- 发送消息头像在后 -->
				<image v-if="msg.direction === 'SEND'" :src="msg.avatar" class="avatar" />
			</view>
		</scroll-view>

		<!-- 底部输入区 -->
		<view class="chat-input-bar">
			<input v-model="inputText" class="chat-input" placeholder="输入消息..." @focus="closePanel" />
			<!-- 根据 inputText 显示发送或加号 -->
			<view v-if="inputText.trim()" class="send-btn" @click="sendMsg">发送</view>
			<view v-else class="add-btn" @click="togglePanel">➕</view>
		</view>
		<!-- 底部弹出功能面板 -->
		<view v-if="showPanel" class="panel">
			<view class="panel-item" @click="chooseImage">图片</view>
			<view class="panel-item" @click="takePhoto">拍照</view>
			<view class="panel-item" @click="otherAction">其他</view>
		</view>
	</view>
</template>

<script>
	import { checkLogin } from '@/common/auth.js'
	import * as RongIMLib from '@rongcloud/imlib-next'
	export default {
		data() {
			return {
				carId: null,
				userId: uni.getStorageSync('userId'),
				inputText: '',
				showPanel: false,
				scrollIntoView: '',
				messages: []
			}
		},
		onLoad(query) {
			// 接收参数，例如 carId
			this.carId = query.carId || null;
			// 如果是从详情页面点击尽量，target 则是随机的客服编号
			this.target = query.t_id || '17718388207';
			console.log('临时会话 carId=', this.carId);
			console.log('临时会话 target=', this.target);

			const conversation = {
				conversationType: RongIMLib.ConversationType.PRIVATE,
				targetId: this.target
			}

			// 从当前时间开始向前查询
			const option = {
				timestamp: 0,
				count: 20,
				order: 0
			}

			RongIMLib.getHistoryMessages(conversation, option).then(res => {
				// 己方发送消息 = 1，己方接收消息=2
				// https://docs.rongcloud.io/apidoc/im-web/v5.10.1/enums/MessageDirection.html
				if (res.code === 0) {
					console.log(res.data.list)
					console.log(res.data.hasMore)
					res.data.list?.forEach(msg => {
						this.messages.push({
							sender: msg.senderUserId,
							avatar: '/static/avatar.png',
							content: msg.content.content,
							direction: msg.messageDirection == 1 ? 'SEND' : 'RECEIVE'
						})
					});
					  // 加载完成后，滚动到底部
					    this.$nextTick(() => {
					      this.scrollIntoView = 'msg-' + (this.messages.length - 1)
					    })

				} else {
					console.log(res.code, res.msg)
				}
			})

			// 监听消息
			RongIMLib.addEventListener(RongIMLib.Events.MESSAGES, (evt) => {
				evt.messages.forEach(msg => {
					this.messages.push({
						sender: msg.senderUserId ,
						avatar: '/static/avatar.png',
						direction: msg.messageDirection == 1 ? 'SEND' : 'RECEIVE',
						content: msg.content?.content
					})
				});
				// 滚动到最后一条
				this.$nextTick(() => {
					this.scrollIntoView = 'msg-' + (this.messages.length - 1);
				});
			})
		},
		// onShow() {
		// 	// 滚动到最后一条
		// 	this.$nextTick(() => {
		// 		this.scrollIntoView = 'msg-' + (this.messages.length - 1);
		// 	});
		// },
		onUnload() {
			// 离开页面即销毁，不保存 messages
			this.messages = []
		},
		methods: {
			sendMsg() {
				if (!this.inputText.trim()) return
				const conversation = {
					targetId: this.target,
					conversationType: RongIMLib.ConversationType.PRIVATE
				}
				const msg = new RongIMLib.TextMessage({
					content: this.inputText,
					extra: `car=${this.carId}`
				})
				RongIMLib.sendMessage(conversation, msg).then(res => {
					if (res.code === RongIMLib.ErrorCode.SUCCESS) {
						this.messages.push({
							sender: 'me',
							avatar: '/static/avatar.png',
							content: this.inputText,
							direction: 'SEND'
						})
						this.inputText = '',
							// 滚动到最后一条
							this.$nextTick(() => {
								this.scrollIntoView = 'msg-' + (this.messages.length - 1);
							});
					}
				})
			},
			togglePanel() {
				this.showPanel = !this.showPanel;
			},
			closePanel() {
				this.showPanel = false;
			},
			chooseImage() {
				uni.chooseImage({
					count: 1,
					success: (res) => {
						console.log('选择图片', res.tempFilePaths);
						this.showPanel = false;
					}
				});
			},
			takePhoto() {
				uni.chooseImage({
					count: 1,
					sourceType: ['camera'],
					success: (res) => {
						console.log('拍照', res.tempFilePaths);
						this.showPanel = false;
					}
				});
			},
			otherAction() {
				uni.showToast({
					title: '其他功能',
					icon: 'none'
				});
				this.showPanel = false;
			}
		}
	}
</script>

<style>
	.avatar {
		width: 32px;
		height: 32px;
		border-radius: 50%;
		margin: 0 8px;
	}

	.chat-list {
		display: flex;
		flex-direction: column;
		padding: 0;
		/* 去掉内边距，让消息可以贴边 */
	}

	.msg-item {
		display: flex;
		margin: 5px 0;
		max-width: 100%;
		/* 消息气泡最大宽度 */
		align-items: flex-end;
	}

	/* 接收消息靠左 */
	.msg-left {
		justify-content: flex-start;
		flex-direction: row;
	}

	/* 发送消息靠右 */
	.msg-right {
		justify-content: flex-end;
		/* 整体靠右 */
		flex-direction: row;
	}

	/* 消息内容 */
	.msg-content {
		padding: 8px 12px;
		border-radius: 8px;
		background-color: #f0f0f0;
	}

	/* 发送消息内容 */
	.msg-right .msg-content {
		background-color: #4f90ff;
		color: white;
	}

	.chat-page {
		display: flex;
		flex-direction: column;
		height: 100vh;
	}

	.chat-list {
		flex: 1;
		padding: 10px;
		overflow-y: auto;
	}

	/* 底部输入区 */
	.chat-input-bar {
		display: flex;
		padding: 6px 10px;
		border-top: 1px solid #eee;
		align-items: center;
		background-color: #fff;
	}

	.chat-input {
		flex: 1;
		height: 36px;
		padding: 0 10px;
		border-radius: 18px;
		border: 1px solid #ccc;
		background-color: #f9f9f9;
	}

	/* 发送按钮 */
	.send-btn {
		margin-left: 8px;
		padding: 6px 12px;
		background-color: #4f90ff;
		color: #fff;
		border-radius: 18px;
		font-size: 14px;
	}

	/* 加号按钮 */
	.add-btn {
		margin-left: 8px;
		width: 36px;
		height: 36px;
		border-radius: 50%;
		border: 1px solid #ccc;
		text-align: center;
		line-height: 36px;
		font-size: 20px;
		color: #333;
	}

	/* 弹出面板 */
	.panel {
		position: absolute;
		bottom: 56px;
		/* 输入栏高度 + margin */
		left: 0;
		width: 100%;
		background-color: #f9f9f9;
		border-top: 1px solid #eee;
		display: flex;
		padding: 10px 0;
	}

	.panel-item {
		flex: 1;
		text-align: center;
		font-size: 16px;
		color: #333;
	}
</style>