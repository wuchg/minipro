import Server from './server';
import TUIComponents, {
	TUIChat,
	TUIConversation,
	TUISearch,
} from './components';
import TUIKit from './index.vue';
import { hideTUIChatFeatures } from './components/TUIChat/config';

const TUIChatKit = new Server();
TUIChatKit.init();

export {
	TUIKit,
	TUIChatKit,
	TUIComponents,
	TUIChat,
	TUIConversation,
	TUISearch,
	hideTUIChatFeatures,
};