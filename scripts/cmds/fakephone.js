let createCanvas;
try {
  ({ createCanvas } = require("canvas"));
} catch (e) {
  console.error("[fakephone] Le module 'canvas' n'est pas installe. Lance: npm install canvas");
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

async function getUnreadCount(userID) {
  await fs.ensureFile(DB_PATH);
  try {
    const content = await fs.readFile(DB_PATH, "utf8");
    const db = content.trim() ? JSON.parse(content) : {};
    return (db[userID] || []).length;
  } catch (e) {
    return 0;
  }
}

const apps = [
  { name: "Messages", colors: ["#34D399", "#059669"], glyph: "chat" },
  { name: "Telephone", colors: ["#60A5FA", "#2563EB"], glyph: "phone" },
  { name: "Camera", colors: ["#9CA3AF", "#4B5563"], glyph: "camera" },
  { name: "Galerie", colors: ["#FBBF24", "#D97706"], glyph: "image" },
  { name: "Musique", colors: ["#F472B6", "#DB2777"], glyph: "note" },
  { name: "Reglages", colors: ["#94A3B8", "#475569"], glyph: "gear" },
  { name: "Navigateur", colors: ["#38BDF8", "#0284C7"], glyph: "globe" },
  { name: "Mail", colors: ["#F87171", "#DC2626"], glyph: "mail" },
  { name: "Calendrier", colors: ["#818CF8", "#4338CA"], glyph: "calendar" },
  { name: "Horloge", colors: ["#A78BFA", "#6D28D9"], glyph: "clock" },
  { name: "Calculatrice", colors: ["#6B7280", "#374151"], glyph: "calc" },
  { name: "Meteo", colors: ["#FDE047", "#CA8A04"], glyph: "sun" },
  { name: "Notes", colors: ["#FDE68A", "#F59E0B"], glyph: "note2" },
  { name: "Store", colors: ["#3B82F6", "#1D4ED8"], glyph: "bag" },
  { name: "Banque", colors: ["#2DD4BF", "#0D9488"], glyph: "bank" },
  { name: "Jeux", colors: ["#A3E635", "#65A30D"], glyph: "game" },
  { name: "Fichiers", colors: ["#FBBF24", "#B45309"], glyph: "folder" },
  { name: "Securite", colors: ["#1F2937", "#111827"], glyph: "lock" },
  { name: "Photos", colors: ["#22D3EE", "#0891B2"], glyph: "photo" },
  { name: "Social", colors: ["#3B82F6", "#1E40AF"], glyph: "people" }
];

function drawGlyph(ctx, glyph, cx, cy, size) {
  ctx.save();
  ctx.strokeStyle = "#ffffff";
  ctx.fillStyle = "#ffffff";
  ctx.lineWidth = Math.max(2, size * 0.08);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const s = size * 0.5;

  switch (glyph) {
    case "chat":
      drawRoundedRect(ctx, cx - s * 0.6, cy - s * 0.4, s * 1.2, s * 0.8, s * 0.2);
      ctx.fill();
      break;
    case "phone":
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.55, 0.3, Math.PI * 1.7);
      ctx.stroke();
      break;
    case "camera":
      drawRoundedRect(ctx, cx - s * 0.6, cy - s * 0.35, s * 1.2, s * 0.7, s * 0.15);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy + s * 0.02, s * 0.28, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case "image":
      drawRoundedRect(ctx, cx - s * 0.6, cy - s * 0.45, s * 1.2, s * 0.9, s * 0.12);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx - s * 0.2, cy - s * 0.1, s * 0.12, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "note":
      ctx.beginPath();
      ctx.arc(cx - s * 0.2, cy + s * 0.3, s * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.05, cy + s * 0.3);
      ctx.lineTo(cx - s * 0.05, cy - s * 0.4);
      ctx.lineTo(cx + s * 0.35, cy - s * 0.25);
      ctx.stroke();
      break;
    case "gear":
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.35, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.1, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "globe":
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(cx, cy, s * 0.2, s * 0.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.moveTo(cx - s * 0.5, cy);
      ctx.lineTo(cx + s * 0.5, cy);
      ctx.stroke();
      break;
    case "mail":
      drawRoundedRect(ctx, cx - s * 0.6, cy - s * 0.4, s * 1.2, s * 0.8, s * 0.1);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.6, cy - s * 0.4);
      ctx.lineTo(cx, cy + s * 0.05);
      ctx.lineTo(cx + s * 0.6, cy - s * 0.4);
      ctx.stroke();
      break;
    case "calendar":
      drawRoundedRect(ctx, cx - s * 0.55, cy - s * 0.45, s * 1.1, s * 0.9, s * 0.1);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.55, cy - s * 0.15);
      ctx.lineTo(cx + s * 0.55, cy - s * 0.15);
      ctx.stroke();
      break;
    case "clock":
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx, cy - s * 0.3);
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + s * 0.2, cy);
      ctx.stroke();
      break;
    case "calc":
      drawRoundedRect(ctx, cx - s * 0.45, cy - s * 0.55, s * 0.9, s * 1.1, s * 0.1);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.3, cy - s * 0.2);
      ctx.lineTo(cx + s * 0.3, cy - s * 0.2);
      ctx.stroke();
      break;
    case "sun":
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.3, 0, Math.PI * 2);
      ctx.fill();
      for (let a = 0; a < 8; a++) {
        const angle = (a * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(angle) * s * 0.45, cy + Math.sin(angle) * s * 0.45);
        ctx.lineTo(cx + Math.cos(angle) * s * 0.6, cy + Math.sin(angle) * s * 0.6);
        ctx.stroke();
      }
      break;
    case "note2":
      drawRoundedRect(ctx, cx - s * 0.45, cy - s * 0.55, s * 0.9, s * 1.1, s * 0.08);
      ctx.stroke();
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(cx - s * 0.25, cy - s * 0.2 + i * s * 0.25);
        ctx.lineTo(cx + s * 0.25, cy - s * 0.2 + i * s * 0.25);
        ctx.stroke();
      }
      break;
    case "bag":
      drawRoundedRect(ctx, cx - s * 0.45, cy - s * 0.3, s * 0.9, s * 0.7, s * 0.1);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy - s * 0.3, s * 0.25, Math.PI, 0);
      ctx.stroke();
      break;
    case "bank":
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.5, cy - s * 0.1);
      ctx.lineTo(cx, cy - s * 0.5);
      ctx.lineTo(cx + s * 0.5, cy - s * 0.1);
      ctx.stroke();
      drawRoundedRect(ctx, cx - s * 0.5, cy - s * 0.1, s * 1.0, s * 0.55, s * 0.05);
      ctx.stroke();
      break;
    case "game":
      drawRoundedRect(ctx, cx - s * 0.55, cy - s * 0.3, s * 1.1, s * 0.6, s * 0.3);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx + s * 0.2, cy, s * 0.06, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + s * 0.35, cy - s * 0.12, s * 0.06, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "folder":
      drawRoundedRect(ctx, cx - s * 0.55, cy - s * 0.15, s * 1.1, s * 0.6, s * 0.08);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.55, cy - s * 0.15);
      ctx.lineTo(cx - s * 0.35, cy - s * 0.4);
      ctx.lineTo(cx - s * 0.05, cy - s * 0.4);
      ctx.lineTo(cx + s * 0.1, cy - s * 0.15);
      ctx.stroke();
      break;
    case "lock":
      drawRoundedRect(ctx, cx - s * 0.35, cy - s * 0.05, s * 0.7, s * 0.55, s * 0.08);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy - s * 0.15, s * 0.25, Math.PI, 0);
      ctx.stroke();
      break;
    case "photo":
      drawRoundedRect(ctx, cx - s * 0.55, cy - s * 0.4, s * 1.1, s * 0.8, s * 0.1);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - s * 0.55, cy + s * 0.15);
      ctx.lineTo(cx - s * 0.2, cy - s * 0.1);
      ctx.lineTo(cx + s * 0.1, cy + s * 0.1);
      ctx.lineTo(cx + s * 0.55, cy - s * 0.2);
      ctx.stroke();
      break;
    case "people":
      ctx.beginPath();
      ctx.arc(cx - s * 0.15, cy - s * 0.15, s * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx + s * 0.25, cy - s * 0.1, s * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx - s * 0.15, cy + s * 0.35, s * 0.35, Math.PI, 0);
      ctx.fill();
      break;
    default:
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.3, 0, Math.PI * 2);
      ctx.fill();
  }
  ctx.restore();
}

