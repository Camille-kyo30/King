const { getStreamsFromAttachment, log } = global.utils;
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const mediaTypes = ["photo", "png", "animated_image", "video", "audio"];

// 🖼️ Images Nagi & Bachira jointes aux échanges avec l'admin
const IMAGES = [
	"https://i.ibb.co/ymLTMGqB/6b8613d0dff5.jpg",
	"https://i.ibb.co/9kwYLMCS/668485e39063.jpg"
];

async function getBuffer(url) {
	try {
		const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 5000 });
		return Buffer.from(response.data);
	} catch {
		return null;
	}
}

async function getRandomImageStream() {
	const url = IMAGES[Math.floor(Math.random() * IMAGES.length)];
	const cacheDir = path.join(__dirname, 'cache');
	await fs.ensureDir(cacheDir);
	const tmpPath = path.join(cacheDir, `callad_${Date.now()}.jpg`);
	const buffer = await getBuffer(url);
	if (!buffer) return null;
	fs.writeFileSync(tmpPath, buffer);
	return { stream: fs.createReadStream(tmpPath), path: tmpPath };
}

module.exports = {
	config: {
		name: "callad",
	version: "1.9",
		author: "NTKhang",
		editor: "Camille Uchiha 🍓",
		countDown: 5,
		role: 0,
		description: {
			vi: "gửi báo cáo, gop ý, báo lỗi,... của bạn về admin bot",
			en: "envoyer un rapport, des commentaires, un bug,... au bot d'administration",
			fr: "Envoyer un rapport, des commentaires ou un bug aux administrateurs du bot"
	},
		category: "info",
		guide: {
			vi: " {pn} <tin nhắn>",
			en: " {pn} <message>",
			fr: " {pn} <votre message>"
		}
	},

	languages: {
	vi: {
			missingMessage: "Vui lòng nhập tin nhắn bạn muốn gửi về admin",
			sendByGroup: "\n- Gửi từ nhóm: %1\n- Thread ID: %2",
			sendByUser: "\n- Gửi từ người dùng",
			content: "\n\nNội dung:\n─────────────────\n%1\n─────────────────\nPhản hồi tin nhắn này để chat tiếp với admin",
			success: "Đã gửi tin nhắn của bạn về %1 admin thành công!\n%2",
			failed: "Đã có lỗi xảy ra khi gửi tin nhắn của bạn về %1 admin\n%2",
			reply: "⌖ Phản hồi từ admin %1:\n─────────────────\n%2\n─────────────────\nPhản hồi tin nhắn này để chat tiếp với admin",
			replySuccess: "Đã gửi phản hồi của bạn về admin thành công!",
			feedback: "✎ Phản hồi từ người dùng %1:\n- User ID: %2%3\n\nNội dung:\n─────────────────\n%4\n─────────────────\nPhản hồi tin nhắn này để chat tiếp với người dùng",
			replyUserSuccess: "Đã gửi phản hồi về người dùng thành công!",
			noAdmin: "Bot hiện tại không có admin nào."
		},
		en: {
			missingMessage: "Please enter the message you want to send to admin",
			sendByGroup: "\n- Sent from group: %1\n- Thread ID: %2",
			sendByUser: "\n- Sent from user directly",
			content: "\n\nContent:\n─────────────────\n%1\n─────────────────\nReply to this message to continue chatting with admin",
			success: "Sent your message to %1 admin(s) successfully!\n%2",
			failed: "An error occurred while sending your message to %1 admin(s)\n%2",
			reply: "⌖ Reply from admin %1:\n─────────────────\n%2\n─────────────────\nReply to this message to continue chatting with admin",
			replySuccess: "Sent your reply to admin successfully!",
			feedback: "✎ Feedback from user %1:\n- User ID: %2%3\n\nContent:\n─────────────────\n%4\n─────────────────\nReply to this message to continue chatting with user",
			replyUserSuccess: "Sent reply to user successfully!",
			noAdmin: "This bot currently has no admin."
		},
		fr: {
			missingMessage: `⚽😴━━━━━━━━⚽😴\n⚠️ 𝗘𝗥𝗥𝗘𝗨𝗥\n😴 Nagi : « Ecris un message... j'ai la flemme de deviner ce que tu veux. »\n⚽ Bachira : « MIAOU ! Sans message, comment veux-tu que je dévore ta demande ?! »\n⚽😴━━━━━━━━⚽😴`,
			sendByGroup: `\n📍 𝗚𝗿𝗼𝘂𝗽𝗲: %1\n🆔 𝗜𝗗: %2`,
			sendByUser: `\n📍 𝗠𝗣: Message privé`,
			content: `\n\n📝 𝗖𝗢𝗡𝗧𝗘𝗡𝗨:\n─────────────────\n%1\n─────────────────\n💬 Répondez à ce message pour répondre`,
			success: `⚽😴━━━━━━━━⚽😴\n✅ 𝗘𝗡𝗩𝗢𝗬𝗘́\n\nMessage envoyé à %1 admin(s) !\n%2\n\n😴 Nagi : « C'est fait. Sans effort, comme toujours. »\n⚽ Bachira : « Ton message est parti dévorer l'admin, MIAOUUU ! »\n⚽😴━━━━━━━━⚽😴`,
			failed: `⚽😴━━━━━━━━⚽😴\n❌ 𝗘́𝗖𝗛𝗘𝗖\nErreur d'envoi à %1 admin(s)\n%2\n\n😴 Nagi : « Bof, ça arrive. Réessaie, flemme de m'énerver pour ça. »\n⚽😴━━━━━━━━⚽😴`,
			reply: `⚽😴━━━━━━━━⚽😴\n⌖ 𝗥𝗘́𝗣𝗢𝗡𝗦𝗘 𝗔𝗗𝗠𝗜𝗡 %1\n─────────────────\n%2\n─────────────────\n💬 Répondez pour continuer\n\n😴 Nagi : « L'admin a répondu. Facile, non ? »\n⚽ Bachira : « Vas-y, mords dans la conversation, ne reste pas hors-jeu ! »\n⚽😴━━━━━━━━⚽😴`,
			replySuccess: `⚽😴━━━━━━━━⚽😴\n✅ 𝗘𝗡𝗩𝗢𝗬𝗘́\nRéponse envoyée à l'admin !\n\n😴 Nagi : « Envoyé. Pas la peine de stresser. »\n⚽😴━━━━━━━━⚽😴`,
			feedback: `⚽😴━━━━━━━━⚽😴\n✎ 𝗠𝗘𝗦𝗦𝗔𝗚𝗘 𝗨𝗦𝗘𝗥 %1\n- 𝗜𝗗: %2%3\n\n📝 𝗖𝗢𝗡𝗧𝗘𝗡𝗨:\n─────────────────\n%4\n─────────────────\n💬 Répondez pour répondre\n\n⚽ Bachira : « Un utilisateur veut te parler, MIAOU ! Ne le laisse pas hors-jeu ! »\n⚽😴━━━━━━━━⚽😴`,
			replyUserSuccess: `⚽😴━━━━━━━━⚽😴\n✅ 𝗘𝗡𝗩𝗢𝗬𝗘́\nRéponse envoyée à l'utilisateur !\n\n😴 Nagi : « Terminé. Ez comme d'hab. »\n⚽😴━━━━━━━━⚽😴`,
			noAdmin: `⚽😴━━━━━━━━⚽😴\n❌ 𝗘𝗥𝗥𝗘𝗨𝗥\nAucun admin configuré pour ce bot\n\n😴 Nagi : « Pas d'admin... même moi je peux rien faire là. »\n⚽😴━━━━━━━━⚽😴`
		}
	},

	onStart: async function ({ args, message, event, usersData, threadsData, api, commandName, getLang }) {
		const { config } = global.GoatBot;
		
		if (!args || args.length === 0) return message.reply(getLang("missingMessage"));
		
		const { senderID, threadID, isGroup } = event;
		
		if (!config.adminBot || config.adminBot.length == 0) return message.reply(getLang("noAdmin"));
		
		const senderName = await usersData.getName(senderID);
		let groupDetails = "";
		
		if (isGroup) {
			const threadInfo = await threadsData.get(threadID) || {};
			groupDetails = getLang("sendByGroup", threadInfo.threadName || "Groupe sans nom", threadID);
	} else {
			groupDetails = getLang("sendByUser");
		}

		const msg = `⚽😴━━━━━━━━⚽😴\n📨 𝗔𝗣𝗣𝗘𝗟 𝗔𝗗𝗠𝗜𝗡 📨\n⚽😴━━━━━━━━⚽😴\n👤 𝗡𝗼𝗺: ${senderName}\n🆔 𝗜𝗗: ${senderID}` + groupDetails;

		const attachments = await getStreamsFromAttachment(
			[...event.attachments, ...(event.messageReply?.attachments || [])]
				.filter(item => mediaTypes.includes(item.type))
		);

		const randomImage = await getRandomImageStream();
		if (randomImage) attachments.push(randomImage.stream);

		const formMessage = {
			body: msg + getLang("content", args.join(" ")),
			mentions: [{ id: senderID, tag: senderName }],
			attachment: attachments
		};

		const successIDs = [];
		const failedIDs = [];
		const adminNames = [];

		for (const uid of config.adminBot) {
			try {
				const name = await usersData.getName(uid);
				adminNames.push({ id: uid, name: name });
				
				const messageSend = await api.sendMessage(formMessage, uid);
				successIDs.push(uid);
				
				global.GoatBot.onReply.set(messageSend.messageID, {
					commandName,
					messageID: messageSend.messageID,
					threadID,
					messageIDSender: event.messageID,
					type: "userCallAdmin"
				});
			} catch (err) {
				failedIDs.push({ adminID: uid, error: err });
			}
	}

		if (randomImage) {
			setTimeout(() => { if (fs.existsSync(randomImage.path)) fs.unlinkSync(randomImage.path); }, 20000);
		}

		let msg2 = "";
		if (successIDs.length > 0) {
			msg2 += getLang("success", successIDs.length,
				adminNames.filter(item => successIDs.includes(item.id)).map(item => ` • ${item.name} (${item.id})`).join("\n")
			);
	}
		if (failedIDs.length > 0) {
			msg2 += (msg2 ? "\n" : "") + getLang("failed", failedIDs.length,
				failedIDs.map(item => ` • ${item.adminID}`).join("\n")
			);
			log.err("APPEL ADMIN EN ÉCHEC", failedIDs);
	}
		
		return message.reply({
			body: msg2,
			mentions: adminNames.map(item => ({ id: item.id, tag: item.name }))
		});
	},

	onReply: async ({ args, event, api, message, Reply, usersData, commandName, getLang }) => {
		const { type, threadID, messageIDSender } = Reply;
		const senderName = await usersData.getName(event.senderID);
		const { isGroup } = event;

		const attachments = await getStreamsFromAttachment(
			event.attachments.filter(item => mediaTypes.includes(item.type))
		);

		const randomImage = await getRandomImageStream();
		if (randomImage) attachments.push(randomImage.stream);

		switch (type) {
			case "userCallAdmin": {
				const formMessage = {
					body: getLang("reply", senderName, args.join(" ")),
					mentions: [{ id: event.senderID, tag: senderName }],
					attachment: attachments
				};

				api.sendMessage(formMessage, threadID, (err, info) => {
					if (randomImage) fs.unlink(randomImage.path, () => {});
					if (err) return message.reply("Erreur lors de l'envoi : " + JSON.stringify(err));
					message.reply(getLang("replyUserSuccess"));
					global.GoatBot.onReply.set(info.messageID, {
						commandName,
						messageID: info.messageID,
						messageIDSender: event.messageID,
						threadID: event.threadID,
						type: "adminReply"
					});
				}, messageIDSender);
				break;
			}
			case "adminReply": {
				let sendByGroup = "";
				if (isGroup) {
					try {
						const threadInfo = await api.getThreadInfo(event.threadID);
						sendByGroup = getLang("sendByGroup", threadInfo.threadName || "Groupe inconnu", event.threadID);
					} catch(e) {
						sendByGroup = getLang("sendByGroup", "Inconnu", event.threadID);
					}
				}
				
				const formMessage = {
					body: getLang("feedback", senderName, event.senderID, sendByGroup, args.join(" ")),
					mentions: [{ id: event.senderID, tag: senderName }],
					attachment: attachments
				};

				api.sendMessage(formMessage, threadID, (err, info) => {
					if (randomImage) fs.unlink(randomImage.path, () => {});
					if (err) return message.reply("Erreur lors de l'envoi : " + JSON.stringify(err));
					message.reply(getLang("replySuccess"));
					global.GoatBot.onReply.set(info.messageID, {
						commandName,
						messageID: info.messageID,
						messageIDSender: event.messageID,
						threadID: event.threadID,
						type: "userCallAdmin"
					});
				}, messageIDSender);
				break;
			}
			default:
				if (randomImage) fs.unlink(randomImage.path, () => {});
				break;
	}
	}
};
