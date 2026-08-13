const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

const BACHIRA_IMAGES = [
	"https://i.ibb.co/CpkVTMvq/598398792-1884646622260632-4933007088450330477-n-jpg-stp-dst-jpg-s480x480-tt6-nc-cat-111-ccb-1-7-n.jpg",
	"https://i.ibb.co/qLxkKcpN/487428682-1025219792811548-3550462159879454371-n-jpg-nc-cat-102-ccb-1-7-nc-sid-9f807c-nc-eui2-Ae-H.jpg"
];

const BACHIRA_LINES = [
	"⚽ « T'as pas les yeux pour ça... cette commande, c'est réservé à ceux qui dévorent leurs adversaires. Reviens quand tu seras un monstre comme moi. »",
	"⚽ « Ego, égo, égo... tu crois vraiment avoir le niveau pour toucher cette commande ? Nan, connard, t'es hors-jeu ici. »",
	"⚽ « Cette commande est mon terrain de chasse, pas le tien. Seuls les affamés y ont accès. »"
];

async function getStreamFromURL(url, name) {
	const tempPath = path.join(__dirname, "cache", name);
	await fs.ensureDir(path.join(__dirname, "cache"));
	const response = await axios.get(url, { responseType: "arraybuffer" });
	await fs.writeFile(tempPath, response.data);
	return tempPath;
}

module.exports = {
	config: {
		name: "file",
		aliases: [],
		version: "1.3",
		author: "NeoKEX",
		countDown: 5,
		role: 0, // on gère le check nous-mêmes pour custom message
		description: {
			vi: "Xem mã nguồn của một lệnh cụ thể",
			en: "View the source code of a specific command"
		},
		category: "system",
		guide: {
			vi: "   {pn} <tên lệnh>: xem mã nguồn của lệnh",
			en: "   {pn} <command name>: view source code of the command"
		}
	},

	onStart: async function ({ args, message, event, role }) {
		// 🔒 Check du rôle (4 = admin bot uniquement) — style Meguru Bachira
		if (role < 2) {
			let tempFile;
			try {
				const randomIndex = Math.floor(Math.random() * BACHIRA_IMAGES.length);
				tempFile = await getStreamFromURL(BACHIRA_IMAGES[randomIndex], `bachira_${event.senderID}.jpg`);

				const randomLine = BACHIRA_LINES[Math.floor(Math.random() * BACHIRA_LINES.length)];

				await message.reply({
					body: `🚫 ACCÈS REFUSÉ\n\n${randomLine}\n\nCette commande est réservée aux administrateurs du bot.`,
					attachment: fs.createReadStream(tempFile)
				});
			} catch (err) {
				await message.reply(`🚫 Accès refusé. (Erreur image: ${err.message})`);
			} finally {
				if (tempFile) fs.unlink(tempFile, () => {});
			}
			return;
		}

		if (!args.length) {
			return message.SyntaxError();
		}

		const commandName = args[0].toLowerCase();
		const allCommands = global.GoatBot.commands;

		let command = allCommands.get(commandName);
		if (!command) {
			const cmd = [...allCommands.values()].find((c) =>
				(c.config.aliases || []).includes(commandName)
			);
			command = cmd;
		}

		if (!command) {
			return message.reply("❌ Command not found");
		}

		const actualCommandName = command.config.name;

		if (!/^[a-zA-Z0-9_-]+$/.test(actualCommandName)) {
			return message.reply("❌ Invalid command name");
		}

		const allowedDir = path.resolve(__dirname);
		const filePath = path.resolve(__dirname, `${actualCommandName}.js`);

		if (!filePath.startsWith(allowedDir)) {
			return message.reply("❌ Access denied: Path traversal detected");
		}

		try {
			if (!fs.existsSync(filePath)) {
				return message.reply("❌ File not found");
			}

			const content = fs.readFileSync(filePath, "utf-8");

			if (content.length > 4000) {
				return message.reply(`${content.substring(0, 3997)}...`);
			}

			return message.reply(`${content}`);

		} catch (err) {
			return message.reply(`❌ Error: ${err.message}`);
		}
	}
};
