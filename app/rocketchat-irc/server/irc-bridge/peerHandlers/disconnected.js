import { Meteor } from 'meteor/meteor';
import { Users, Rooms } from '/app/rocketchat-models';

export default function handleQUIT(args) {
	const user = Users.findOne({
		'profile.irc.nick': args.nick,
	});

	Meteor.users.update({ _id: user._id }, {
		$set: {
			status: 'offline',
		},
	});

	Rooms.removeUsernameFromAll(user.username);
}