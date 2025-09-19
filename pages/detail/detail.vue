<template>
	<scroll-view scroll-y class="page">
		<!-- 顶部轮播 -->
		<swiper class="car-swiper" indicator-dots="true" autoplay="true" interval="3000" duration="500">
			<swiper-item v-for="(img, index) in car.images" :key="index">
				<image class="car-img" :src="img" mode="aspectFill"></image>
			</swiper-item>
		</swiper>

		<!-- 车辆标题 -->
		<view class="car-title">{{ car.name }}</view>

		<!-- 基本信息描述（重复说明） -->
		<view class="section">
			<view class="section-title">产品简介 / Product Description / Описание продукта</view>
			<view class="section-text">
				<!-- 俄文 -->
				Новый внедорожник премиум-класса 2025 года оснащён 2.0T турбированным двигателем и 8-ступенчатой
				автоматической коробкой передач, обеспечивая мощную динамику и плавное переключение передач.<br>
				В салоне — кожаные сиденья и панорамный люк, создающие просторную и комфортную атмосферу.<br>
				Поддерживает системы помощи водителю уровня L2, включая адаптивный круиз-контроль, удержание в полосе и
				автоматическое экстренное торможение.<br>
				Средний расход топлива — всего 7,2 л на 100 км, что сочетает мощность и экономичность.<br>

				<!-- 英文 -->
				The all-new 2025 Premium SUV is equipped with a 2.0T turbocharged engine and an 8-speed automatic
				transmission, delivering powerful performance and smooth gear shifts.<br>
				Inside, genuine leather seats and a panoramic sunroof offer a spacious and luxurious ride.<br>
				Supports Level 2 advanced driving assistance, including adaptive cruise control, lane keeping, and
				automatic emergency braking.<br>
				With a combined fuel consumption of just 7.2L per 100km, it balances performance and efficiency.<br><br>
			</view>

		</view>

		<!-- 参数表格 -->
		<view class="section">
			<view class="section-title">车辆参数 / Specifications / Технические характеристики</view>
			<view class="table">
				<view class="table-row" v-for="(item, idx) in specs" :key="idx">
					<view class="table-cell table-cell-label">{{ item.label }}</view>
					<view class="table-cell table-cell-value">{{ item.value }}</view>
				</view>
			</view>
		</view>

		<!-- 配置亮点 -->
		<view class="section">
			<view class="section-title">配置亮点 / Highlights / Основные моменты</view>
			<view class="section-text">
				- 全景天窗<br>
				- 自适应巡航<br>
				- 智能语音控制系统<br>
				- 12扬声器豪华音响
			</view>
		</view>

		<!-- 视频介绍 -->
		<view class="section">
			<view class="section-title">车辆视频 / Video / Видео</view>
			<video src="/static/cars/1.mp4" controls class="car-video"></video>
		</view>

		<!-- 图片展示 -->
		<view class="section">
			<view class="section-title">车辆细节 / Details / Подробности</view>
			<image v-for="(img, index) in car.detailImages" :key="index" class="detail-img" :src="img" mode="widthFix">
			</image>
		</view>

		<!-- 使用说明 -->
		<view class="section">
			<view class="section-title">使用说明 / Instructions / Инструкции</view>
			<view class="section-text">
				1. 请在专业人员指导下驾驶。<br>
				2. 定期保养，确保车辆性能。<br>
				3. 遵守交通法规，安全第一。
			</view>
		</view>

		<!-- 注意事项 -->
		<view class="section">
			<view class="section-title">注意事项 / Notes / Примечания</view>
			<view class="section-text">
				购买前请确认库存与价格；图片仅供参考，具体配置以实车为准。
			</view>
		</view>
	</scroll-view>

	<!-- 悬浮客服按钮 -->
	<view class="customer-btn" @click="openCustomer">
		<image src="/static/customer-icon.png" class="customer-icon"></image>
	</view>
</template>

<script>
	const BASE = 'http://127.0.0.1:8888/api'

	export default {
		data() {
			return {
				carId: null,
				loading: false,
				car: {},
				specs: [{
						label: '品牌',
						value: '示例品牌'
					},
					{
						label: '型号',
						value: 'X9'
					},
					{
						label: '年份',
						value: '2024'
					},
					{
						label: '价格',
						value: '￥289,000'
					},
					{
						label: '发动机',
						value: '2.0T 涡轮增压'
					},
					{
						label: '变速箱',
						value: '8速手自一体'
					},
					{
						label: '驱动方式',
						value: '四驱'
					}
				]
			}
		},
		onLoad(query) {
			this.carId = query.id || null;
			this.findCarDetails(this.carId)
		},
		methods: {
			findCarDetails() {
				if (this.loading) return
				this.loading = true
				const url = `${BASE}/cars/${this.carId}`
				uni.request({
					url: url,
					success: (res) => {
						// 兼容各种后端返回情况
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
						let cars = (body.data && body.data.cars) ? body.data.cars : []
						 cars = cars.map((c) => {
							let img = '/static/cars/' + c.thumbnail
							if (!img && Array.isArray(c.gallery) && c.gallery.length > 0) {
								img = c.gallery[0].url
							}
							return {
								id: c.id,
								name: c.name,
								summary: c.summary,
								imgUrl: img,
								images: [
									'/static/cars/1.png',
									'/static/cars/2.png',
									'/static/cars/3.png'
								],
								detailImages: [
									'/static/cars/1.png',
									'/static/cars/2.png',
									'/static/cars/3.png'
								]
							}
						});
						
						this.car=cars?.[0]
					},
					fail: (err) => {

					},
					complete: () => {
						this.loading = false
					}
				})

			},
			openCustomer() {
				// 跳转到临时聊天页面
				uni.navigateTo({
					url: `/pages/tempChat/tempChat?carId=${this.car.id}`
				})
			}
		}
	}
</script>

<style>
	.page {
		height: 100vh;
		background-color: #f5f5f5;
	}

	.car-swiper {
		width: 100%;
		height: 400rpx;
	}

	.car-img {
		width: 100%;
		height: 100%;
	}

	.car-title {
		font-size: 40rpx;
		font-weight: bold;
		padding: 20rpx;
		background-color: #fff;
	}

	.section {
		margin-top: 20rpx;
		padding: 20rpx;
		background-color: #fff;
	}

	.section-title {
		font-size: 32rpx;
		font-weight: bold;
		margin-bottom: 10rpx;
	}

	.section-text {
		font-size: 28rpx;
		color: #555;
		line-height: 40rpx;
	}

	.table {
		border-top: 1rpx solid #ddd;
		border-left: 1rpx solid #ddd;
	}

	.table-row {
		display: flex;
	}

	.table-cell {
		flex: 1;
		padding: 16rpx;
		border-right: 1rpx solid #ddd;
		border-bottom: 1rpx solid #ddd;
	}

	.table-cell-label {
		background-color: #f7f7f7;
		font-weight: bold;
	}

	.table-cell-value {
		color: #333;
	}

	.car-video {
		width: 100%;
		height: 400rpx;
		margin-top: 10rpx;
	}

	.detail-img {
		width: 100%;
		margin-top: 10rpx;
		border-radius: 8rpx;
	}

	/* 悬浮客服按钮 */
	.customer-btn {
		position: fixed;
		right: 30rpx;
		bottom: 120rpx;
		width: 100rpx;
		height: 100rpx;
		background-color: #fff;
		border-radius: 50%;
		box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.2);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 999;
	}

	.customer-icon {
		width: 60rpx;
		height: 60rpx;
	}
</style>