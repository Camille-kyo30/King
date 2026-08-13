const { getStreamsFromAttachment } = global.utils;
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const notificationMemory = {};

// 🖼️ Images jointes au broadcast (aléatoire)
const IMAGES = [
  "https://i.ibb.co/NdnrhTgJ/473155112-938360181335287-9212391504228448125-n-jpg-stp-dst-jpg-s480x480-tt6-nc-cat-109-ccb-1-7-nc.jpg",
  "https://i.ibb.co/v45Cnt4y/07ea4e464493.jpg"
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
  const tmpPath = path.join(cacheDir, `noti_${Date.now()}.jpg`);
  const buffer = await getBuffer(url);
  if (!buffer) return null;
  fs.writeFileSync(tmpPath, buffer);
  return { stream: fs.createReadStream(tmpPath), path: tmpPath };
}

// ✍️ Police stylée (sans-serif gras unicode)
function toStyledFont(text = "") {
  const map = {
    A:"𝗔",B:"𝗕",C:"𝗖",D:"𝗗",E:"𝗘",F:"𝗙",G:"𝗚",H:"𝗛",I:"𝗜",J:"𝗝",
    K:"𝗞",L:"𝗟",M:"𝗠",N:"𝗡",O:"𝗢",P:"𝗣",Q:"𝗤",R:"𝗥",S:"𝗦",T:"𝗧",
    U:"𝗨",V:"𝗩",W:"𝗪",X:"𝗫",Y:"𝗬",Z:"𝗭",
    a:"𝗮",b:"𝗯",c:"𝗰",d:"𝗱",e:"𝗲",f:"𝗳",g:"𝗴",h:"𝗵",i:"𝗶",j:"𝗷",
    k:"𝗸",l:"𝗹",m:"𝗺",n:"𝗻",o:"𝗼",p:"𝗽",q:"𝗾",r:"𝗿",s:"𝘀",t:"𝘁",
    u:"𝘂",v:"𝘃",w:"𝘄",x:"𝘅",y:"𝘆",z:"𝘇",
    " ":" "
  };
  return text.split("").map(c => map[c] || c).join("");
}

function frame(title, body) {
  return (
`╭─────═━ ${title} ━═─────╮

${body}

╰─────═━━━━━━━━━━═─────╯`
  );
}

module.exports = {
  config: {
    name: "notification",
    aliases: ["notify", "noti"],
    version: "15.0",
    author: "Camille uchiha",
    countDown: 5,
    role: 2,
    category: "owner",
    shortDescription: "Broadcast texte stylé avec image",
    longDescription: "Diffuse un message texte stylé accompagné d'une image et des instructions pour répondre à l'admin via callad.",
    guide: { en: `Usage: {pn} <message>` },
    usePrefix: false,
    noPrefix: true
  },

  onStart: async function({ message, api, event, threadsData, envCommands, commandName, args }) {
    const { delayPerGroup = 400 } = envCommands[commandName] || {};
    const textToDraw = args.join(" ");
    if (!textToDraw) return message.reply(`[SYSTEM] ERREUR: Contenu du message vide.`);

    const adminID = event.senderID;
    let adminName = "Administrateur";
    try {
      const usersInfo = await api.getUserInfo(adminID);
      adminName = usersInfo[adminID]?.name || adminName;
    } catch {}

    const allThreads = (await threadsData.getAll())
      .filter(t => t.isGroup && t.members.find(m => m.userID == api.getCurrentUserID())?.inGroup);

    if (!allThreads.length) return message.reply(`[SYSTEM] INFO: Aucun groupe cible disponible.`);

    message.reply(`[SYSTEM] Envoie en cours..⏳(${allThreads.length} groupes)...`);

    const prefix = global.GoatBot?.config?.prefix || "¥";

    let sendSuccess = 0;
    const sendError = [];

    for (const thread of allThreads) {
      let groupName = thread.name || "Groupe sans nom";

      try {
        const threadInfo = await api.getThreadInfo(thread.threadID);
        groupName = threadInfo.threadName || groupName;
      } catch {}

      const now = new Date();
      const timeString = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

      try {
        const bodyContent =
`👑 ${toStyledFont("De")} : ${adminName}
🏠 ${toStyledFont("Groupe")} : ${groupName}
🕐 ${toStyledFont("Envoyé a")} ${timeString}

━━━━━━━━━━━━━━━

💬 ${toStyledFont(textToDraw)}

━━━━━━━━━━━━━━━

📌 ${toStyledFont("Pour repondre a l administration")} :
✍️ Ecris ${prefix}callad + ton message

Exemple :
${prefix}callad salut bro`;

        const body = "📢 " + frame(toStyledFont("SYSTEM BROADCAST"), bodyContent);

        const randomImage = await getRandomImageStream();
        const attachments = [];
        if (randomImage) attachments.push(randomImage.stream);
        attachments.push(
          ...await getStreamsFromAttachment([
            ...event.attachments,
            ...(event.messageReply?.attachments || [])
          ])
        );

        const formSend = {
          body,
          attachment: attachments
        };

        const sentMsg = await api.sendMessage(formSend, thread.threadID);
        sendSuccess++;
        notificationMemory[`${thread.threadID}_${sentMsg.messageID}`] = { groupName, threadID: thread.threadID };

        if (randomImage) {
          setTimeout(() => { if (fs.existsSync(randomImage.path)) fs.unlinkSync(randomImage.path); }, 20000);
        }

        await new Promise(resolve => setTimeout(resolve, delayPerGroup));

      } catch (err) {
        let errorMsg = err.message;
        try {
          const parsed = JSON.parse(err.message);
          if (parsed.errorDescription) errorMsg = parsed.errorDescription;
        } catch {}
        sendError.push({ threadID: thread.threadID, groupName, error: errorMsg });
      }
    }

    let bilan = `[BILAN DIFFUSION]\n🟢 Réussis: ${sendSuccess}\n🔴 Échecs: ${sendError.length}`;
    if (sendError.length) sendError.forEach(err => { bilan += `\n- ${err.groupName}: ${err.error}`; });
    message.reply(bilan.trim());
  },

  onMessage: async function({ api, event }) {
    if (!event.messageReply) return;

    const repliedMsgID = event.messageReply.messageID;
    const notificationKey = Object.keys(notificationMemory).find(key => key.endsWith(`_${repliedMsgID}`));
    if (!notificationKey) return;

    const { groupName, threadID } = notificationMemory[notificationKey];
    const userName = event.senderName || "Utilisateur";
    const userID = event.senderID;

    const adminMessage = `[REPONSE DETECTEE]\n👤 Expéditeur: ${userName} (ID: ${userID})\n👥 Groupe: ${groupName} (ID: ${threadID})\n\n💬 Message:\n${event.body || "Média joint"}\n\n---\n👉 Répondez à cette alerte pour envoyer votre message retour.`;

    const targetAdmin = global.config.ADMINBOT || event.senderID;
    api.sendMessage(adminMessage, targetAdmin);
  }
};
