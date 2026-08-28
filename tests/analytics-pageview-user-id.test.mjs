import assert from 'node:assert/strict';
import fs from 'node:fs';

const analyticsSource = fs.readFileSync(new URL('../common/analytics.js', import.meta.url), 'utf8');
const loginSource = fs.readFileSync(new URL('../pages/login/login.vue', import.meta.url), 'utf8');

assert.match(
	analyticsSource,
	/function getPageViewUserId\(\)/,
	'analytics should resolve the logged-in user id for pageview reporting'
);
assert.match(
	analyticsSource,
	/function getPageViewToken\(\)/,
	'analytics should read the access token for server-side pageview user id fallback'
);
assert.match(
	analyticsSource,
	/\['user_id', 'userId', 'username'\]/,
	'analytics should read existing storage keys before reporting pageviews'
);
assert.match(
	analyticsSource,
	/localStorage\.getItem\(key\)/,
	'analytics should also support H5 localStorage user names'
);
assert.match(
	analyticsSource,
	/userId:\s*getPageViewUserId\(\)/,
	'pageview payload should include userId when available'
);
assert.match(
	analyticsSource,
	/token:\s*getPageViewToken\(\)/,
	'pageview payload should include token so the API can parse old logged-in users'
);
assert.match(
	loginSource,
	/uni\.setStorageSync\('username', this\.username\)/,
	'login should persist username so later pageview events can attach userId'
);