function drawBadge(ctx, x, y, count) {
  if (count <= 0) return;
  const label = count > 99 ? "99+" : String(count);
  ctx.save();
  ctx.font = "700 11px Arial";
  const textW = ctx.measureText(label).width;
  const badgeW = Math.max(18, textW + 10);

  ctx.fillStyle = "#EF4444";
  drawRoundedRect(ctx, x - badgeW / 2, y - 9, badgeW, 18, 9);
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x, y + 1);
  ctx.textBaseline = "alphabetic";
  ctx.restore();
}

async function generatePhoneScreen(userName, unreadCount) {
  const { canvas, ctx } = startPhoneFrame(createCanvas);

  const grad = ctx.createLinearGradient(FRAME.screenX, FRAME.screenY, FRAME.screenX, FRAME.screenY + FRAME.screenH);
  grad.addColorStop(0, "#1a2a6c");
  grad.addColorStop(0.5, "#4a2c7a");
  grad.addColorStop(1, "#0f0c29");
  ctx.fillStyle = grad;
  ctx.fillRect(FRAME.screenX, FRAME.screenY, FRAME.screenW, FRAME.screenH);

  ctx.fillStyle = "rgba(255,255,255,0.5)";
  for (let i = 0; i < 40; i++) {
    const sx = FRAME.screenX + Math.random() * FRAME.screenW;
    const sy = FRAME.screenY + Math.random() * (FRAME.screenH * 0.4);
    ctx.beginPath();
    ctx.arc(sx, sy, Math.random() * 1.2, 0, Math.PI * 2);
    ctx.fill();
  }

  drawStatusBar(ctx);

  const now = new Date();
  const timeStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  ctx.textAlign = "center";
  ctx.font = "300 62px Arial";
  ctx.fillStyle = "#fff";
  ctx.fillText(timeStr, FRAME.screenX + FRAME.screenW / 2, FRAME.screenY + 130);

  const dateStr = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  ctx.font = "16px Arial";
  ctx.fillText(dateStr.charAt(0).toUpperCase() + dateStr.slice(1), FRAME.screenX + FRAME.screenW / 2, FRAME.screenY + 158);

  ctx.font = "600 18px Arial";
  ctx.fillText(userName, FRAME.screenX + FRAME.screenW / 2, FRAME.screenY + 190);

  // Notification banner sur le lockscreen si messages non lus
  if (unreadCount > 0) {
    const bannerY = FRAME.screenY + 215;
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    drawRoundedRect(ctx, FRAME.screenX + 20, bannerY, FRAME.screenW - 40, 55, 16);
    ctx.fill();

    const iconGrad = ctx.createLinearGradient(0, 0, 40, 40);
    iconGrad.addColorStop(0, "#34D399");
    iconGrad.addColorStop(1, "#059669");
    ctx.fillStyle = iconGrad;
    drawRoundedRect(ctx, FRAME.screenX + 32, bannerY + 10, 34, 34, 10);
    ctx.fill();
    drawGlyph(ctx, "chat", FRAME.screenX + 49, bannerY + 27, 24);

    ctx.textAlign = "left";
    ctx.fillStyle = "#fff";
    ctx.font = "700 14px Arial";
    ctx.fillText("Messages", FRAME.screenX + 78, bannerY + 24);
    ctx.font = "13px Arial";
    ctx.fillStyle = "#D1D5DB";
    ctx.fillText(`${unreadCount} nouveau(x) message(s)`, FRAME.screenX + 78, bannerY + 42);
    ctx.restore();
  }

  const cols = 4;
  const iconSize = 58;
  const startX = FRAME.screenX + 30;
  const startY = FRAME.screenY + (unreadCount > 0 ? 300 : 230);
  const gapX = (FRAME.screenW - 60 - iconSize * cols) / (cols - 1) + iconSize;
  const gapY = 96;

  apps.forEach((app, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = startX + col * gapX;
    const y = startY + row * gapY;

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;

    const iconGrad = ctx.createLinearGradient(x, y, x + iconSize, y + iconSize);
    iconGrad.addColorStop(0, app.colors[0]);
    iconGrad.addColorStop(1, app.colors[1]);
    ctx.fillStyle = iconGrad;
    drawRoundedRect(ctx, x, y, iconSize, iconSize, 16);
    ctx.fill();
    ctx.restore();

    ctx.save();
    const reflectGrad = ctx.createLinearGradient(x, y, x, y + iconSize / 2);
    reflectGrad.addColorStop(0, "rgba(255,255,255,0.25)");
    reflectGrad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = reflectGrad;
    drawRoundedRect(ctx, x, y, iconSize, iconSize / 2, 16);
    ctx.fill();
    ctx.restore();

    drawGlyph(ctx, app.glyph, x + iconSize / 2, y + iconSize / 2, iconSize * 0.7);

    if (app.name === "Messages") {
      drawBadge(ctx, x + iconSize - 6, y + 6, unreadCount);
    }

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "500 11px Arial";
    ctx.textAlign = "center";
    ctx.fillText(app.name, x + iconSize / 2, y + iconSize + 17);
  });

  const dockY = FRAME.screenY + FRAME.screenH - 100;
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  drawRoundedRect(ctx, FRAME.screenX + 20, dockY, FRAME.screenW - 40, 78, 26);
  ctx.fill();
  ctx.restore();

  const dockApps = apps.slice(0, 4);
  const dockIconSize = 50;
  const dockGap = (FRAME.screenW - 40 - dockIconSize * 4) / 5;

  dockApps.forEach((app, i) => {
    const x = FRAME.screenX + 20 + dockGap + i * (dockIconSize + dockGap);
    const y = dockY + 14;

    const iconGrad = ctx.createLinearGradient(x, y, x + dockIconSize, y + dockIconSize);
    iconGrad.addColorStop(0, app.colors[0]);
    iconGrad.addColorStop(1, app.colors[1]);
    ctx.fillStyle = iconGrad;
    drawRoundedRect(ctx, x, y, dockIconSize, dockIconSize, 14);
    ctx.fill();

    drawGlyph(ctx, app.glyph, x + dockIconSize / 2, y + dockIconSize / 2, dockIconSize * 0.7);

    if (app.name === "Messages") {
      drawBadge(ctx, x + dockIconSize - 4, y + 4, unreadCount);
    }
  });

  drawHomeBar(ctx);
  endPhoneFrame(ctx);

  return canvas;
}

