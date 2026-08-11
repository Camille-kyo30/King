let createCanvas;
try {
  ({ createCanvas } = require("canvas"));
} catch (e) {
  console.error("[fakesms] Le module 'canvas' n'est pas installe. Lance: npm install canvas");
}

const fs = require("fs-extra");
const path = require("path");
const { drawRoundedRect } = require("./utils/phoneUtils");

const DB_PATH = path.join(__dirname, "data", "fakephone_messages.json");

async function readDB() {
  await fs.ensureFile(DB_PATH);
  try {
    const content = await fs.readFile(DB_PATH, "utf8");
    return content.trim() ? JSON.parse(content) : {};
  } catch (e) {
    return {};
  }
}

async function writeDB(data) {
  await fs.ensureDir(path.dirname(DB_PATH));
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}

async function generateNotificationCard(fromName, text) {
  const width = 420, height = 150;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#111827";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(255,255,255,0.08)";
  drawRoundedRect(ctx, 12, 12, width - 24, height - 24, 22);
  ctx.fill();

  const iconGrad = ctx.createLinearGradient(28, 28, 78, 78);
  iconGrad.addColorStop(0, "#34D399");
  iconGrad.addColorStop(1, "#059669");
  ctx.fillStyle = iconGrad;
  drawRoundedRect(ctx, 28, 28, 50, 50, 14);
  ctx.fill();

  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  drawRoundedRect(ctx, 40, 42, 26, 18, 6);
  ctx.stroke();

  ctx.fillStyle = "#9CA3AF";
  ctx.font = "600 12px Arial";
  ctx.textAlign = "left";
  const now = new Date();
  ctx.fillText(`MESSAGES  \u00B7  ${now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`, 92, 42);

  ctx.fillStyle = "#fff";
  ctx.font = "700 17px Arial";
  ctx.fillText(fromName, 92, 65);

  ctx.fillStyle = "#E5E7EB";
  ctx.font = "15px Arial";
  const preview = text.length > 40 ? text.slice(0, 40) + "..." : text;
  ctx.fillText(preview, 92, 88);

  return canvas;
}

module.exports = {
  config: {
    name: "fakesms",
    version: "1.1",
    author: "Camille Uchiha",
    countDown: 5,
    role: 0,
    shortDescription: "Envoie un faux SMS a un membre",
    longDescription: "Stocke un message pour un membre, visible dans fakeinbox et signale par un badge sur fakephone",
    category: "fun",
    guide: {
      en: "{pn} @membre <message> : envoie un message a ce membre"
    }
  },

  onStart: async function ({ message, event, args, usersData, api }) {
    try {
      if (!createCanvas) {
        return message.reply("Erreur: le module 'canvas' n'est pas installe sur le bot.");
      }

      const mentions = Object.keys(event.mentions || {});
      if (mentions.length === 0) {
        return message.reply("Usage: fakesms @membre ton message ici");
      }

      const receiverID = mentions[0];
      if (receiverID === event.senderID) {
        return message.reply("Tu ne peux pas t'envoyer un message a toi-meme.");
      }

      let text = args.join(" ");
      for (const uid of mentions) {
        const mentionData = event.mentions[uid];
        text = text.split(mentionData).join("").trim();
      }
      text = text.replace(/^@\S+\s*/, "").trim();

      if (!text) {
        return message.reply("Ecris un message apres le tag. Exemple: fakesms @Nom Salut ca va ?");
      }

      const senderName = await usersData.getName(event.senderID);
      const receiverName = await usersData.getName(receiverID);

      const db = await readDB();
      if (!db[receiverID]) db[receiverID] = [];
      db[receiverID].push({
        from: event.senderID,
        fromName: senderName,
        text,
        time: Date.now()
      });
      if (db[receiverID].length > 50) db[receiverID] = db[receiverID].slice(-50);
      await writeDB(db);

      await message.reply(`Message envoye a ${receiverName} ! (visible avec fakeinbox, et badge sur fakephone)`);

      try {
        const canvas = await generateNotificationCard(senderName, text);
        const cacheDir = path.join(__dirname, "cache");
        await fs.ensureDir(cacheDir);
        const filePath = path.join(cacheDir, `fakesms_notif_${Date.now()}.png`);
        fs.writeFileSync(filePath, canvas.toBuffer());

        await api.sendMessage(
          {
            body: `Nouveau message de ${senderName} !`,
            attachment: fs.createReadStream(filePath)
          },
          receiverID
        );

        fs.unlinkSync(filePath);
      } catch (notifErr) {
        console.log("[fakesms] Notification directe impossible (normal si pas d'interaction recente):", notifErr.message);
      }
    } catch (err) {
      console.error("[fakesms] Erreur:", err);
      message.reply("Une erreur est survenue. Regarde la console du bot.");
    }
  }
};
