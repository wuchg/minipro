let cachedInventorySearchIndex = {
	brands: [],
	series: []
};

function stringifyValue(value) {
	if (value === undefined || value === null || value === '') return '';
	return String(value);
}

export function normalizeInventorySearchKeyword(value = '') {
	return stringifyValue(value).trim().toLowerCase().replace(/[\s_&'’‘‐‑‒–—-]+/g, '');
}

export function compactInventorySeriesAlias(value = '') {
	const text = stringifyValue(value).replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
	return text
		.replace(/\s*[（(]\s*\d+(?:[.,]\d+)?\s*[）)].*$/, '')
		.replace(/\s+20\d{2}\/.*$/, '')
		.trim() || text;
}

function brandLogoText(brandName = '') {
	const words = stringifyValue(brandName).trim().split(/\s+/).filter(Boolean);
	if (!words.length) return '?';
	return words.length > 1
		? words.map((word) => word.slice(0, 1)).join('').slice(0, 3).toUpperCase()
		: words[0].slice(0, 3).toUpperCase();
}

function resolveLogoUrl(value = '') {
	const url = stringifyValue(value).trim();
	if (!url || /^https?:\/\//i.test(url)) return url;
	const app = typeof getApp === 'function' ? getApp() : null;
	const base = app?.globalData?.baseImgUrl || '';
	if (!base) return url;
	return url.startsWith('/') ? `${base}${url}` : `${base}/${url}`;
}

export function buildInventorySeriesIndex({ brands = [], models = [], sourceItems = [] } = {}) {
	const brandById = new Map();
	for (const brand of brands) {
		const id = stringifyValue(brand.id);
		if (!id) continue;
		const brandName = stringifyValue(brand.brandName || brand.name || brand.displayName || brand.nameCn);
		brandById.set(id, {
			brandName,
			logoText: stringifyValue(brand.logoText) || brandLogoText(brandName),
			logoUrl: resolveLogoUrl(brand.logoUrl)
		});
	}

	const aliasesByModelId = new Map();
	const sourceBrandById = new Map();
	for (const item of sourceItems) {
		const modelId = stringifyValue(item.modelId);
		const brandId = stringifyValue(item.brandId);
		if (brandId && !sourceBrandById.has(brandId)) {
			sourceBrandById.set(brandId, stringifyValue(item.brandName || item.brandNameCn));
		}
		if (!modelId) continue;
		const aliases = aliasesByModelId.get(modelId) || [];
		for (const value of [item.itemName, item.itemNameCn]) {
			const alias = stringifyValue(value).trim();
			if (alias && !aliases.includes(alias)) aliases.push(alias);
		}
		aliasesByModelId.set(modelId, aliases);
	}

	return models
		.filter((model) => Number(model.stockCount || 0) > 0)
		.map((model) => {
			const id = stringifyValue(model.id);
			const brandId = stringifyValue(model.brandId);
			const brand = brandById.get(brandId) || {};
			const brandName = brand.brandName || sourceBrandById.get(brandId) || '';
			const seriesName = stringifyValue(model.modelName || model.modelNameCn) || '-';
			const aliases = aliasesByModelId.get(id) || [];
			return {
				aliases,
				brandId,
				brandName,
				id,
				logoText: brand.logoText || brandLogoText(brandName || seriesName),
				logoUrl: brand.logoUrl || '',
				searchText: `${seriesName} ${model.modelName || ''} ${model.modelNameCn || ''} ${aliases.join(' ')}`,
				seriesName,
				stockCount: Number(model.stockCount || 0)
			};
		});
}

export function searchInventorySeries(series = [], query = '', options = {}) {
	const keyword = normalizeInventorySearchKeyword(query);
	if (!keyword) return [];
	const excludeBrandId = stringifyValue(options.excludeBrandId);
	const limit = Number.isFinite(options.limit) ? Math.max(0, options.limit) : series.length;

	return series
		.reduce((matches, seriesItem, index) => {
			if (excludeBrandId && stringifyValue(seriesItem.brandId) === excludeBrandId) return matches;
			if (!normalizeInventorySearchKeyword(seriesItem.searchText).includes(keyword)) return matches;
			const normalizedSeriesName = normalizeInventorySearchKeyword(seriesItem.seriesName);
			const directMatch = normalizedSeriesName.includes(keyword);
			const matchingAlias = directMatch
				? ''
				: (seriesItem.aliases || []).find((alias) => normalizeInventorySearchKeyword(alias).includes(keyword)) || '';
			const resultName = matchingAlias ? compactInventorySeriesAlias(matchingAlias) : seriesItem.seriesName;
			const normalizedResultName = normalizeInventorySearchKeyword(resultName);
			const score = normalizedResultName === keyword ? 0 : normalizedResultName.startsWith(keyword) ? 1 : 2;
			matches.push({
				...seriesItem,
				detailKeyword: matchingAlias ? stringifyValue(query).trim() : '',
				resultName,
				score,
				sourceIndex: index
			});
			return matches;
		}, [])
		.sort((left, right) => left.score - right.score || left.sourceIndex - right.sourceIndex)
		.slice(0, limit)
		.map(({ score, sourceIndex, ...seriesItem }) => seriesItem);
}

export function setInventorySearchIndex(index = {}) {
	cachedInventorySearchIndex = {
		brands: Array.isArray(index.brands) ? index.brands : [],
		series: Array.isArray(index.series) ? index.series : []
	};
	return cachedInventorySearchIndex;
}

export function getInventorySearchIndex() {
	return cachedInventorySearchIndex;
}
