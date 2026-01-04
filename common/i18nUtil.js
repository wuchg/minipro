import {
	i18nInstance
} from '@/main.js'

export function t(key, values) {
	// Vue3 用 i18n.global.t，Vue2 用 i18n.t
	return i18nInstance.global?.t ? i18nInstance.global.t(key, values) : i18nInstance.t(key, values)
}