let createCanvas;
try {
  ({ createCanvas } = require("canvas"));
} catch (e) {
  console.error("[fakeinbox] Le module 'canvas' n'est pas installe. Lance: npm install canvas");
}

const fs = require("fs-extra");
const path = require("path");
const {
  drawRoundedRect,
  FRAME,
  startPhoneFrame,
  drawStatusBar,
  drawHomeBar,
  endPhoneFrame
} = require("./utils/phoneUtils");

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

function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    const test = current ? current + " " + word : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function generateInboxScreen(userName, messages) {
  const { canvas, ctx } = startPhoneFrame(createCanvas);

  // Fond de l'appli Messages (style sombre WhatsApp)
  ctx.fillStyle = "#0B141A";
  ctx.fillRect(FRAME.screenX, FRAME.screenY, FRAME.screenW, FRAME.screenH);

  drawStatusBar(ctx);

  // Header appli
  const headerTop = FRAME.screenY + 26;
  const headerH = 74;
  const headerGrad = ctx.createLinearGradient(0, headerTop, 0, headerTop + headerH);
  headerGrad.addColorStop(0, "#1F2C34");
  headerGrad.addColorStop(1, "#111B21");
  ctx.fillStyle = headerGrad;
  ctx.fillRect(FRAME.screenX, headerTop, FRAME.screenW, headerH);

  ctx.textAlign = "left";
  ctx.fillStyle = "#fff";
  ctx.font = "700 20px Arial";
  ctx.fillText("Messages", FRAME.screenX + 24, headerTop + 32);

  ctx.fillStyle = "#8696A0";
  ctx.font = "13px Arial";
  ctx.fillText(`Boite de reception de ${userName}`, FRAME.screenX + 24, headerTop + 54);

  // Zone de conversation (scrollable simulee : on affiche les X derniers messages qui rentrent)
  const contentTop = headerTop + headerH + 20;
  const contentBottom = FRAME.screenY + FRAME.screenH - 30;
  const maxBubbleWidth = FRAME.screenW - 150;

  ctx.font = "15px Arial";

  if (messages.length === 0) {
    ctx.textAlign = "center";
    ctx.fillStyle = "#8696A0";
    ctx.font = "15px Arial";
    ctx.fillText("Aucun message pour le moment", FRAME.screenX + FRAME.screenW / 2, contentTop + 40);
  }

  let y = contentTop;
  const bubblePadding = 18;

  for (const msg of messages) {
    const lines = wrapText(ctx, msg.text, maxBubbleWidth);
    const lineWidths = lines.map(l => ctx.measureText(l).width);
    const bubbleWidth = Math.min(maxBubbleWidth, Math.max(...lineWidths, 60)) + bubblePadding * 2;
    const bubbleHeight = lines.length * 20 + 40;
    const blockHeight = bubbleHeight + 40;

    if (y + blockHeight > contentBottom) break; // ne depasse pas l'ecran

    const bubbleX = FRAME.screenX + 24;

    ctx.fillStyle = "#8696A0";
    ctx.font = "600 12px Arial";
    ctx.textAlign = "left";
    ctx.fillText(msg.fromName, bubbleX + 6, y);

    const bubbleY = y + 8;
    ctx.fillStyle = "#202C33";
    drawRoundedRect(ctx, bubbleX, bubbleY, bubbleWidth, bubbleHeight, 14);
    ctx.fill();

    ctx.fillStyle = "#E9EDEF";
    ctx.font = "15px Arial";
    lines.forEach((line, li) => {
      ctx.fillText(line, bubbleX + bubblePadding, bubbleY + 24 + li * 20);
    });

    const date = new Date(msg.time);
    const timeStr = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    ctx.fillStyle = "#667781";
    ctx.font = "10px Arial";
    ctx.fillText(timeStr, bubbleX + bubblePadding, bubbleY + bubbleHeight + 13);

    y = bubbleY + bubbleHeight + 34;
  }

  drawHomeBar(ctx);
  endPhoneFrame(ctx);

  return canvas;
}

module.exports = {
  config: {
    name: "fakeinbox",
    version: "2.0",
    author: "Camille Uchiha",
    countDown: 5,
    role: 0,
    shortDescription: "Consulte tes messages recus dans le portable",
    longDescription: "Affiche l'appli Messages ouverte dans le meme cadre de telephone que fakephone",
    category: "fun",
    guide: {
      en: "{pn} : ouvre l'appli Messages\n{pn} clear : vide ta boite de reception"
    }
  },

  onStart: async function ({ message, event, args, usersData }) {
    try {
      if (!createCanvas) {
        return message.reply("Erreur: le module 'canvas' n'est pas installe sur le bot.");
      }

      const db = await readDB();
      const userName = await usersData.getName(event.senderID);

      if (args[0] === "clear") {
        db[event.senderID] = [];
        await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
        return message.reply("Ta boite de reception a ete videe.");
      }

      const messages = (db[event.senderID] || []).slice(-15);

      const canvas = await generateInboxScreen(userName, messages);

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const filePath = path.join(cacheDir, `fakeinbox_${Date.now()}.png`);
      fs.writeFileSync(filePath, canvas.toBuffer());

      await message.reply({
        body: messages.length > 0
          ? `Tu as ${messages.length} message(s).`
          : "Ta boite de reception est vide.",
        attachment: fs.createReadStream(filePath)
      });

      fs.unlinkSync(filePath);
    } catch (err) {
      console.error("[fakeinbox] Erreur:", err);
      message.reply("Une erreur est survenue. Regarde la console du bot.");
    }
  }
};
    
