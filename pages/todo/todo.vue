<template>
	<view class="page">
		<scroll-view class="list" scroll-y :lower-threshold="100" @scrolltolower="onReachBottom" @scrolltoupper="onScrollTop">
			<block v-if="todos.length">
				<view class="todo-item" v-for="todo in todos" :key="todo.todoId">
					<image class="todo-thumb" :src="fullImg(todo.carThumbnail)" mode="aspectFill" />

					<view class="todo-info">
						<view class="todo-title">{{ todo.carSummary }}</view>
						<!-- <text class="todo-sub">订单号：{{ todo.orderNo }}</text> -->
						<text class="todo-sub">VIN：{{ todo.vin }}</text>
						<view class="todo-action">
							<button class="action-btn" @click="handleAction(todo)">
								{{ actionText(todo.actionName) }}
							</button>
						</view>
					</view>
				</view>
			</block>

			<view v-else class="empty">暂无待办任务</view>
			<view class="loading" v-if="loading">加载中...</view>
			<view class="no-more" v-if="noMore">没有更多了</view>
		</scroll-view>
	</view>
</template>

<script>
import { request } from '@/common/request.js';
import { checkLogin } from '@/common/auth.js';

export default {
	data() {
		return {
			page: 1,
			pageSize: 10,
			todos: [],
			loading: false,
			noMore: false
		};
	},
	onLoad() {
		const currentPage = '/pages/todoList/todoList';
		if (!checkLogin(currentPage)) return;
		this.loadTodos(true);
	},
	onPullDownRefresh() {
		this.page = 1;
		this.noMore = false;
		this.todos = [];
		this.loadTodos(true);
	},
	methods: {
		fullImg(path) {
			if (!path) return '/static/img/default_car.png';
			if (path.startsWith('http')) return path;
			return `https://img.autoboss.cloud/${path}`;
		},

		actionText(actionName) {
			return actionName;
		},

		handleAction(todo) {
			uni.navigateTo({
				url: `/pages/todoHandle/todoHandle?orderNo=${todo.orderNo}&todoId=${todo.todoId}&orderId=${todo.orderId}&actionCode=${todo.actionCode}&actionName=${todo.actionName}`
			});
		},

		loadTodos(isRefresh = false) {
			if (this.loading) return;
			this.loading = true;
			request({
				url: `/todos?page_size=${this.pageSize}&page_num=${this.page}`
			})
				.then((res) => {
					if (res.code !== 0) {
						uni.showToast({
							title: res.msg || '加载失败',
							icon: 'none'
						});
						return;
					}

					const items = res.data?.todos || [];
					if (isRefresh) {
						this.todos = items;
					} else {
						this.todos = [...this.todos, ...items];
					}

					if (items.length < this.pageSize) this.noMore = true;
				})
				.finally(() => {
					this.loading = false;
					uni.stopPullDownRefresh();
				});
		},

		onReachBottom() {
			if (this.loading || this.noMore) return;
			this.page++;
			this.loadTodos(false);
		},
		onScrollTop() {}
	}
};
</script>

<style>
.page {
	background: #f5f6f8;
	height: 100vh;
}

.list {
	flex: 1;
	height: 100vh;
}

.todo-item {
	display: flex;
	background: #fff;
	margin: 18rpx 20rpx;
	border-radius: 12rpx;
	padding: 18rpx;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
	align-items: center;
}

.todo-thumb {
	width: 200rpx;
	height: 130rpx;
	border-radius: 8rpx;
	margin-right: 20rpx;
	flex-shrink: 0;
}

.todo-info {
	flex: 1;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
}

.todo-title {
	font-size: 30rpx;
	font-weight: 600;
	color: #222;
	margin-bottom: 8rpx;
}

.todo-sub {
	font-size: 24rpx;
	color: #888;
}

.todo-action {
	margin-top: 16rpx;
	display: flex;
	justify-content: flex-end;
}

.action-btn {
	background: linear-gradient(90deg, #ff8a00, #ff6b00);
	color: #fff;
	font-size: 26rpx;
	padding: 8rpx 24rpx;
	border-radius: 30rpx;
}

.empty,
.loading,
.no-more {
	text-align: center;
	color: #888;
	padding: 30rpx 0;
	font-size: 26rpx;
}
</style>
