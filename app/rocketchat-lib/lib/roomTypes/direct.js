import { Meteor } from 'meteor/meteor';
import { Session } from 'meteor/session';
import { ChatRoom, Subscriptions } from '/app/rocketchat-models';
import { openRoom } from '/app/rocketchat-ui-utils';
import { getUserPreference, RoomTypeConfig, RoomTypeRouteConfig, RoomSettingsEnum, UiTextContext } from '/app/rocketchat-utils';
import { hasPermission, hasAtLeastOnePermission } from '/app/rocketchat-authorization';
import { settings } from '/app/rocketchat-settings';

export class DirectMessageRoomRoute extends RoomTypeRouteConfig {
	constructor() {
		super({
			name: 'direct',
			path: '/direct/:username',
		});
	}

	action(params) {
		return openRoom('d', params.username);
	}

	link(sub) {
		return { username: sub.name };
	}
}

export class DirectMessageRoomType extends RoomTypeConfig {
	constructor() {
		super({
			identifier: 'd',
			order: 50,
			label: 'Direct_Messages',
			route: new DirectMessageRoomRoute(),
		});
	}

	findRoom(identifier) {
		if (!hasPermission('view-d-room')) {
			return null;
		}

		const query = {
			t: 'd',
			name: identifier,
		};

		const subscription = Subscriptions.findOne(query);
		if (subscription && subscription.rid) {
			return ChatRoom.findOne(subscription.rid);
		}
	}

	roomName(roomData) {
		const subscription = Subscriptions.findOne({ rid: roomData._id }, { fields: { name: 1, fname: 1 } });
		if (!subscription) {
			return '';
		}

		if (settings.get('UI_Use_Real_Name') && subscription.fname) {
			return subscription.fname;
		}

		return subscription.name;
	}

	secondaryRoomName(roomData) {
		if (settings.get('UI_Use_Real_Name')) {
			const subscription = Subscriptions.findOne({ rid: roomData._id }, { fields: { name: 1 } });
			return subscription && subscription.name;
		}
	}

	condition() {
		const groupByType = getUserPreference(Meteor.userId(), 'sidebarGroupByType');
		return groupByType && hasAtLeastOnePermission(['view-d-room', 'view-joined-room']);
	}

	getUserStatus(roomId) {
		const subscription = Subscriptions.findOne({ rid: roomId });
		if (subscription == null) {
			return;
		}

		return Session.get(`user_${ subscription.name }_status`);
	}

	getDisplayName(room) {
		return room.usernames.join(' x ');
	}

	allowRoomSettingChange(room, setting) {
		switch (setting) {
			case RoomSettingsEnum.NAME:
			case RoomSettingsEnum.SYSTEM_MESSAGES:
			case RoomSettingsEnum.DESCRIPTION:
			case RoomSettingsEnum.READ_ONLY:
			case RoomSettingsEnum.REACT_WHEN_READ_ONLY:
			case RoomSettingsEnum.ARCHIVE_OR_UNARCHIVE:
			case RoomSettingsEnum.JOIN_CODE:
				return false;
			case RoomSettingsEnum.E2E:
				return settings.get('E2E_Enable') === true;
			default:
				return true;
		}
	}

	enableMembersListProfile() {
		return true;
	}

	userDetailShowAll(/* room */) {
		return false;
	}

	getUiText(context) {
		switch (context) {
			case UiTextContext.HIDE_WARNING:
				return 'Hide_Private_Warning';
			case UiTextContext.LEAVE_WARNING:
				return 'Leave_Private_Warning';
			default:
				return '';
		}
	}

	/**
	 * Returns details to use on notifications
	 *
	 * @param {object} room
	 * @param {object} user
	 * @param {string} notificationMessage
	 * @return {object} Notification details
	 */
	getNotificationDetails(room, user, notificationMessage) {
		if (!Meteor.isServer) {
			return {};
		}

		const title = settings.get('UI_Use_Real_Name') ? user.name : `@${ user.username }`;
		const text = notificationMessage;

		return { title, text };
	}
}