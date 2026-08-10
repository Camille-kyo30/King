const fs = require("fs-extra");
const path = require("path");
const { createCanvas } = require("canvas");
const { config } = global.GoatBot;
const { client } = global;

// ==================== CANVAS HELPERS ====================

function drawRoundedRect(ctx, x, y, w, h, r) {
	ctx.beginPath();
	ctx.moveTo(x + r, y);
	ctx.arcTo(x + w, y, x + w, y + h, r);
	ctx.arcTo(x + w, y + h, x, y + h, r);
	ctx.arcTo(x, y + h, x, y, r);
	ctx.arcTo(x, y, x + w, y, r);
	ctx.closePath();
}

function buildToggleCard({ title, subtitle, icon, isOn, footer }) {
	const width = 900;
	const height = 480;
	const canvas = createCanvas(width, height);
	const ctx = canvas.getContext("2d");

	// Fond dégradé tech sombre
	const bg = ctx.createLinearGradient(0, 0, width, height);
	bg.addColorStop(0, "#0f0c29");
	bg.addColorStop(0.5, "#24243e");
	bg.addColorStop(1, "#0f0c29");
	ctx.fillStyle = bg;
	ctx.fillRect(0, 0, width, height);

	// Grille tech en arrière-plan
	ctx.save();
	ctx.strokeStyle = "rgba(255,255,255,0.05)";
	ctx.lineWidth = 1;
	for (let gx = 0; gx < width; gx += 40) {
		ctx.beginPath();
		ctx.moveTo(gx, 0);
		ctx.lineTo(gx, height);
		ctx.stroke();
	}
	for (let gy = 0; gy < height; gy += 40) {
		ctx.beginPath();
		ctx.moveTo(0, gy);
		ctx.lineTo(width, gy);
		ctx.stroke();
	}
	ctx.restore();

	// Halo central coloré selon l'état
	const accent = isOn ? "#39ff88" : "#ff4d6d";
	const halo = ctx.createRadialGradient(width / 2, 150, 20, width / 2, 150, 260);
	halo.addColorStop(0, isOn ? "rgba(57,255,136,0.25)" : "rgba(255,77,109,0.25)");
	halo.addColorStop(1, "rgba(0,0,0,0)");
	ctx.fillStyle = halo;
	ctx.fillRect(0, 0, width, 320);

	// Icône (cadenas)
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.font = "90px Arial";
	ctx.shadowColor = accent;
	ctx.shadowBlur = 30;
	ctx.fillText(icon, width / 2, 130);
	ctx.shadowBlur = 0;

	// Titre
	ctx.font = "bold 38px Arial";
	ctx.fillStyle = "#ffffff";
	ctx.shadowColor = "rgba(0,0,0,0.5)";
	ctx.shadowBlur = 6;
	ctx.fillText(title, width / 2, 210);
	ctx.shadowBlur = 0;

	// Sous-titre
	ctx.font = "20px Arial";
	ctx.fillStyle = "rgba(255,255,255,0.6)";
	ctx.fillText(subtitle, width / 2, 248);

	// Ligne séparatrice
	const lineGrad = ctx.createLinearGradient(width / 2 - 200, 0, width / 2 + 200, 0);
	lineGrad.addColorStop(0, "rgba(255,255,255,0)");
	lineGrad.addColorStop(0.5, "rgba(255,255,255,0.4)");
	lineGrad.addColorStop(1, "rgba(255,255,255,0)");
	ctx.fillStyle = lineGrad;
	ctx.fillRect(width / 2 - 200, 280, 400, 2);

	// ===== Toggle switch =====
	const switchW = 220;
	const switchH = 90;
	const switchX = width / 2 - switchW / 2;
	const switchY = 320;
	const radius = switchH / 2;

	ctx.save();
	ctx.shadowColor = accent;
	ctx.shadowBlur = 25;
	const trackGrad = ctx.createLinearGradient(switchX, 0, switchX + switchW, 0);
	if (isOn) {
		trackGrad.addColorStop(0, "#0f5132");
		trackGrad.addColorStop(1, "#39ff88");
	} else {
		trackGrad.addColorStop(0, "#5c1a1a");
		trackGrad.addColorStop(1, "#ff4d6d");
	}
	ctx.fillStyle = trackGrad;
	drawRoundedRect(ctx, switchX, switchY, switchW, switchH, radius);
	ctx.fill();
	ctx.restore();

	// Contour
	ctx.lineWidth = 3;
	ctx.strokeStyle = "rgba(255,255,255,0.5)";
	drawRoundedRect(ctx, switchX, switchY, switchW, switchH, radius);
	ctx.stroke();

	// Bouton (knob)
	const knobSize = switchH - 14;
	const knobY = switchY + 7;
	const knobX = isOn
		? switchX + switchW - knobSize - 7
		: switchX + 7;

	ctx.save();
	ctx.shadowColor = "rgba(0,0,0,0.5)";
	ctx.shadowBlur = 10;
	ctx.fillStyle = "#ffffff";
	ctx.beginPath();
	ctx.arc(knobX + knobSize / 2, knobY + knobSize / 2, knobSize / 2, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();

	ctx.font = "bold 30px Arial";
	ctx.fillStyle = isOn ? "#0f5132" : "#5c1a1a";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText(isOn ? "ON" : "OFF", knobX + knobSize / 2, knobY + knobSize / 2 + 2);

	// Statut texte
	ctx.font = "bold 26px Arial";
	ctx.fillStyle = accent;
	ctx.shadowColor = accent;
	ctx.shadowBlur = 15;
	ctx.fillText(isOn ? "● ACTIVÉ" : "● DÉSACTIVÉ", width / 2, switchY + switchH + 55);
	ctx.shadowBlur = 0;

	// Footer
	ctx.font = "16px Arial";
	ctx.fillStyle = "rgba(255,255,255,0.4)";
	ctx.fillText(footer, width / 2, height - 30);

	return canvas;
}

function sendToggleCard(message, canvas, prefix) {
	const cacheDir = path.join(__dirname, "cache");
	fs.ensureDirSync(cacheDir);
	const filePath = path.join(cacheDir, `${prefix}_${Date.now()}.png`);
	fs.writeFileSync(filePath, canvas.toBuffer("image/png"));
	return message.reply(
		{ attachment: fs.createReadStream(filePath) },
		() => {
			try { fs.unlinkSync(filePath); } catch {}
		}
	);
}

// ==================== COMMANDE ====================

module.exports = {
	config: {
		name: "adminonly",
		aliases: ["adonly", "onlyad", "onlyadmin"],
		version: "2.0",
		author: "NTKhang",
		editor: "Camille Uchiha 🍓",
		countDown: 5,
		role: 2,
		description: {
			vi: "bật/tắt chế độ chỉ admin mới có thể sử dụng bot",
			en: "turn on/off only admin can use bot",
			fr: "Activer/désactiver le mode où seuls les admins peuvent utiliser le bot"
		},
		category: "owner",
		guide: {
			vi: "   {pn} [on | off]: bật/tắt chế độ chỉ admin mới có thể sử dụng bot"
				+ "\n   {pn} noti [on | off]: bật/tắt thông báo khi người dùng không phải là admin sử dụng bot",
			en: "   {pn} [on | off]: turn on/off the mode only admin can use bot"
				+ "\n   {pn} noti [on | off]: turn on/off the notification when user is not admin use bot",
			fr: "   {pn} [on | off]: activer/désactiver le mode admin uniquement"
				+ "\n   {pn} noti [on | off]: activer/désactiver la notification quand un non-admin utilise le bot"
		}
	},
	langs: {
		vi: {
			turnedOn: "Đã bật chế độ chỉ admin mới có thể sử dụng bot",
			turnedOff: "Đã tắt chế độ chỉ admin mới có thể sử dụng bot",
			turnedOnNoti: "Đã bật thông báo khi người dùng không phải là admin sử dụng bot",
			turnedOffNoti: "Đã tắt thông báo khi người dùng không phải là admin sử dụng bot"
		},
		en: {
			turnedOn: "Turned on the mode only admin can use bot",
			turnedOff: "Turned off the mode only admin can use bot",
			turnedOnNoti: "Turned on the notification when user is not admin use bot",
			turnedOffNoti: "Turned off the notification when user is not admin use bot"
		},
		fr: {
			turnedOn: "Mode admin uniquement activé",
			turnedOff: "Mode admin uniquement désactivé",
			turnedOnNoti: "Notification (non-admin) activée",
			turnedOffNoti: "Notification (non-admin) désactivée"
		}
	},
	onStart: function ({ args, message, getLang }) {
		let isSetNoti = false;
		let value;
		let indexGetVal = 0;
		if (args[0] == "noti") {
			isSetNoti = true;
			indexGetVal = 1;
		}
		if (args[indexGetVal] == "on")
			value = true;
		else if (args[indexGetVal] == "off")
			value = false;
		else
			return message.SyntaxError();

		let canvas;
		if (isSetNoti) {
			config.hideNotiMessage.adminOnly = !value;
			canvas = buildToggleCard({
				title: "NOTIFICATION ADMIN ONLY",
				subtitle: getLang(value ? "turnedOnNoti" : "turnedOffNoti"),
				icon: value ? "🔔" : "🔕",
				isOn: value,
				footer: "Système Owner • Camille Uchiha 🍓"
			});
		}
		else {
			config.adminOnly.enable = value;
			canvas = buildToggleCard({
				title: "MODE ADMIN ONLY",
				subtitle: getLang(value ? "turnedOn" : "turnedOff"),
				icon: value ? "🔒" : "🔓",
				isOn: value,
				footer: "Système Owner • Camille Uchiha 🍓"
			});
		}

		fs.writeFileSync(client.dirConfig, JSON.stringify(config, null, 2));
		return sendToggleCard(message, canvas, isSetNoti ? "adminonly_noti" : "adminonly");
	}
};
