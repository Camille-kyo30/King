const { config } = global.GoatBot;
const fs = require("fs-extra");
const path = require("path");
const { createCanvas } = require("canvas");

module.exports = {
  config: {
    name: "whitelist",
    aliases: ["wl"],
    version: "2.2",
    author: "NeoKEX + Camille Uchiha",
    countDown: 5,
    role: 2,
    description: {
      en: "Manage whitelist for users and threads - Control who can use the bot",
      fr: "Gérer la liste blanche users et groupes - Contrôle qui peut utiliser le bot"
    },
    category: "owner",
    guide: {
      en: '...',
      fr: '📋 LISTE BLANCHE USERS:\n' +
        ' {pn} user add <uid | @tag>: Ajouter un user\n' +
        ' {pn} user remove <uid | @tag>: Retirer un user\n' +
        ' {pn} user list: Voir la liste users\n' +
        ' {pn} user on/off: Activer/désactiver mode user\n' +
        '📋 LISTE BLANCHE GROUPES:\n' +
        ' {pn} thread add [id]: Ajouter un groupe [actuel si vide]\n' +
        ' {pn} thread remove [id]: Retirer un groupe\n' +
        ' {pn} thread list: Voir la liste groupes\n' +
        ' {pn} thread on/off: Activer/désactiver mode groupe\n' +
        '📊 STATUS:\n' +
        ' {pn} status: Voir le statut des deux listes'
    }
  },

  langs: {
    en: {
      userAdded: "✅ | %1 user(s) added to whitelist:\n%2",
      userAlreadyWhitelisted: "\n⚠️ | %1 user(s) already whitelisted:\n%2",
      userMissingId: "⚠️ | Enter an ID or tag a user.",
      userRemoved: "✅ | %1 user(s) removed from whitelist:\n%2",
      userNotWhitelisted: "\n⚠️ | %1 user(s) not in whitelist:\n%2",
      userList: "📋 | Whitelisted users (%1):\n%2",
      userEmptyList: "📋 | No user in the whitelist.",
      userModeEnabled: "✅ | USER whitelist mode ENABLED.\nOnly whitelisted users can use the bot.",
      userModeDisabled: "✅ | USER whitelist mode DISABLED.",

      threadAdded: "✅ | Group added to whitelist:\n• %1 (%2)",
      threadAlreadyWhitelisted: "⚠️ | This group is already whitelisted.",
      threadRemoved: "✅ | Group removed from whitelist:\n• %1",
      threadNotWhitelisted: "⚠️ | This group is not whitelisted.",
      threadList: "📋 | Whitelisted groups (%1):\n%2",
      threadEmptyList: "📋 | No whitelisted group.",
      threadModeEnabled: "✅ | GROUP whitelist mode ENABLED.\nOnly whitelisted groups can use the bot.",
      threadModeDisabled: "✅ | GROUP whitelist mode DISABLED.",
      threadInvalidId: "⚠️ | Enter a valid group ID.",

      status: "📊 | WHITELIST STATUS\n👤 Users: %1\n Total: %2\n💬 Groups: %3\n Total: %4",
      noPermission: "❌ | Reserved for Premium or higher.",
      invalidSubcommand: "⚠️ | Invalid subcommand. Use: user, thread, or status"
    },
    fr: {
      userAdded: "✅ | %1 user(s) ajouté(s) à la liste:\n%2",
      userAlreadyWhitelisted: "\n⚠️ | %1 user(s) étaient déjà dans la liste:\n%2",
      userMissingId: "⚠️ | Entre un ID ou tag un user.",
      userRemoved: "✅ | %1 user(s) retiré(s) de la liste:\n%2",
      userNotWhitelisted: "\n⚠️ | %1 user(s) pas dans la liste:\n%2",
      userList: "📋 | Users autorisés (%1):\n%2",
      userEmptyList: "📋 | Aucun user dans la liste.",
      userModeEnabled: "✅ | Mode liste blanche USER ACTIVÉ.\nSeuls les users autorisés peuvent utiliser le bot.",
      userModeDisabled: "✅ | Mode liste blanche USER DÉSACTIVÉ.",

      threadAdded: "✅ | Groupe ajouté à la liste:\n• %1 (%2)",
      threadAlreadyWhitelisted: "⚠️ | Ce groupe est déjà autorisé.",
      threadRemoved: "✅ | Groupe retiré de la liste:\n• %1",
      threadNotWhitelisted: "⚠️ | Ce groupe n'est pas autorisé.",
      threadList: "📋 | Groupes autorisés (%1):\n%2",
      threadEmptyList: "📋 | Aucun groupe autorisé.",
      threadModeEnabled: "✅ | Mode liste blanche GROUPE ACTIVÉ.\nSeuls les groupes autorisés peuvent utiliser le bot.",
      threadModeDisabled: "✅ | Mode liste blanche GROUPE DÉSACTIVÉ.",
      threadInvalidId: "⚠️ | Entre un ID de groupe valide.",

      status: "📊 | STATUT LISTE BLANCHE\n👤 Users: %1\n Total: %2\n💬 Groupes: %3\n Total: %4",
      noPermission: "❌ | Réservé aux Premium ou plus.",
      invalidSubcommand: "⚠️ | Sous-commande invalide. Utilise: user, thread, ou status"
    }
  },

  onStart: async function ({ message, args, usersData, threadsData, event, getLang, role }) {
    if (!config.whiteListMode) {
      config.whiteListMode = { enable: false, whiteListIds: [] };
    }
    if (!config.whiteListMode.whiteListIds) {
      config.whiteListMode.whiteListIds = [];
    }
    if (!config.whiteListModeThread) {
      config.whiteListModeThread = { enable: false, whiteListThreadIds: [] };
    }
    if (!config.whiteListModeThread.whiteListThreadIds) {
      config.whiteListModeThread.whiteListThreadIds = [];
    }

    const saveConfig = () => {
      fs.writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));
    };

    const subCommand = args[0]?.toLowerCase();
    const action = args[1]?.toLowerCase();

    switch (subCommand) {
      case "user":
      case "u": {
        switch (action) {
          case "add":
          case "-a": {
            if (role < 3) return message.reply(getLang("noPermission"));

            let uids = [];
            if (Object.keys(event.mentions).length > 0) {
              uids = Object.keys(event.mentions);
            } else if (event.messageReply) {
              uids.push(event.messageReply.senderID);
            } else {
              uids = args.slice(2).filter(arg => !isNaN(arg));
            }

            if (uids.length === 0) {
              return message.reply(getLang("userMissingId"));
            }

            const added = [];
            const alreadyExists = [];

            for (const uid of uids) {
              const uidStr = String(uid);
              if (config.whiteListMode.whiteListIds.map(String).includes(uidStr)) {
                alreadyExists.push(uidStr);
              } else {
                config.whiteListMode.whiteListIds.push(uidStr);
                added.push(uidStr);
              }
            }

            saveConfig();

            const addedNames = await Promise.all(
              added.map(async uid => {
                const name = await usersData.getName(uid);
                return `• ${name} (${uid})`;
              })
            );
            const alreadyNames = await Promise.all(
              alreadyExists.map(async uid => {
                const name = await usersData.getName(uid);
                return `• ${name} (${uid})`;
              })
            );

            let response = "";
            if (added.length > 0) {
              response += getLang("userAdded", added.length, addedNames.join("\n"));
            }
            if (alreadyExists.length > 0) {
              response += getLang("userAlreadyWhitelisted", alreadyExists.length, alreadyNames.join("\n"));
            }

            return message.reply(response);
          }

          case "remove":
          case "-r":
          case "delete":
          case "-d": {
            if (role < 3) return message.reply(getLang("noPermission"));

            let uids = [];
            if (Object.keys(event.mentions).length > 0) {
              uids = Object.keys(event.mentions);
            } else if (event.messageReply) {
              uids.push(event.messageReply.senderID);
            } else {
              uids = args.slice(2).filter(arg => !isNaN(arg));
            }

            if (uids.length === 0) {
              return message.reply(getLang("userMissingId"));
            }

            const removed = [];
            const notFound = [];

            for (const uid of uids) {
              const uidStr = String(uid);
              const index = config.whiteListMode.whiteListIds.map(String).indexOf(uidStr);
              if (index !== -1) {
                config.whiteListMode.whiteListIds.splice(index, 1);
                removed.push(uidStr);
              } else {
                notFound.push(uidStr);
              }
            }

            saveConfig();

            const removedNames = await Promise.all(
              removed.map(async uid => {
                const name = await usersData.getName(uid);
                return `• ${name} (${uid})`;
              })
            );
            const notFoundNames = await Promise.all(
              notFound.map(async uid => {
                const name = await usersData.getName(uid);
                return `• ${name} (${uid})`;
              })
            );

            let response = "";
            if (removed.length > 0) {
              response += getLang("userRemoved", removed.length, removedNames.join("\n"));
            }
            if (notFound.length > 0) {
              response += getLang("userNotWhitelisted", notFound.length, notFoundNames.join("\n"));
            }

            return message.reply(response);
          }

          case "list":
          case "-l": {
            const whitelistIds = config.whiteListMode.whiteListIds;

            if (whitelistIds.length === 0) {
              return message.reply(getLang("userEmptyList"));
            }

            const userNames = await Promise.all(
              whitelistIds.map(async uid => {
                const name = await usersData.getName(uid);
                return `• ${name} (${uid})`;
              })
            );

            return message.reply(getLang("userList", whitelistIds.length, userNames.join("\n")));
          }

          case "on":
          case "enable": {
            if (role < 3) return message.reply(getLang("noPermission"));

            config.whiteListMode.enable = true;
            saveConfig();
            return message.reply(getLang("userModeEnabled"));
          }

          case "off":
          case "disable": {
            if (role < 3) return message.reply(getLang("noPermission"));

            config.whiteListMode.enable = false;
            saveConfig();
            return message.reply(getLang("userModeDisabled"));
          }

          default:
            return message.SyntaxError();
        }
      }

      case "thread":
      case "t":
      case "group":
      case "g": {
        switch (action) {
          case "add":
          case "-a": {
            if (role < 3) return message.reply(getLang("noPermission"));

            let threadID = args[2];
            if (!threadID) {
              threadID = event.threadID;
            }

            if (!threadID || isNaN(threadID)) {
              return message.reply(getLang("threadInvalidId"));
            }

            const threadIDStr = String(threadID);

            if (config.whiteListModeThread.whiteListThreadIds.map(String).includes(threadIDStr)) {
              return message.reply(getLang("threadAlreadyWhitelisted"));
            }

            config.whiteListModeThread.whiteListThreadIds.push(threadIDStr);
            saveConfig();

            let threadName = "Groupe inconnu";
            try {
              const threadInfo = await threadsData.get(threadIDStr);
              threadName = threadInfo?.threadName || threadName;
            } catch (e) {}

            return message.reply(getLang("threadAdded", threadName, threadIDStr));
          }

          case "remove":
          case "-r":
          case "delete":
          case "-d": {
            if (role < 3) return message.reply(getLang("noPermission"));

            let threadID = args[2];
            if (!threadID) {
              threadID = event.threadID;
            }

            if (!threadID || isNaN(threadID)) {
              return message.reply(getLang("threadInvalidId"));
            }

            const threadIDStr = String(threadID);
            const index = config.whiteListModeThread.whiteListThreadIds.map(String).indexOf(threadIDStr);

            if (index === -1) {
              return message.reply(getLang("threadNotWhitelisted"));
            }

            config.whiteListModeThread.whiteListThreadIds.splice(index, 1);
            saveConfig();

            return message.reply(getLang("threadRemoved", threadIDStr));
          }

          case "list":
          case "-l": {
            const threadIds = config.whiteListModeThread.whiteListThreadIds;

            if (threadIds.length === 0) {
              return message.reply(getLang("threadEmptyList"));
            }

            const threadNames = await Promise.all(
              threadIds.map(async tid => {
                let name = "Groupe inconnu";
                try {
                  const threadInfo = await threadsData.get(String(tid));
                  name = threadInfo?.threadName || name;
                } catch (e) {}
                return `• ${name} (${tid})`;
              })
            );

            return message.reply(getLang("threadList", threadIds.length, threadNames.join("\n")));
          }

          case "on":
          case "enable": {
            if (role < 3) return message.reply(getLang("noPermission"));

            config.whiteListModeThread.enable = true;
            saveConfig();
            return message.reply(getLang("threadModeEnabled"));
          }

          case "off":
          case "disable": {
            if (role < 3) return message.reply(getLang("noPermission"));

            config.whiteListModeThread.enable = false;
            saveConfig();
            return message.reply(getLang("threadModeDisabled"));
          }

          default:
            return message.SyntaxError();
        }
      }

      case "status":
      case "info": {
        const userEnabled = config.whiteListMode.enable;
        const userCount = config.whiteListMode.whiteListIds.length;
        const threadEnabled = config.whiteListModeThread.enable;
        const threadCount = config.whiteListModeThread.whiteListThreadIds.length;

        const textFallback = getLang("status",
          userEnabled ? "ON" : "OFF", userCount,
          threadEnabled ? "ON" : "OFF", threadCount
        );

        const cacheDir = path.join(__dirname, "cache");
        fs.ensureDirSync(cacheDir);
        const imgPath = path.join(cacheDir, `whitelist_status_${event.threadID}_${Date.now()}.png`);

        try {
          const buffer = buildStatusCard({ userEnabled, userCount, threadEnabled, threadCount });
          fs.writeFileSync(imgPath, buffer);

          return message.reply({
            body: textFallback,
            attachment: fs.createReadStream(imgPath)
          }, () => fs.unlink(imgPath, () => {}));
        } catch (err) {
          return message.reply(textFallback);
        }
      }

      default:
        return message.reply(getLang("invalidSubcommand"));
    }
  }
};

