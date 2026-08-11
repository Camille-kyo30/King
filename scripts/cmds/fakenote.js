let createCanvas;
try {
  ({ createCanvas } = require("canvas"));
} catch (e) {
  console.error("[fakenotes] Le module 'canvas' n'est pas installe. Lance: npm install canvas");
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

const DB_PATH = path.join(__dirname, "data", "fakephone_notes.json");

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

async function generateNotesScreen(userName, notes) {
  const { canvas, ctx } = startPhoneFrame(createCanvas);

  ctx.fillStyle = "#1C1C1E";
  ctx.fillRect(FRAME.screenX, FRAME.screenY, FRAME.screenW, FRAME.screenH);

  drawStatusBar(ctx);

  const headerTop = FRAME.screenY + 26;
  ctx.textAlign = "left";
  ctx.fillStyle = "#fff";
  ctx.font = "700 26px Arial";
  ctx.fillText("Notes", FRAME.screenX + 24, headerTop + 45);

  ctx.fillStyle = "#8E8E93";
  ctx.font = "13px Arial";
  ctx.fillText(`${notes.length} note(s) - ${userName}`, FRAME.screenX + 24, headerTop + 65);

  let y = headerTop + 90;
  const contentBottom = FRAME.screenY + FRAME.screenH - 30;
  const cardX = FRAME.screenX + 20;
  const cardW = FRAME.screenW - 40;

  if (notes.length === 0) {
    ctx.textAlign = "center";
    ctx.fillStyle = "#8E8E93";
    ctx.font = "15px Arial";
    ctx.fillText("Aucune note. Utilise: fakenotes add <texte>", FRAME.screenX + FRAME.screenW / 2, y + 40);
  }

  ctx.font = "14px Arial";

  for (const note of notes) {
    const lines = wrapText(ctx, note.text, cardW - 32);
    const displayLines = lines.slice(0, 3);
    const cardH = displayLines.length * 19 + 46;

    if (y + cardH > contentBottom) break;

    ctx.fillStyle = "#2C2C2E";
    drawRoundedRect(ctx, cardX, y, cardW, cardH, 14);
    ctx.fill();

    ctx.fillStyle = "#FFD60A";
    ctx.font = "600 11px Arial";
    ctx.textAlign = "left";
    ctx.fillText(`#${note.id}`, cardX + 16, y + 22);

    const date = new Date(note.time);
    const dateStr = date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) +
      " " + date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    ctx.fillStyle = "#8E8E93";
    ctx.font = "11px Arial";
    ctx.textAlign = "right";
    ctx.fillText(dateStr, cardX + cardW - 16, y + 22);

    ctx.fillStyle = "#E5E5EA";
    ctx.font = "14px Arial";
    ctx.textAlign = "left";
    displayLines.forEach((line, li) => {
      const isTruncated = li === 2 && lines.length > 3;
      ctx.fillText(isTruncated ? line + "..." : line, cardX + 16, y + 42 + li * 19);
    });

    y += cardH + 14;
  }

  drawHomeBar(ctx);
  endPhoneFrame(ctx);

  return canvas;
}

module.exports = {
  config: {
    name: "fakenotes",
    version: "1.0",
    author: "Camille Uchiha",
    countDown: 3,
    role: 0,
    shortDescription: "Vrai bloc-notes dans le portable",
    longDescription: "Ajoute, liste et supprime de vraies notes sauvegardees, affichees dans le cadre du telephone",
    category: "fun",
    guide: {
      en: "{pn} add <texte> : ajoute une note\n{pn} list : affiche tes notes\n{pn} del <id> : supprime une note\n{pn} clear : supprime toutes les notes"
    }
  },

  onStart: async function ({ message, event, args, usersData }) {
    try {
      if (!createCanvas) {
        return message.reply("Erreur: le module 'canvas' n'est pas installe sur le bot.");
      }

      const userID = event.senderID;
      const userName = await usersData.getName(userID);
      const db = await readDB();
      if (!db[userID]) db[userID] = [];

      const subCommand = (args[0] || "list").toLowerCase();

      if (subCommand === "add") {
        const text = args.slice(1).join(" ").trim();
        if (!text) return message.reply("Usage: fakenotes add <texte>");

        const nextId = db[userID].length > 0 ? Math.max(...db[userID].map(n => n.id)) + 1 : 1;
        db[userID].push({ id: nextId, text, time: Date.now() });
        await writeDB(db);

        return message.reply(`Note #${nextId} ajoutee. Tape fakenotes list pour voir toutes tes notes.`);
      }

      if (subCommand === "del") {
        const id = parseInt(args[1]);
        if (isNaN(id)) return message.reply("Usage: fakenotes del <id>");

        const before = db[userID].length;
        db[userID] = db[userID].filter(n => n.id !== id);
        await writeDB(db);

        if (db[userID].length === before) {
          return message.reply(`Note #${id} introuvable.`);
        }
        return message.reply(`Note #${id} supprimee.`);
      }

      if (subCommand === "clear") {
        db[userID] = [];
        await writeDB(db);
        return message.reply("Toutes tes notes ont ete supprimees.");
      }

      // Par defaut : afficher la liste (image)
      const notes = db[userID].slice().reverse();
      const canvas = await generateNotesScreen(userName, notes);

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const filePath = path.join(cacheDir, `fakenotes_${Date.now()}.png`);
      fs.writeFileSync(filePath, canvas.toBuffer());

      await message.reply({
        body: notes.length > 0 ? `Tu as ${notes.length} note(s).` : "Aucune note pour le moment.",
        attachment: fs.createReadStream(filePath)
      });

      fs.unlinkSync(filePath);
    } catch (err) {
      console.error("[fakenotes] Erreur:", err);
      message.reply("Une erreur est survenue. Regarde la console du bot.");
    }
  }
};
