<template>
	<view class="page">
		<view class="top">
			<view>
				<text class="order-no">订单号：{{ order.orderNo }}</text>
				<text class="order-time">下单时间：{{ order.createdAt }}</text>
			</view>
		</view>

		<scroll-view class="content" scroll-y>
			<view class="section  car-section">
				<!-- 左边缩略图 -->
				<view class="car-left">
					<image :src="order.thumb" class="thumb" mode="aspectFill"></image>
				</view>
				<!-- 中间 summary -->
				<view class="car-center">
					<text class="summary">{{ order.title }}</text>
				</view>

				<!-- 右边 价格 + 数量 -->
				<view class="car-right">
					<text class="price">$ {{ (order.total/100).toFixed(2) }}</text>
					<text class="quantity">x{{ order.quantity }}</text>
				</view>
			</view>

			<view class="section">
				<view class="section-title">物流信息</view>

				<view class="track-list">
					<view v-for="(t, idx) in tracks" :key="idx" class="track-item">
						<view class="track-left">
							<view class="circle" :class="{ active: idx === 0 }"></view>
							<view class="line" v-if="idx !== tracks.length - 1"></view>
						</view>
						<view class="track-right">
							<text class="track-time">{{ t.time }}</text>
							<text class="track-desc">{{ t.desc }}</text>
						</view>
					</view>
				</view>
			</view>

			<view class="section">
				<view class="section-title">收货信息</view>
				<text>姓名：张三</text>
				<text>手机：138****1234</text>
				<text>地址：北京市海淀区示例路 100 号</text>
			</view>

			<view class="section">
				<view class="section-title">订单备注</view>
				<text>请尽量在工作日送货，若无人签收请放到前台代收。</text>
			</view>
		</scroll-view>
	</view>
</template>

<script>
	const BASE = 'http://127.0.0.1:8888/api'

	export default {
		data() {
			return {
				orderNo: '',
				order: {},
				tracks: [{
						time: '2025-09-08 10:12',
						desc: '包裹已签收，签收人：李先生'
					},
					{
						time: '2025-09-07 18:02',
						desc: '配送中，快递：顺丰，运单号：SF123456789'
					},
					{
						time: '2025-09-07 08:15',
						desc: '包裹到达配送中心：北京市分拨中心'
					},
					{
						time: '2025-09-06 14:20',
						desc: '包裹已出库，仓库处理完成'
					},
					{
						time: '2025-09-05 09:00',
						desc: '已发货，快递公司揽件'
					}
				]
			}
		},
		onLoad(query) {
			this.orderNo = query.orderNo;
			this.fetchOrderBasiceInfo(this.orderNo);
			this.fetchOrderDetail(this.orderNo)
		},
		methods: {
			fetchOrderBasiceInfo(orderNo) {
				if (this.loading) return
				this.loading = true
				const url = `${BASE}/order`
				uni.request({
					url: url,
					method: 'GET',
					success: (res) => {
						if (!res || !res.data) {
							uni.showToast({
								title: '服务器返回异常',
								icon: 'none'
							})
							return
						}
						const body = res.data
						if (body.code !== 0) {
							uni.showToast({
								title: body.msg || '加载失败',
								icon: 'none'
							})
							return
						}
						const order = body.data
						const id = order.id
						this.order = {
							id: 'ORD' + order.id,
							orderNo: 'SN' + String(100000 + id),
							createdAt: order.createdAt,
							total: (150000 + (id * 1000)), // 分
							thumb: `/static/cars/${order.car.thumbnail}`,
							title: order.car.name + order.car.name + order.car.name + order.car.name +
								order.car.name + order.car.name,
							quantity: 1,
							status: order.status
						}
					},
					fail: (err) => {

					},
					complete: () => {
						this.loading = false
					}
				})
			},
			fetchOrderDetail(orderNo) {


			}
		}
	}
</script>

<style>
	.page {
		height: 100vh;
		background: #f5f6f8;
	}

	.top {
		background: #fff;
		padding: 28rpx;
		border-bottom: 1rpx solid #eee;
	}

	.title {
		font-size: 34rpx;
		font-weight: bold;
	}

	.order-time {
		font-size: 22rpx;
		color: #999;
		margin-top: 6rpx;
		display: block;
	}

	.order-price {
		font-size: 30rpx;
		color: #FF6B00;
		font-weight: bold;
	}

	.orderno {
		font-size: 22rpx;
		color: #888;
		margin-top: 8rpx;
	}

	.content {
		padding: 18rpx;
		height: calc(100vh - 120rpx);
	}

	.section {
		background: #fff;
		padding: 18rpx;
		border-radius: 8rpx;
		margin-bottom: 18rpx;
	}

	.car-section {
		display: flex;
		align-items: center;
	}

	.car-left {
		flex-shrink: 0;
	}

	.thumb {
		width: 200rpx;
		height: 140rpx;
		border-radius: 8rpx;
		object-fit: cover;
		/* 保持比例裁剪 */
	}

	.car-center {
		flex: 1;
		padding: 0 20rpx;
	}

	.summary {
		font-size: 26rpx;
		color: #333;
		line-height: 36rpx;
		display: -webkit-box;
		-webkit-line-clamp: 3;
		/* 最多显示三行 */
		-webkit-box-orient: vertical;
		overflow: hidden;
		text-overflow: ellipsis;
		word-break: break-all;
		max-height: 108rpx;
	}

	.car-right {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		align-items: flex-end;
		min-width: 140rpx;
		padding-right: 12rpx;

	}

	.price {
		font-size: 30rpx;
		color: #FF6B00;
		font-weight: bold;
	}

	.quantity {
		font-size: 24rpx;
		color: #666;
		margin-top: 12rpx;
	}

	/* 物流 */
	.track-list {
		margin-top: 8rpx;
	}

	.track-item {
		display: flex;
		padding: 12rpx 0;
	}

	.track-left {
		width: 60rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	.circle {
		width: 18rpx;
		height: 18rpx;
		border-radius: 9rpx;
		background: #ddd;
		margin-bottom: 4rpx;
	}

	.circle.active {
		background: #FF6B00;
	}

	.line {
		width: 2rpx;
		flex: 1;
		background: #eee;
	}

	.track-right {
		flex: 1;
		padding-left: 12rpx;
	}

	.track-time {
		font-size: 22rpx;
		color: #999;
	}

	.track-desc {
		font-size: 26rpx;
		color: #333;
		margin-top: 6rpx;
	}
</style>