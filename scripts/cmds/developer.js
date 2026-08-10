const { config } = global.GoatBot;
const { writeFileSync, ensureDirSync, createReadStream, unlinkSync } = require("fs-extra");
const { createCanvas, loadImage } = require("canvas");
const path = require("path");

// ==================== CANVAS HELPERS ====================

function getAvatarUrl(uid) {
	return `https://graph.facebook.com/${uid}/picture?width=200&height=200&access_token=6628568379|c1e620fa708a1d5696fb991c1bde5662`;
}

function drawRoundedRect(ctx, x, y, w, h, r) {
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.arcTo(x + w, y, x + w, y + h, r);
	ctx.arcTo(x + w, y + h, x, y + h, r);
	ctx.arcTo(x, y + h, x, y, r);
	ctx.arcTo(x, y, x + w, y, r);
	ctx.closePath();
}

async function drawCircleAvatar(ctx, uid, x, y, size) {
	try {
		const img = await loadImage(getAvatarUrl(uid));
		ctx.save();
		ctx.beginPath();
		ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
		ctx.closePath();
		ctx.clip();
		ctx.drawImage(img, x, y, size, size);
		ctx.restore();
	} catch {
		ctx.save();
		ctx.beginPath();
		ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
		ctx.fillStyle = "#ffb3c6";
		ctx.fill();
		ctx.fillStyle = "#7a0033";
		ctx.font = `bold ${Math.round(size * 0.4)}px Arial`;
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("?", x + size / 2, y + size / 2 + 2);
		ctx.restore();
	}
	ctx.save();
	ctx.lineWidth = 4;
	ctx.strokeStyle = "#ffffff";
	ctx.beginPath();
	ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
	ctx.stroke();
	ctx.restore();
}

async function buildDevCard({ headerTitle, headerIcon, entries, footer }) {
	const width = 900;
	const rowHeight = 100;
	const headerHeight = 170;
	const footerHeight = 60;
	const height = headerHeight + Math.max(entries.length, 1) * rowHeight + footerHeight;

	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext("2d");

	// Fond dégradé façon fraise
	const bg = ctx.createLinearGradient(0, 0, width, height);
	bg.addColorStop(0, "#ff5da2");
	bg.addColorStop(0.5, "#c9184a");
	bg.addColorStop(1, "#480032");
	ctx.fillStyle = bg;
	ctx.fillRect(0, 0, width, height);

	// Pépins décoratifs (petits points façon fraise)
	ctx.save();
	ctx.globalAlpha = 0.12;
	for (let i = 0; i < 70; i++) {
		const px = Math.random() * width;
		const py = Math.random() * height;
		ctx.fillStyle = "#ffffff";
		ctx.beginPath();
		ctx.ellipse(px, py, 3, 5, Math.random() * Math.PI, 0, Math.PI * 2);
		ctx.fill();
	}
	ctx.restore();

	// Bandeau header
	const headerGrad = ctx.createLinearGradient(0, 0, width, 0);
	headerGrad.addColorStop(0, "rgba(0,0,0,0.4)");
	headerGrad.addColorStop(1, "rgba(0,0,0,0.1)");
	ctx.fillStyle = headerGrad;
	ctx.fillRect(0, 0, width, headerHeight);

	ctx.textBaseline = "middle";
	ctx.font = "64px Arial";
	ctx.textAlign = "left";
	ctx.fillText(headerIcon, 40, headerHeight / 2 - 10);

	ctx.font = "bold 42px Arial";
	ctx.fillStyle = "#ffffff";
	ctx.shadowColor = "rgba(0,0,0,0.45)";
	ctx.shadowBlur = 10;
	ctx.fillText(headerTitle, 130, headerHeight / 2 - 22);
	ctx.shadowBlur = 0;

	ctx.font = "22px Arial";
	ctx.fillStyle = "rgba(255,255,255,0.85)";
	ctx.fillText(`${entries.length} utilisateur(s)`, 130, headerHeight / 2 + 22);

	// Ligne dorée sous le header
	const lineGrad = ctx.createLinearGradient(0, 0, width, 0);
	lineGrad.addColorStop(0, "#ffd76a");
	lineGrad.addColorStop(1, "#ff5da2");
	ctx.fillStyle = lineGrad;
	ctx.fillRect(0, headerHeight - 4, width, 4);

	// Lignes utilisateurs
	let y = headerHeight + 15;
	if (entries.length === 0) {
		ctx.font = "italic 26px Arial";
		ctx.fillStyle = "rgba(255,255,255,0.8)";
		ctx.textAlign = "center";
		ctx.fillText("Aucun utilisateur à afficher", width / 2, y + 40);
	}
	for (const entry of entries) {
		const rowY = y;
		const rowMargin = 30;
		const rowW = width - rowMargin * 2;
		const rowH = rowHeight - 20;

		ctx.save();
		ctx.fillStyle = "rgba(255,255,255,0.1)";
		drawRoundedRect(ctx, rowMargin, rowY, rowW, rowH, 18);
		ctx.fill();
		ctx.restore();

		await drawCircleAvatar(ctx, entry.uid, rowMargin + 15, rowY + (rowH - 60) / 2, 60);

		ctx.textAlign = "left";
		ctx.font = "bold 26px Arial";
		ctx.fillStyle = "#ffffff";
		ctx.fillText(entry.name, rowMargin + 95, rowY + rowH / 2 - 12);

		ctx.font = "18px Arial";
		ctx.fillStyle = "rgba(255,255,255,0.7)";
		ctx.fillText(entry.uid, rowMargin + 95, rowY + rowH / 2 + 16);

		ctx.font = "bold 20px Arial";
		ctx.textAlign = "right";
		ctx.fillStyle = entry.color || "#ffd76a";
		ctx.fillText(entry.status, rowMargin + rowW - 20, rowY + rowH / 2 + 7);

		y += rowHeight;
	}

	// Footer
	ctx.textAlign = "center";
	ctx.font = "18px Arial";
	ctx.fillStyle = "rgba(255,255,255,0.6)";
	ctx.fillText(footer, width / 2, height - footerHeight / 2);

	return canvas;
}

