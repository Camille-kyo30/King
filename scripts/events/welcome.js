const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");
const { getTime, drive } = global.utils;

if (!global.temp.welcomeEvent) global.temp.welcomeEvent = {};

// 🔵 Images Nagi Bachira (Blue Lock)
// ⚠️ Utilise des liens DIRECTS (i.ibb.co/.../image.jpg), pas les pages ibb.co
const NAGI_IMAGES = [
	"https://i.ibb.co/yB43FxKB/nagi1.jpg",
	"https://i.ibb.co/95Nzcm8/nagi2.jpg"
];

async function getNagiStreams() {
	const streams = [];
	for (let i = 0; i < NAGI_IMAGES.length; i++) {
		try {
			const res = await axios.get(NAGI_IMAGES[i], { responseType: "arraybuffer" });
			const filePath = path.join(__dirname, "tmp", `nagi_${i}.jpg`);
			await fs.ensureDir(path.join(__dirname, "tmp"));
			await fs.writeFile(filePath, Buffer.from(res.data, "utf-8"));
			streams.push(fs.createReadStream(filePath));
		} catch (e) {
			console.log("[welcome] image Nagi indisponible:", NAGI_IMAGES[i]);
		}
	}
	return streams;
}

module.exports = {
	config: {
		name: "welcome",
		version: "2.2",
		author: "NTKhang + Modified by Camille Uchiha",
		category: "events"
	},

	langs: {
		vi: {
			session1: "☀ 𝗦𝗮́𝗻𝗴",
			session2: "⛅ 𝗧𝗿𝘂̛𝗮",
			session3: "🌆 𝗖𝗵𝗶𝗲̂̀𝘂",
			session4: "🌙 𝗧𝗼̂́𝗶",
			welcomeMessage: "🔵▬▬▬【 𝗕𝗟𝗨𝗘 𝗟𝗢𝗖𝗞 】▬▬▬🔵\n⚽ 𝗡𝗔𝗚𝗜 𝗕𝗔𝗖𝗛𝗜𝗥𝗔 𝗘𝗡𝗧𝗥𝗘 𝗦𝗨𝗥 𝗟𝗘 𝗧𝗘𝗥𝗥𝗔𝗜𝗡\n⚡ 𝗣𝗿𝗲𝗳𝗶𝘅: %1\n🔎 𝗡𝗵𝗮̣̂𝗽: %1help\n🔵▬▬▬▬▬▬▬▬▬▬▬▬▬🔵",
			multiple1: "🔹 𝗕𝗮̣𝗻",
			multiple2: "🔹 𝗖𝗮́𝗰 𝗯𝗮̣𝗻",
			defaultWelcomeMessage: "🔵▬▬▬【 𝗕𝗟𝗨𝗘 𝗟𝗢𝗖𝗞 】▬▬▬🔵\n⚽ 𝗖𝗵𝗮̀𝗼 𝗺𝘂̛̀𝗻𝗴 {userName}\n🏟️ 『 {boxName} 』\n🌙 {session}\n📥 {adderName}\n🔵▬▬▬▬▬▬▬▬▬▬▬▬▬🔵"
		},
		en: {
			session1: "☀ 𝚖𝚘𝚛𝚗𝚒𝚗𝚐",
			session2: "⛅ 𝚗𝚘𝚘𝚗",
			session3: "🌆 𝚊𝚏𝚝𝚎𝚛𝚗𝚘𝚘𝚗",
			session4: "🌙 𝚎𝚟𝚎𝚗𝚒𝚗𝚐",
			welcomeMessage: "🔵▬▬▬【 𝐁𝐋𝐔𝐄 𝐋𝐎𝐂𝐊 】▬▬▬🔵\n⚽ 𝗡𝗔𝗚𝗜 𝗕𝗔𝗖𝗛𝗜𝗥𝗔 𝗵𝗮𝘀 𝗲𝗻𝘁𝗲𝗿𝗲𝗱 𝘁𝗵𝗲 𝗳𝗶𝗲𝗹𝗱\n💤 \"𝚂𝚘𝚞𝚗𝚍𝚜 𝚕𝚒𝚔𝚎 𝚊 𝚙𝚊𝚒𝚗... 𝚋𝚞𝚝 𝙸'𝚕𝚕 𝚍𝚘 𝚒𝚝.\"\n⚡ 𝙿𝚛𝚎𝚏𝚒𝚡: %1\n🔎 𝙲𝚘𝚖𝚖𝚊𝚗𝚍𝚜: %1help\n🔵▬▬▬▬▬▬▬▬▬▬▬▬▬🔵",
			multiple1: "🔹 𝚢𝚘𝚞",
			multiple2: "🔹 𝚢𝚘𝚞 𝚐𝚞𝚢𝚜",
			defaultWelcomeMessage: "🔵▬▬▬【 𝐁𝐋𝐔𝐄 𝐋𝐎𝐂𝐊 】▬▬▬🔵\n⚽ 𝙽𝙴𝚆 𝙿𝙻𝙰𝚈𝙴𝚁 𝚂𝙴𝙻𝙴𝙲𝚃𝙴𝙳\n👤 ✨{userName}✨\n🏟️ 𝚆𝚎𝚕𝚌𝚘𝚖𝚎 {multiple} 𝚝𝚘: {boxName}\n🌙 𝙷𝚊𝚟𝚎 𝚊 𝚗𝚒𝚌𝚎 {session}\n📥 𝙰𝚍𝚍𝚎𝚍 𝚋𝚢: ✨{adderName}✨\n💤 𝙽𝚊𝚐𝚒: \"𝙳𝚘𝚗'𝚝 𝚖𝚊𝚔𝚎 𝚒𝚝 𝚌𝚘𝚖𝚙𝚕𝚒𝚌𝚊𝚝𝚎𝚍.\"\n🔵▬▬▬▬▬▬▬▬▬▬▬▬▬🔵"
		},
		fr: {
			session1: "☀ 𝙼𝚊𝚝𝚒𝚗",
			session2: "⛅ 𝙼𝚒𝚍𝚒",
			session3: "🌆 𝙰𝚙𝚛𝚎̀𝚜-𝚖𝚒𝚍𝚒",
			session4: "🌙 𝚂𝚘𝚒𝚛",
			welcomeMessage: "🔵▬▬▬【 𝐁𝐋𝐔𝐄 𝐋𝐎𝐂𝐊 】▬▬▬🔵\n⚽ 𝗡𝗔𝗚𝗜 𝗕𝗔𝗖𝗛𝗜𝗥𝗔 𝗲𝗻𝘁𝗿𝗲 𝘀𝘂𝗿 𝗹𝗲 𝘁𝗲𝗿𝗿𝗮𝗶𝗻\n💤 « 𝙲̧𝚊 𝚊 𝚕'𝚊𝚒𝚛 𝚌𝚑𝚒𝚊𝚗𝚝... 𝚖𝚊𝚒𝚜 𝚘𝚔. »\n⚡ 𝙿𝚛𝚎́𝚏𝚒𝚡𝚎: %1\n🔎 𝙲𝚘𝚖𝚖𝚊𝚗𝚍𝚎𝚜: %1help\n🔵▬▬▬▬▬▬▬▬▬▬▬▬▬🔵",
			multiple1: "🔹 𝚃𝚘𝚒",
			multiple2: "🔹 𝚅𝚘𝚞𝚜 𝚝𝚘𝚞𝚜",
			defaultWelcomeMessage: "🔵▬▬▬【 𝐁𝐋𝐔𝐄 𝐋𝐎𝐂𝐊 】▬▬▬🔵\n⚽ 𝙽𝙾𝚄𝚅𝙴𝙰𝚄 𝙹𝙾𝚄𝙴𝚄𝚁 𝚂𝙴́𝙻𝙴𝙲𝚃𝙸𝙾𝙽𝙽𝙴́\n👤 ✨{userName}✨\n🏟️ 𝙱𝚒𝚎𝚗𝚟𝚎𝚗𝚞𝚎 {multiple} 𝚍𝚊𝚗𝚜: {boxName}\n🌙 𝙿𝚊𝚜𝚜𝚎 𝚞𝚗 𝚋𝚘𝚗 {session}\n📥 𝙰𝚓𝚘𝚞𝚝𝚎́ 𝚙𝚊𝚛: ✨{adderName}✨\n💤 𝙽𝚊𝚐𝚒: « 𝙵𝚊𝚒𝚜 𝚙𝚊𝚜 𝚌𝚘𝚖𝚙𝚕𝚒𝚚𝚞𝚎́. »\n🔵▬▬▬▬▬▬▬▬▬▬▬▬▬🔵"
		}
	},

	onStart: async ({ threadsData, message, event, api, getLang }) => {
		if (event.logMessageType !== "log:subscribe") return;

		const { threadID, logMessageData } = event;
		const { addedParticipants } = logMessageData;
		const hours = getTime("HH");
		const prefix = global.utils.getPrefix(threadID);
		const nickNameBot = global.GoatBot.config.nickNameBot;

		// 🔵 Le bot vient d'être ajouté : message + photos Nagi Bachira
		if (addedParticipants.some(user => user.userFbId === api.getCurrentUserID())) {
			if (nickNameBot) api.changeNickname(nickNameBot, threadID, api.getCurrentUserID());
			const attachment = await getNagiStreams();
			return message.send({
				body: getLang("welcomeMessage", prefix),
				attachment: attachment.length ? attachment : undefined
			});
		}

		if (!global.temp.welcomeEvent[threadID]) {
			global.temp.welcomeEvent[threadID] = { joinTimeout: null, dataAddedParticipants: [] };
		}

		global.temp.welcomeEvent[threadID].dataAddedParticipants.push(...addedParticipants);
		clearTimeout(global.temp.welcomeEvent[threadID].joinTimeout);

		global.temp.welcomeEvent[threadID].joinTimeout = setTimeout(async () => {
			const threadData = await threadsData.get(threadID);
			if (threadData.settings.sendWelcomeMessage === false) return;

			const dataAddedParticipants = global.temp.welcomeEvent[threadID].dataAddedParticipants;
			const bannedUsers = threadData.data.banned_ban || [];
			const threadName = threadData.threadName;

			let newMembers = [], mentions = [];
			const isMultiple = dataAddedParticipants.length > 1;

			for (const user of dataAddedParticipants) {
				if (bannedUsers.some(banned => banned.id === user.userFbId)) continue;
				newMembers.push(user.fullName);
				mentions.push({ tag: user.fullName, id: user.userFbId });
			}

			if (newMembers.length === 0) return;

			const adderID = event.author;
			const adderInfo = await api.getUserInfo(adderID);
			const adderName = adderInfo[adderID]?.name || "Quelqu'un";
			mentions.push({ tag: adderName, id: adderID });

			let welcomeMessage = threadData.data.welcomeMessage || getLang("defaultWelcomeMessage");

			welcomeMessage = welcomeMessage
				.replace(/\{userName\}|\{userNameTag\}/g, newMembers.join(", "))
				.replace(/\{boxName\}|\{threadName\}/g, threadName)
				.replace(/\{multiple\}/g, isMultiple ? getLang("multiple2") : getLang("multiple1"))
				.replace(/\{session\}/g,
					hours <= 10 ? getLang("session1") :
					hours <= 12 ? getLang("session2") :
					hours <= 18 ? getLang("session3") : getLang("session4")
				)
				.replace(/\{adderName\}/g, adderName);

			const form = { body: welcomeMessage, mentions };

			if (threadData.data.welcomeAttachment) {
				const files = threadData.data.welcomeAttachment;
				const attachments = files.map(file => drive.getFile(file, "stream"));
				form.attachment = (await Promise.allSettled(attachments))
					.filter(({ status }) => status === "fulfilled")
					.map(({ value }) => value);
			} else {
				const nagi = await getNagiStreams();
				if (nagi.length) form.attachment = nagi;
			}

			message.send(form);
			delete global.temp.welcomeEvent[threadI
                                D];
		}, 1500);
	}
};
