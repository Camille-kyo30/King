const fs = require("fs-extra");
const path = require("path");
const { createCanvas, loadImage } = require("canvas");
const { utils } = global;

module.exports = {
	config: {
		name: "prefix",
		version: "1.6",
		author: "NTKhang & Christus",
		editor: "Camille Uchiha 🍓",
		countDown: 5,
		role: 0,
		description: "Changer le préfixe du bot dans ton groupe ou pour tout le bot (admin bot seulement)",
		category: "config",
		guide: {
			vi: " {pn} <new prefix>: thay đổi prefix mới trong box chat của bạn"
				+ "\n Ví dụ:"
				+ "\n {pn} #"
				+ "\n\n {pn} <new prefix> -g: thay đổi prefix mới trong hệ thống bot (chỉ admin bot)"
				+ "\n Ví dụ:"
				+ "\n {pn} # -g"
				+ "\n\n {pn} reset: thay đổi prefix trong box chat của bạn về mặc định",
			en: " {pn} <new prefix>: change new prefix in your box chat"
				+ "\n Example:"
				+ "\n {pn} #"
				+ "\n\n {pn} <new prefix> -g: change new prefix in system bot (only admin bot)"
				+ "\n Example:"
				+ "\n {pn} # -g"
				+ "\n\n {pn} reset: change prefix in your box chat to default",
			fr: " {pn} <nouveau prefix>: changer le prefix dans ton groupe"
				+ "\n Exemple:"
				+ "\n {pn} #"
				+ "\n\n {pn} <nouveau prefix> -g: changer le prefix du bot entier (admin bot seulement)"
				+ "\n Exemple:"
				+ "\n {pn} # -g"
				+ "\n\n {pn} reset: remettre le prefix par défaut dans ton groupe"
		}
	},

	langs: {
		vi: {
			reset: "Đã reset prefix của bạn về mặc định: %1",
			onlyAdmin: "Chỉ admin mới có thể thay đổi prefix hệ thống bot",
			confirmGlobal: "Vui lòng thả cảm xúc bất kỳ vào tin nhắn này để xác nhận thay đổi prefix của toàn bộ hệ thống bot",
			confirmThisThread: "Vui lòng thả cảm xúc bất kỳ vào tin nhắn này để xác nhận thay đổi prefix trong nhóm chat của bạn",
			successGlobal: "Đã thay đổi prefix hệ thống bot thành: %1",
			successThisThread: "Đã thay đổi prefix trong nhóm chat của bạn thành: %1"
		},
		en: {
			reset: "Your prefix reset to default: %1",
			onlyAdmin: "Only admin can change prefix of system bot",
			confirmGlobal: "Please react to this message to confirm change prefix of system bot",
			confirmThisThread: "Please react to this message to confirm change prefix in your box chat",
			successGlobal: "Changed prefix of system bot to: %1",
			successThisThread: "Changed prefix in your box chat to: %1"
		},
		fr: {
			reset: `🍓━━━━━━━━🍓\n✅ 𝗥𝗘𝗜𝗡𝗜𝗧𝗜𝗔𝗟𝗜𝗦𝗘\nLe prefix a été remis par défaut: %1\n🍓━━━━━━━━🍓`,
			onlyAdmin: `🍓━━━━━━━━🍓\n❌ 𝗘𝗥𝗥𝗘𝗨𝗥\n\nSeul l'admin du bot peut changer le prefix global\n🍓━━━━━━━━🍓`,
			confirmGlobal: `🍓━━━━━━━━🍓\n⚠️ 𝗖𝗢𝗡𝗙𝗜𝗥𝗠𝗔𝗧𝗜𝗢𝗡\n\nRéagis à ce message pour confirmer le changement du prefix GLOBAL du bot en: %1\n🍓━━━━━━━━🍓`,
			confirmThisThread: `🍓━━━━━━━━🍓\n⚠️ 𝗖𝗢𝗡𝗙𝗜𝗥𝗠𝗔𝗧𝗜𝗢𝗡\n\nRéagis à ce message pour confirmer le changement du prefix dans ce groupe en: %1\n🍓━━━━━━━━🍓`,
			successGlobal: `🍓━━━━━━━━🍓\n✅ 𝗦𝗨𝗖𝗘̀𝗦\nPrefix global changé en: %1\n🍓━━━━━━━━🍓`,
			successThisThread: `🍓━━━━━━━━🍓\n✅ 𝗦𝗨𝗖𝗘̀𝗦\nPrefix de ce groupe changé en: %1\n🍓━━━━━━━━🍓`
		}
	},

	onStart: async function ({ message, role, args, commandName, event, threadsData, getLang }) {
		if (!args[0])
			return message.SyntaxError();

		if (args[0] == 'reset') {
			await threadsData.set(event.threadID, null, "data.prefix");
			return message.reply(getLang("reset", global.GoatBot.config.prefix));
		}

		const newPrefix = args[0];
		const formSet = {
			commandName,
			author: event.senderID,
			newPrefix
		};

		if (args[1] === "-g")
			if (role < 2)
				return message.reply(getLang("onlyAdmin"));
			else
				formSet.setGlobal = true;
		else
			formSet.setGlobal = false;

		return message.reply(args[1] === "-g" ? getLang("confirmGlobal", newPrefix) : getLang("confirmThisThread", newPrefix), (err, info) => {
			formSet.messageID = info.messageID;
			global.GoatBot.onReaction.set(info.messageID, formSet);
		});
	},

	onReaction: async function ({ message, threadsData, event, Reaction, getLang }) {
		const { author, newPrefix, setGlobal } = Reaction;
		if (event.userID !== author)
			return;
		if (setGlobal) {
			global.GoatBot.config.prefix = newPrefix;
			fs.writeFileSync(global.client.dirConfig, JSON.stringify(global.GoatBot.config, null, 2));
			return message.reply(getLang("successGlobal", newPrefix));
		}
		else {
			await threadsData.set(event.threadID, newPrefix, "data.prefix");
			return message.reply(getLang("successThisThread", newPrefix));
		}
	},

	onChat: async function ({ event, message, usersData, api }) {
		if (!(event.body && event.body.toLowerCase() === "prefix"))
			return;

		const { senderID, threadID } = event;
		const userName = await usersData.getName(senderID);
		const botName = global.GoatBot.config.nickNameBot || "Bot";
		const globalPrefix = global.GoatBot.config.prefix;
		const threadPrefix = utils.getPrefix(threadID);

		// Dossier cache pour l'image générée
		const cacheDir = path.join(__dirname, "cache");
		fs.ensureDirSync(cacheDir);
		const imgPath = path.join(cacheDir, `prefix_${senderID}.png`);

		try {
			// === Récupération de la photo de profil ===
			// La route graph.facebook.com/{uid}/picture sans access_token renvoie une
			// silhouette par défaut. On passe donc par api.getUserInfo (fca) qui donne
			// la vraie URL de l'avatar via le champ thumbSrc.
			let avatarUrl;
			try {
				const info = await api.getUserInfo(senderID);
				avatarUrl = info?.[senderID]?.thumbSrc;
			} catch (e) {
				avatarUrl = null;
			}
			if (!avatarUrl)
				avatarUrl = `https://graph.facebook.com/${senderID}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;

			const avatar = await loadImage(avatarUrl);

			// === Création du Canvas ===
			const width = 900;
			const height = 460;
			const canvas = createCanvas(width, height);
			const ctx = canvas.getContext("2d");

			// --- Fond : dégradé sombre + halos de couleur ---
			const bg = ctx.createLinearGradient(0, 0, width, height);
			bg.addColorStop(0, "#0f0c29");
			bg.addColorStop(0.5, "#302b63");
			bg.addColorStop(1, "#24243e");
			ctx.fillStyle = bg;
			ctx.fillRect(0, 0, width, height);

			// Halos lumineux décoratifs
			drawGlow(ctx, width - 100, 60, 220, "rgba(255, 110, 196, 0.35)");
			drawGlow(ctx, 60, height - 60, 260, "rgba(120, 115, 245, 0.35)");

			// Motif de points en fond (texture discrète)
			ctx.fillStyle = "rgba(255,255,255,0.04)";
			for (let x = 20; x < width; x += 28) {
				for (let y = 20; y < height; y += 28) {
					ctx.beginPath();
					ctx.arc(x, y, 1.4, 0, Math.PI * 2);
					ctx.fill();
				}
			}

			// --- Carte glassmorphism ---
			ctx.save();
			ctx.shadowColor = "rgba(0,0,0,0.45)";
			ctx.shadowBlur = 40;
			ctx.shadowOffsetY = 18;
			ctx.fillStyle = "rgba(255, 255, 255, 0.07)";
			roundRect(ctx, 30, 30, width - 60, height - 60, 28);
			ctx.fill();
			ctx.restore();

			ctx.lineWidth = 1.5;
			ctx.strokeStyle = "rgba(255,255,255,0.15)";
			roundRect(ctx, 30, 30, width - 60, height - 60, 28);
			ctx.stroke();

			// Barre d'accent en haut de carte
			const accentGrad = ctx.createLinearGradient(30, 0, width - 30, 0);
			accentGrad.addColorStop(0, "#ff6ec4");
			accentGrad.addColorStop(1, "#7873f5");
			ctx.fillStyle = accentGrad;
			roundRect(ctx, 30, 30, width - 60, 6, 3);
			ctx.fill();

			// --- Avatar avec anneau dégradé ---
			const avatarSize = 190;
			const avatarX = 90;
			const avatarY = height / 2 - avatarSize / 2 + 10;
			const cx = avatarX + avatarSize / 2;
			const cy = avatarY + avatarSize / 2;

			const ringGrad = ctx.createLinearGradient(avatarX, avatarY, avatarX + avatarSize, avatarY + avatarSize);
			ringGrad.addColorStop(0, "#ff6ec4");
			ringGrad.addColorStop(1, "#7873f5");
			ctx.beginPath();
			ctx.arc(cx, cy, avatarSize / 2 + 8, 0, Math.PI * 2);
			ctx.fillStyle = ringGrad;
			ctx.shadowColor = "rgba(255, 110, 196, 0.6)";
			ctx.shadowBlur = 25;
			ctx.fill();
			ctx.shadowBlur = 0;

			ctx.save();
			ctx.beginPath();
			ctx.arc(cx, cy, avatarSize / 2, 0, Math.PI * 2);
			ctx.closePath();
			ctx.clip();
			ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
			ctx.restore();

			// Petit badge "en ligne" sur l'avatar
			const badgeR = 16;
			const badgeX = cx + avatarSize / 2 * 0.7;
			const badgeY = cy + avatarSize / 2 * 0.7;
			ctx.beginPath();
			ctx.arc(badgeX, badgeY, badgeR + 4, 0, Math.PI * 2);
			ctx.fillStyle = "#24243e";
			ctx.fill();
			ctx.beginPath();
			ctx.arc(badgeX, badgeY, badgeR, 0, Math.PI * 2);
			ctx.fillStyle = "#4ade80";
			ctx.fill();

			// --- Textes ---
			const textX = avatarX + avatarSize + 60;
			ctx.textBaseline = "top";

			ctx.font = "bold 36px Sans";
			ctx.fillStyle = "#ffffff";
			ctx.fillText(`Salut, ${userName}`, textX, 55);

			ctx.font = "20px Sans";
			ctx.fillStyle = "rgba(255,255,255,0.6)";
			ctx.fillText(`Je suis ${botName}, à ton service`, textX, 100);

			// Ligne séparatrice fine
			ctx.strokeStyle = "rgba(255,255,255,0.15)";
			ctx.lineWidth = 1;
			ctx.beginPath();
			ctx.moveTo(textX, 140);
			ctx.lineTo(width - 70, 140);
			ctx.stroke();

			// Bloc "Global"
			drawIconPill(ctx, textX, 170, "globe", "Global", globalPrefix);
			// Bloc "Ici"
			drawIconPill(ctx, textX, 250, "chat", "Cette conversation", threadPrefix);

			// Note en bas
			ctx.font = "17px Sans";
			ctx.fillStyle = "rgba(255,255,255,0.45)";
			ctx.fillText(`Tape « ${threadPrefix}help » pour voir toutes mes commandes`, textX, 340);

			// Sauvegarde
			const buffer = canvas.toBuffer("image/png");
			fs.writeFileSync(imgPath, buffer);

			return message.reply({
				body: `🍓━━━━━━━━🍓\n👋 𝗦𝗔𝗟𝗨𝗧 ${userName}\n➥ 🌐 Global: ${globalPrefix}\n➥ 💬 Ici: ${threadPrefix}\nJe suis ${botName} à ton service 🫡\n🍓━━━━━━━━🍓`,
				attachment: fs.createReadStream(imgPath)
			}, () => fs.unlinkSync(imgPath));

		} catch (err) {
			console.error("Erreur génération carte prefix:", err);
			return message.reply(`👋 Hey ${userName}, did you ask for my prefix?\n➥ 🌐 Global: ${globalPrefix}\n➥ 💬 This Chat: ${threadPrefix}\nI'm ${botName} at your service 🫡`);
		}
	}
};