async function sendCard(message, canvas, prefix) {
	const cacheDir = path.join(__dirname, "cache");
	ensureDirSync(cacheDir);
	const filePath = path.join(cacheDir, `${prefix}_${Date.now()}.png`);
	writeFileSync(filePath, canvas.toBuffer("image/png"));
	return message.reply(
		{ attachment: createReadStream(filePath) },
		() => {
			try { unlinkSync(filePath); } catch {}
		}
	);
}

// ==================== COMMANDE ====================

module.exports = {
	config: {
		name: "developer",
		aliases: ["dev"],
		version: "2.0",
		author: "NeoKEX",
		editor: "Camille Uchiha 🍓",
		countDown: 5,
		role: 4,
		description: {
			vi: "Thêm, xóa, sửa quyền developer",
			en: "Add, remove, edit developer role",
			fr: "Ajouter, supprimer, modifier le rôle développeur"
		},
		category: "owner",
		guide: {
			vi: ' {pn} [add | -a] <uid | @tag>: Thêm quyền developer cho người dùng'
				+ '\n {pn} [remove | -r] <uid | @tag>: Xóa quyền developer của người dùng'
				+ '\n {pn} [list | -l]: Liệt kê danh sách developers',
			en: ' {pn} [add | -a] <uid | @tag>: Add developer role for user'
				+ '\n {pn} [remove | -r] <uid | @tag>: Remove developer role of user'
				+ '\n {pn} [list | -l]: List all developers',
			fr: ' {pn} [add | -a] <uid | @tag>: Ajouter le rôle développeur'
				+ '\n {pn} [remove | -r] <uid | @tag>: Retirer le rôle développeur'
				+ '\n {pn} [list | -l]: Lister tous les développeurs'
		}
	},

	langs: {
		vi: {
			missingIdAdd: "⚠ | Vui lòng nhập ID hoặc tag người dùng muốn thêm quyền developer",
			missingIdRemove: "⚠ | Vui lòng nhập ID hoặc tag người dùng muốn xóa quyền developer"
		},
		en: {
			missingIdAdd: "⚠ | Please enter ID or tag user to add developer role",
			missingIdRemove: "⚠ | Please enter ID or tag user to remove developer role"
		},
		fr: {
			missingIdAdd: `🍓━━━━━━━━🍓\n⚠️ 𝗘𝗥𝗥𝗘𝗨𝗥\nVeuillez taguer ou entrer l'ID de l'utilisateur à ajouter\n🍓━━━━━━━━🍓`,
			missingIdRemove: `🍓━━━━━━━━🍓\n⚠️ 𝗘𝗥𝗥𝗘𝗨𝗥\n\nVeuillez taguer ou entrer l'ID de l'utilisateur à retirer\n🍓━━━━━━━━🍓`
		}
	},

	onStart: async function ({ message, args, usersData, event, getLang }) {
		if (!config.devUsers)
			config.devUsers = [];

		switch (args[0]) {
			case "add":
			case "-a": {
				if (!args[1])
					return message.reply(getLang("missingIdAdd"));

				let uids = [];
				if (Object.keys(event.mentions).length > 0)
					uids = Object.keys(event.mentions);
				else if (event.messageReply)
					uids.push(event.messageReply.senderID);
				else
					uids = args.filter(arg => !isNaN(arg));

				const notDevIds = [];
				const devIds = [];
				for (const uid of uids) {
					if (config.devUsers.includes(uid))
						devIds.push(uid);
					else
						notDevIds.push(uid);
				}
				config.devUsers.push(...notDevIds);
				writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));

				const getNames = await Promise.all(uids.map(uid => usersData.getName(uid).then(name => ({ uid, name })).catch(() => ({ uid, name: "Inconnu" }))));
				const entries = getNames.map(({ uid, name }) => {
					const wasAlready = devIds.includes(uid);
					return {
						uid, name,
						status: wasAlready ? "⚠️ Déjà Dev" : "✅ Ajouté",
						color: wasAlready ? "#ffd76a" : "#7CFC9A"
					};
				});

				const canvas = await buildDevCard({
					headerTitle: "AJOUT DÉVELOPPEUR",
					headerIcon: "🍓",
					entries,
					footer: "Système Developer • Camille Uchiha 🍓"
				});
				return sendCard(message, canvas, "dev_add");
			}
			case "remove":
			case "-r": {
				if (!args[1])
					return message.reply(getLang("missingIdRemove"));

				let uids = [];
				if (Object.keys(event.mentions).length > 0)
					uids = Object.keys(event.mentions);
				else
					uids = args.filter(arg => !isNaN(arg));

				const notDevIds = [];
				const devIds = [];
				for (const uid of uids) {
					if (config.devUsers.includes(uid))
						devIds.push(uid);
					else
						notDevIds.push(uid);
				}
				for (const uid of devIds)
					config.devUsers.splice(config.devUsers.indexOf(uid), 1);
				writeFileSync(global.client.dirConfig, JSON.stringify(config, null, 2));

				const getNames = await Promise.all(uids.map(uid => usersData.getName(uid).then(name => ({ uid, name })).catch(() => ({ uid, name: "Inconnu" }))));
				const entries = getNames.map(({ uid, name }) => {
					const wasDev = devIds.includes(uid);
					return {
						uid, name,
						status: wasDev ? "✅ Retiré" : "⚠️ Non Dev",
						color: wasDev ? "#7CFC9A" : "#ffd76a"
					};
				});

				const canvas = await buildDevCard({
					headerTitle: "SUPPRESSION DÉVELOPPEUR",
					headerIcon: "🍓",
					entries,
					footer: "Système Developer • Camille Uchiha 🍓"
				});
				return sendCard(message, canvas, "dev_remove");
			}
			case "list":
			case "-l": {
				const getNames = await Promise.all(config.devUsers.map(uid => usersData.getName(uid).then(name => ({ uid, name })).catch(() => ({ uid, name: "Inconnu" }))));
				const entries = getNames.map(({ uid, name }) => ({
					uid, name,
					status: "⚙️ Dev",
					color: "#ffd76a"
				}));

				const canvas = await buildDevCard({
					headerTitle: "LISTE DES DÉVELOPPEURS",
					headerIcon: "🍓",
					entries,
					footer: "Système Developer • Camille Uchiha 🍓"
				});
				return sendCard(message, canvas, "dev_list");
			}
			default:
				return message.SyntaxError();
		}
	}
};