module.exports = {
  config: {
    name: "fakephone",
    version: "3.0",
    author: "Camille Uchiha",
    countDown: 5,
    role: 0,
    shortDescription: "Simule un ecran d'accueil de smartphone realiste",
    longDescription: "Genere une capture d'ecran realiste d'un telephone avec badge de messages non lus",
    category: "fun",
    guide: {
      en: "{pn} : genere directement l'ecran d'accueil"
    }
  },

  onStart: async function ({ message, event, usersData }) {
    try {
      if (!createCanvas) {
        return message.reply("Erreur: le module 'canvas' n'est pas installe sur le bot.");
      }

      const userName = await usersData.getName(event.senderID);
      const unreadCount = await getUnreadCount(event.senderID);
      const canvas = await generatePhoneScreen(userName, unreadCount);

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const filePath = path.join(cacheDir, `fakephone_${Date.now()}.png`);
      fs.writeFileSync(filePath, canvas.toBuffer());

      await message.reply({
        body: unreadCount > 0
          ? `Voici ton ecran d'accueil, ${userName} ! Tu as ${unreadCount} message(s) non lu(s). Tape fakeinbox pour les voir.`
          : `Voici ton ecran d'accueil, ${userName} !`,
        attachment: fs.createReadStream(filePath)
      });

      fs.unlinkSync(filePath);
    } catch (err) {
      console.error("[fakephone] Erreur:", err);
      message.reply("Une erreur est survenue. Regarde la console du bot.");
    }
  }
};