// Helper: rectangle aux coins arrondis
function roundRect(ctx, x, y, w, h, r) {
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.arcTo(x + w, y, x + w, y + h, r);
	ctx.arcTo(x + w, y + h, x, y + h, r);
	ctx.arcTo(x, y + h, x, y, r);
	ctx.arcTo(x, y, x + w, y, r);
	ctx.closePath();
}

// Helper: halo lumineux radial (pour le fond)
function drawGlow(ctx, x, y, radius, color) {
	const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
	grad.addColorStop(0, color);
	grad.addColorStop(1, "rgba(0,0,0,0)");
	ctx.fillStyle = grad;
	ctx.beginPath();
	ctx.arc(x, y, radius, 0, Math.PI * 2);
	ctx.fill();
}

// Helper: petite icône vectorielle (globe ou bulle de chat) dans un cercle,
// suivie du label et de la valeur du prefix. Dessin manuel = pas de dépendance
// à une police emoji sur le serveur.
function drawIconPill(ctx, x, y, icon, label, value) {
	const r = 26;
	const cx = x + r;
	const cy = y + r;

	// Cercle de fond de l'icône
	const grad = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
	grad.addColorStop(0, "#ff6ec4");
	grad.addColorStop(1, "#7873f5");
	ctx.beginPath();
	ctx.arc(cx, cy, r, 0, Math.PI * 2);
	ctx.fillStyle = grad;
	ctx.fill();

	ctx.strokeStyle = "#ffffff";
	ctx.lineWidth = 2.2;
	ctx.lineCap = "round";
	ctx.lineJoin = "round";

	if (icon === "globe") {
		// Cercle + méridien + parallèle = globe
		ctx.beginPath();
		ctx.arc(cx, cy, 13, 0, Math.PI * 2);
		ctx.stroke();
		ctx.beginPath();
		ctx.ellipse(cx, cy, 6, 13, 0, 0, Math.PI * 2);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(cx - 13, cy);
		ctx.lineTo(cx + 13, cy);
		ctx.stroke();
	} else if (icon === "chat") {
		// Bulle de conversation
		ctx.beginPath();
		roundRect(ctx, cx - 13, cy - 10, 26, 18, 6);
		ctx.stroke();
		ctx.beginPath();
		ctx.moveTo(cx - 5, cy + 8);
		ctx.lineTo(cx - 9, cy + 15);
		ctx.lineTo(cx - 1, cy + 8);
		ctx.closePath();
		ctx.fillStyle = "#ffffff";
		ctx.fill();
	}

	// Texte
	const textX = x + r * 2 + 18;
	ctx.textBaseline = "top";
	ctx.font = "15px Sans";
	ctx.fillStyle = "rgba(255,255,255,0.55)";
	ctx.fillText(label, textX, cy - r + 2);

	ctx.font = "bold 26px Sans";
	ctx.fillStyle = "#ffffff";
	ctx.fillText(value, textX, cy - r + 20);
		}
