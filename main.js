import App from './App'

import en from './locales/en.json'
import zh from './locales/zh.json'
import ru from './locales/ru.json'
const messages = {
	en,
	zh,
	ru
}


let savedLang = uni.getStorageSync('language')
let locale = savedLang === 'system' || !savedLang ? uni.getLocale() : savedLang


let i18nConfig = {
	locale,
	messages
}

// #ifndef VUE3
import Vue from 'vue'
import VueI18n from 'vue-i18n'
Vue.use(VueI18n)
const i18n = new VueI18n()

import './uni.promisify.adaptor'
Vue.config.productionTip = false
App.mpType = 'app'
const app = new Vue({
	i18n,
	...App
})
app.$mount()
// #endif

// #ifdef VUE3
import {
	createSSRApp
} from 'vue'
import {
	createI18n
} from 'vue-i18n' // v9.x
const i18n = createI18n(i18nConfig)

import { reportPageView } from '@/common/analytics.js'

export function createApp() {
	const app = createSSRApp(App)
	app.use(i18n)

	// 全局页面访问埋点：每个页面 onShow 时上报当前路径（PV/UV）
	app.mixin({
		onShow() {
			const pages = getCurrentPages()
			if (!pages.length) return
			const cur = pages[pages.length - 1]
			if (cur && cur.route) {
				reportPageView('/' + cur.route)
			}
		}
	})

	return {
		app
	}
}
// #endif

export const i18nInstance = i18n
