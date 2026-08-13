const { getTime } = global.utils;

module.exports = {
	config: {
		name: "leave",
		version: "1.8",
		author: "NTKhang",
		editor: "Camille Uchiha 🍓",
		category: "events"
	},

	langs: {
		vi: {
			session1: "sáng",
			session2: "trưa",
			session3: "chiều",
			session4: "tối",
			leaveType1: "tự rời",
			leaveType2: "bị kick",
			defaultLeaveMessage: "{userName} đã {type} khỏi nhóm"
		},

		en: {
			session1: "morning",
			session2: "noon",
			session3: "afternoon",
			session4: "evening",
			leaveType1: "left",
			leaveType2: "was kicked from",
			defaultLeaveMessage: "{userName} {type} the group"
		},

		fr: {
			session1: "matin",
			session2: "midi",
			session3: "après-midi",
			session4: "soir",

			leaveType1: "a décidé de s'en aller de",
			leaveType2: "s'est fait éjecter de",

			defaultLeaveMessage:
`⚽━━━━━━━━━━━━━━━━━━━━⚽
 🥱 𝗡𝗔𝗚𝗜 𝗦𝗘𝗜𝗦𝗛𝗜𝗥𝗢 • 𝗕𝗟𝗨𝗘 𝗟𝗢𝗖𝗞
━━━━━━━━━━━━━━━━━━━━⚽

👤 {userNameTag}
{type} le groupe {boxName}.

💭 « Pff... Encore un qui abandonne le terrain.
C'est tellement galère de bouger... Bref, bon débarras. »

🏟️ **Statut :** Éliminé du projet
🕐 **Heure :** {time} • {session}

⚽━━━━━━━━━━━━━━━━━━━━⚽`
		}
	},

	onStart: async ({
		threadsData,
		message,
		event,
		api,
		usersData,
		getLang
	}) => {

		if (event.logMessageType == "log:unsubscribe")

			return async function () {

				const { threadID } = event;

				const threadData =
					await threadsData.get(threadID);

				if (!threadData.settings.sendLeaveMessage)
					return;

				const {
					leftParticipantFbId
				} = event.logMessageData;

				if (leftParticipantFbId == api.getCurrentUserID())
					return;

				const hours = getTime("HH");
				const minutes = getTime("mm");
				const formattedTime = `${hours}h${minutes}`;

				const threadName =
					threadData.threadName;

				const userName =
					await usersData.getName(leftParticipantFbId);

				let leaveMessage = threadData.data?.leaveMessage || getLang("defaultLeaveMessage");

				const form = {
					mentions: leaveMessage.match(/\{userNameTag\}/g)
						? [{
							tag: userName,
							id: leftParticipantFbId
						}]
						: null
				};

				leaveMessage = leaveMessage
					.replace(
						/\{userName\}|\{userNameTag\}/g,
						userName
					)

					.replace(
						/\{type\}/g,
						leftParticipantFbId == event.author
							? getLang("leaveType1")
							: getLang("leaveType2")
					)

					.replace(
						/\{threadName\}|\{boxName\}/g,
						threadName
					)

					.replace(
						/\{time\}/g,
						formattedTime
					)

					.replace(
						/\{session\}/g,
						hours <= 10
							? getLang("session1")
							: hours <= 12
								? getLang("session2")
								: hours <= 18
									? getLang("session3")
									: getLang("session4")
					);

				form.body = leaveMessage;

				me
					ssage.send(form);
			};
	}
};
