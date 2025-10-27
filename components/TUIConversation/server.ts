import TUICore, { TUIConstants } from '@tencentcloud/tui-core';
import {
	TUITranslateService,
	TUIConversationService,
	TUIStore,
	StoreName,
} from '@tencentcloud/chat-uikit-engine';
import { TUIGlobal } from '@tencentcloud/universal-api';
import { CONV_CREATE_TYPE } from '../../constant';
import { isUniFrameWork } from '../../utils/env';
import { enableSampleTaskStatus } from '../../utils/enableSampleTaskStatus';

export default class TUIConversationServer {
	static instance : TUIConversationServer;
	private onCallParamsMap : Map<string, any>;
	private onCallCallbackMap : Map<string, () => void>;
	public constants : typeof TUIConstants;
	constructor() {
		TUICore.registerService(TUIConstants.TUIConversation.SERVICE.NAME, this);
		TUICore.registerExtension(TUIConstants.TUISearch.EXTENSION.SEARCH_MORE.EXT_ID, this);
		this.onCallParamsMap = new Map();
		this.onCallCallbackMap = new Map();
		this.constants = TUIConstants;
	}

	static getInstance() : TUIConversationServer {
		if (!TUIConversationServer.instance) {
			TUIConversationServer.instance = new TUIConversationServer();
		}
		return TUIConversationServer.instance;
	}

	public getOnCallParams(method : string) : any {
		return this.onCallParamsMap.get(method);
	}

	public getOnCallCallback(method : string) : (() => void) | undefined {
		return this.onCallCallbackMap.get(method);
	}

	public onCall(method : string, params : Record<string, any>, callback : () => void) : void {
		this.onCallParamsMap.set(method, params);
		this.onCallCallbackMap.set(method, callback);
		switch (method) {
			case TUIConstants.TUIConversation.SERVICE.METHOD.CREATE_CONVERSATION:
				this.createConversation(params);
				break;
			case TUIConstants.TUIConversation.SERVICE.METHOD.HIDE_CONVERSATION_HEADER:
				this.hideConversationHeader();
				break;
		}
	}

	public onGetExtension(extensionID : string) {
		if (extensionID === TUIConstants.TUISearch.EXTENSION.SEARCH_MORE.EXT_ID) {
			const list = [
			];
			return list;
		}
	}

	private createConversation(item : any) {
		// Tell TUIContact to call the SelectFriend component to select a friend
		TUICore.callService({
			serviceName: TUIConstants.TUIContact.SERVICE.NAME,
			method: TUIConstants.TUIContact.SERVICE.METHOD.SELECT_FRIEND,
			params: {
				title: item.text,
				isRadio: item.data.name !== CONV_CREATE_TYPE.TYPEGROUP,
				isNeedSearch: !TUIStore.getData(StoreName.APP, 'isOfficial'),
			},
			callback: async (memberList : any[]) => {
				if (!memberList || memberList.length === 0) {
					// Return to the previous page
					return this.routerForward(null);
				}
				if (item.data.name === CONV_CREATE_TYPE.TYPEGROUP) {
					// After selecting members, if you want to create a group chat, you need to create a group
					this.createGroup(memberList);
				} else {
					const { userID } = memberList[0];
					// Generate Conversation
					await this.generateConversation(`C2C${userID}`);
					this.routerForward(`C2C${userID}`);
				}
			},
		});
	}

	private createGroup(memberList : any[]) {

	}

	private async routerForward(conversationID : string | null) : Promise<void> {
		if (isUniFrameWork) {
			await TUIGlobal?.reLaunch({
				url: '/components/TUIConversation/index',
			});
			if (conversationID) {
				TUIGlobal?.navigateTo({
					url: '/components/TUIChat/index',
				});
			}
		}
	}

	private generateConversation(conversationID : string) {
		TUIConversationService.switchConversation(conversationID)
			.then(() => {
				if (conversationID.startsWith('GROUP')) {
					enableSampleTaskStatus('groupChat');
				}
				console.warn('打开会话成功');
			})
			.catch((err : any) => {
				console.warn('打开会话失败', err.code, err.msg);
			});
	}

	private hideConversationHeader = () => {
		TUIStore.update(StoreName.CUSTOM, 'isShowConversationHeader', false);
	};
}