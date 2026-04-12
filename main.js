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

export function createApp() {
	const app = createSSRApp(App)
	app.use(i18n)

	return {
		app
	}
}
// #endif

export const i18nInstance = i18n
