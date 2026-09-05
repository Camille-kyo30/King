const axios = require("axios");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { getBalance, addBalance, hasEnoughMoney } = require("../../func/asciiGameLoop.js");

const API_BASE = "https://magiclight-api-gamma.vercel.app";
const API_KEY = process.env.MAGICLIGHT_API_KEY;

const COST = "150";
const POLL_MS = 8000;
const MAX_MS = 5 * 60000;

const jobs = new Map();

function isPublicImageUrl(value) {
	try {
		const url = new URL(String(value));
		if (!/^https?:$/.test(url.protocol)) return false;
		const host = url.hostname.toLowerCase();
		if (host === "localhost" || host === "::1" || host.startsWith("127.") || host.startsWith("10.") || host.startsWith("192.168.") || host.startsWith("169.254.")) return false;
		const p172 = host.match(/^172\.(\d+)\./);
		if (p172 && Number(p172[1]) >= 16 && Number(p172[1]) <= 31) return false;
		if (/^f[cd][0-9a-f]{2}:/i.test(host) || host === "::ffff:127.0.0.1") return false;
		return true;
	}
	catch (e) { return false; }
}

function extractImage(event) {
	const fromReply = (event.messageReply?.attachments || []).find((a) => a && /photo|image/i.test(a.type || ""));
	if (fromReply?.url) return fromReply.url;
	const direct = (event.attachments || []).find((a) => a && /photo|image/i.test(a.type || ""));
	if (direct?.url) return direct.url;
	return "";
}

function parseInput(args) {
	let duration = 10;
	let imageUrl = "";
	const parts = [];
	for (let i = 0; i < args.length; i++) {
		const item = String(args[i]).trim();
		const inline = item.match(/^--du(?:ree|ration)=(\d+)$/i);
		if (inline) { duration = Number(inline[1]); continue; }
		if (/^--du(?:ree|ration)$/i.test(item) && /^\d+$/.test(args[i + 1] || "")) { duration = Number(args[i + 1]); i++; continue; }
		if (!imageUrl && isPublicImageUrl(item)) { imageUrl = item; continue; }
		parts.push(item);
	}
	const last = parts[parts.length - 1];
	if (/^\d+$/.test(last || "") && Number(last) >= 3 && Number(last) <= 10) duration = Number(parts.pop());
	return { duration: duration < 7 ? 5 : 10, imageUrl, prompt: parts.join(" ").trim() };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = {
	config: {
		name: "animate",
		aliases: ["motion", "img2video"],
		version: "3.0.0-mini",
        editor:"Camille uchiha 🎀",
		author: "Noblesse obligé",
		countDown: 45,
		role: 0,
		description: { fr: "Anime une image ou un prompt en courte vidéo MP4 (API MagicLight)" },
		category: "ai",
		guide: {
			fr: "🎀 {pn} <prompt> [5|10] — vidéo depuis un prompt\n🎀 Répondez à une photo avec {pn} <prompt> [durée]\n🎀 {pn} status — suivi de la dernière vidéo"
		}
	},
	langs: { fr: {} },

	onStart: async function ({ message, event, args, prefix, usersData, api }) {
		if (!API_KEY) return message.replyError("🎀 Clé API manquante — ajoute MAGICLIGHT_API_KEY dans les variables d'environnement Render.");

		const action = String(args[0] || "").toLowerCase();
		if (action === "status") {
			const job = jobs.get(event.senderID);
			return message.reply(job ? `🎀 ${job.status}${job.task_id ? `\n🆔 ${job.task_id}` : ""}${job.prompt ? `\n📝 ${job.prompt}` : ""}` : "Aucun traitement récent.");
		}

		const { prompt, duration, imageUrl } = parseInput(args);
		if (!prompt) return message.replyError(`Ajoutez une instruction. Ex : ${prefix}animate sourire naturel, cheveux au vent 5`);

		const money = await getBalance(usersData, event.senderID);
		if (!hasEnoughMoney(money, COST)) return message.replyWarn(`🎀 Solde insuffisant (min ${COST}$). Solde : ${money}$`);

		const after = await addBalance(usersData, event.senderID, `-${COST}`);
		const sourceImage = imageUrl || extractImage(event);
		jobs.set(event.senderID, { status: "lancement", prompt });
		const refund = async () => { try { await addBalance(usersData, event.senderID, COST); } catch (_) {} };

		try {
			await message.replyInfo(`🎀 ANIMATE // MAGICLIGHT\n💳 -${COST}$ (solde : ${after}$)\n${sourceImage ? "Animation de l'image" : "Personnage IA"} en cours (${duration}s)… 1-3 min.`);

			const create = await axios.post(`${API_BASE}/stanleystawa/video`,
				{ prompt, duration, ...(sourceImage ? { imageUrl: sourceImage } : {}) },
				{ headers: { "x-api-key": API_KEY, "Content-Type": "application/json" }, timeout: 30000 });
			const taskId = create.data?.task_id;
			if (!taskId) throw new Error("NO_TASK");
			jobs.set(event.senderID, { status: "en cours", task_id: taskId, prompt });

			const started = Date.now();
			let last = null;
			while (Date.now() - started < MAX_MS) {
				await sleep(POLL_MS);
				const st = await axios.get(`${API_BASE}/stanleystawa/status`, { params: { task_id: taskId }, timeout: 20000 });
				last = st.data || {};
				jobs.set(event.senderID, { status: `${last.status || "?"} ${last.progress || 0}%`, task_id: taskId, prompt });
				if (last.status === "completed") break;
				if (last.status === "failed") throw new Error("TASK_FAILED");
			}
			if (last?.status !== "completed") throw new Error("ANIMATE_TIMEOUT");

			const dl = await axios.get(`${API_BASE}/stanleystawa/download`,
				{ params: { task_id: taskId, key: API_KEY }, responseType: "arraybuffer", timeout: 120000 });
			const filePath = path.join(os.tmpdir(), `animate_${taskId}.mp4`);
			fs.writeFileSync(filePath, Buffer.from(dl.data));
			const { sendMedia } = require("../../func/sendMedia.js");
			jobs.set(event.senderID, { status: "terminée", task_id: taskId, prompt });
			try {
				await sendMedia(api, { threadID: event.threadID, filePath, body: "" });
				await message.reply(`🎀 Vidéo prête — ${prompt} (${duration}s)`);
			}
			catch (sendErr) {
				console.warn("[ANIMATE SEND]", sendErr.message || sendErr);
				await message.reply("✅ Vidéo générée mais Facebook a bloqué l'envoi. Réessaie ou contacte le propriétaire du bot.");
			}
			finally { try { fs.unlinkSync(filePath); } catch (_) {} }
		}
		catch (error) {
			console.error("animate:", error.response?.status || error.message);
			await refund();
			jobs.set(event.senderID, { status: "échouée (remboursée)", prompt });
			const code = String(error.message || "");
			if (code === "NO_TASK") return message.replyError("L'API n'a pas retourné de tâche. Vérifiez la clé API.");
			if (code === "TASK_FAILED") return message.replyError("❌ Génération échouée côté serveur. 150$ remboursés.");
			if (code === "ANIMATE_TIMEOUT") return message.replyError("⏱️ Pas prête après 5 min. 150$ remboursés.");
			if (error.response?.status === 402) return message.replyError("🔋 Crédits API épuisés. 150$ remboursés.");
			if (error.response?.status === 429) return message.replyWarn("🚦 Trop de demandes. Réessayez dans 1 min. 150$ remboursés.");
			return message.replyError("Génération échouée. 150$ rembours
                                      és.");
		}
	}
};