// ==============================
// === Carte de statut Canvas ===
// ==============================
function buildStatusCard({ userEnabled, userCount, threadEnabled, threadCount }) {
  const width = 900;
  const height = 420;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Fond
  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#0f0c29");
  bg.addColorStop(0.5, "#302b63");
  bg.addColorStop(1, "#24243e");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  drawGlow(ctx, width - 100, 60, 220, "rgba(255, 110, 196, 0.3)");
  drawGlow(ctx, 60, height - 60, 260, "rgba(120, 115, 245, 0.3)");

  ctx.fillStyle = "rgba(255,255,255,0.04)";
  for (let x = 20; x < width; x += 28) {
    for (let y = 20; y < height; y += 28) {
      ctx.beginPath();
      ctx.arc(x, y, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Carte glassmorphism
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 18;
  ctx.fillStyle = "rgba(255,255,255,0.07)";
  roundRect(ctx, 30, 30, width - 60, height - 60, 28);
  ctx.fill();
  ctx.restore();

  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  roundRect(ctx, 30, 30, width - 60, height - 60, 28);
  ctx.stroke();

  const accentGrad = ctx.createLinearGradient(30, 0, width - 30, 0);
  accentGrad.addColorStop(0, "#ff6ec4");
  accentGrad.addColorStop(1, "#7873f5");
  ctx.fillStyle = accentGrad;
  roundRect(ctx, 30, 30, width - 60, 6, 3);
  ctx.fill();

  // Titre
  ctx.textBaseline = "top";
  ctx.font = "15px Sans";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText("SÉCURITÉ", 70, 65);

  ctx.font = "bold 32px Sans";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("Statut de la liste blanche", 70, 88);

  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(70, 150);
  ctx.lineTo(width - 70, 150);
  ctx.stroke();

  // Deux blocs statut côte à côte
  const blockW = (width - 60 - 70 - 30) / 2;
  drawModeBlock(ctx, 70, 180, blockW, "person", "USERS", userEnabled, userCount);
  drawModeBlock(ctx, 70 + blockW + 30, 180, blockW, "group", "GROUPES", threadEnabled, threadCount);

  return canvas.toBuffer("image/png");
}

function drawModeBlock(ctx, x, y, w, icon, label, enabled, count) {
  const h = 190;
  const statusColorA = enabled ? "#4ade80" : "#94a3b8";
  const statusColorB = enabled ? "#22c55e" : "#64748b";

  // Fond du bloc
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  roundRect(ctx, x, y, w, h, 18);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, 18);
  ctx.stroke();

  // Icône ronde
  const r = 30;
  const cx = x + 40;
  const cy = y + 40;
  const grad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  grad.addColorStop(0, statusColorA);
  grad.addColorStop(1, statusColorB);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2.4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (icon === "person") {
    // Tête + épaules
    ctx.beginPath();
    ctx.arc(cx, cy - 8, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy + 22, 14, Math.PI, 0, false);
    ctx.stroke();
  } else if (icon === "group") {
    // Deux têtes superposées
    ctx.beginPath();
    ctx.arc(cx - 7, cy - 6, 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + 8, cy - 6, 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx - 7, cy + 20, 11, Math.PI, 0, false);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + 8, cy + 20, 11, Math.PI, 0, false);
    ctx.stroke();
  }

  // Textes
  ctx.textBaseline = "top";
  ctx.font = "14px Sans";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.fillText(label, x + 90, y + 22);

  ctx.font = "bold 24px Sans";
  ctx.fillStyle = statusColorA;
  ctx.fillText(enabled ? "ACTIVÉ" : "DÉSACTIVÉ", x + 90, y + 44);

  // Séparateur
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.beginPath();
  ctx.moveTo(x + 24, y + 95);
  ctx.lineTo(x + w - 24, y + 95);
  ctx.stroke();

  // Compteur
  ctx.font = "14px Sans";
  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.fillText("Total autorisé", x + 24, y + 115);

  ctx.font = "bold 42px Sans";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(String(count), x + 24, y + 138);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawGlow(ctx, x, y, radius, color) {
  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
  grad.addColorStop(0, color);
  grad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
              }
