const axios = require("axios");

const HEAD = (t) => `╔═〘 ⚡ ʙʟᴜᴇ ʟᴏᴄᴋ • ${t} 〙═╗`;
const FOOT = "╚══〘 ɴᴀɢɪ × ʙᴀᴄʜɪʀᴀ 〙══╝";
const L = (s = "") => `║ ${s}`;

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function clean(txt = "") {
	return String(txt).replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

// Sépare "artiste - titre" ou "artiste | titre"
function splitQuery(query) {
	const parts = query.split(/\s*[-–|]\s*/);
	if (parts.length < 2) return null;
	const artist = parts[0].trim();
	const title = parts.slice(1).join(" ").trim();
	if (!artist || !title) return null;
	return { artist, title };
}

// 1) Lyrist : recherche libre "titre artiste"
async function lyrist(query) {
	const { data } = await axios.get(`https://lyrist.vercel.app/api/${encodeURIComponent(query)}`, {
		timeout: 25000,
		headers: { "User-Agent": UA, Accept: "application/json" }
	});
	if (!data?.lyrics) return null;
	return {
		title: data.title || query,
		artist: data.artist || "N/A",
		lyrics: clean(data.lyrics),
		image: data.image || null
	};
}

// 2) lyrics.ovh : nécessite artiste + titre séparés
async function lyricsOvh(artist, title) {
	const { data } = await axios.get(
		`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`,
		{ timeout: 25000, headers: { "User-Agent": UA, Accept: "application/json" } }
	);
	if (!data?.lyrics) return null;
	return { title, artist, lyrics: clean(data.lyrics), image: null };
}

// 3) lrclib.net : paroles synchronisées par artiste + titre
async function lrclib(artist, title) {
	const { data } = await axios.get(`https://lrclib.net/api/get`, {
		params: { artist_name: artist, track_name: title },
		timeout: 25000,
		headers: { "User-Agent": UA, Accept: "application/json" }
	});
	if (!data?.plainLyrics) return null;
	return { title, artist, lyrics: clean(data.plainLyrics), image: null };
}

// Pochette d'album via iTunes (fallback quand la source n'en fournit pas)
async function fetchCover(artist, title) {
	try {
		const term = [artist, title].filter(Boolean).join(" ");
		const { data } = await axios.get("https://itunes.apple.com/search", {
			params: { term, media: "music", limit: 1 },
			timeout: 20000,
			headers: { "User-Agent": UA, Accept: "application/json" }
		});
		const art = data?.results?.[0]?.artworkUrl100;
		if (!art) return null;
		return art.replace(/\/\d+x\d+bb\.jpg$/, "/600x600bb.jpg");
	} catch {
		return null;
	}
}


async function fetchLyrics(query) {
	const split = splitQuery(query);

	// Si on a "artiste - titre", on privilégie les sources par artiste+titre
	if (split) {
		const { artist, title } = split;
		const sources = [
			() => lrclib(artist, title),
			() => lyricsOvh(artist, title),
			() => lyrist(`${title} ${artist}`)
		];
		for (const src of sources) {
			for (let i = 0; i < 2; i++) {
				try {
					const res = await src();
					if (res?.lyrics) return res;
					break;
				} catch {
					await sleep(1200);
				}
			}
		}
		throw new Error(`Paroles introuvables pour « ${artist} - ${title} ».`);
	}

	// Recherche libre (titre seul)
	for (let i = 0; i < 2; i++) {
		try {
			const res = await lyrist(query);
			if (res?.lyrics) return res;
			break;
		} catch {
			await sleep(1200);
		}
	}
	throw new Error("Paroles introuvables. Essaie « lyrics artiste - titre ».");
}

module.exports = {
	config: {
		name: "lyrics",
		aliases: ["lyric", "paroles"],
		version: "1.1",
		author: "Camille Uchiha",
		countDown: 5,
		role: 0,
		shortDescription: { fr: "Paroles d'une chanson" },
		longDescription: {
			fr: "Cherche les paroles d'une musique.\nRecherche par titre seul OU par artiste + titre."
		},
		category: "media",
		guide: {
			fr:
				"{pn} <titre>\n" +
				"Ex: {pn} blue lock opening\n\n" +
				"{pn} <artiste> - <titre>\n" +
				"Ex: {pn} Eminem - Lose Yourself\n" +
				"Ex: {pn} Yoasobi - Idol"
		}
	},

	onStart: async function ({ message, args }) {
		const query = args.join(" ").trim();
		if (!query)
			return message.reply(
				"🔵 | Donne-moi un titre.\nEx: lyrics Eminem - Lose Yourself\nEx: lyrics blue lock opening"
			);

		const waiting = await message.reply("⏳ | Recherche des paroles...");

		try {
			const song = await fetchLyrics(query);

			const MAX = 1800;
			const lyrics = song.lyrics.length > MAX
				? song.lyrics.slice(0, MAX) + "\n... (paroles tronquées)"
				: song.lyrics;

			const body =
`${HEAD("ʟʏʀɪᴄs")}
${L(`🎵 ${song.title}`)}
${L(`🎤 ${song.artist}`)}
${L("─────────────────")}
${FOOT}

${lyrics}`;

			message.unsend(waiting.messageID);

			// 1) Les paroles d'abord
			await message.reply(body);

			// 2) Puis la pochette d'album à la fin
			const cover = song.image || await fetchCover(song.artist, song.title);
			if (cover) {
				try {
					const { data: stream } = await axios.get(cover, {
						responseType: "stream",
						timeout: 25000,
						headers: { "User-Agent": UA }
					});
					return message.reply({
						body: `${HEAD("ᴀʟʙᴜᴍ")}\n${L(`🖼️ ${song.title}`)}\n${L(`🎤 ${song.artist}`)}\n${FOOT}`,
						attachment: stream
					});
				} catch {}
			}
			return;

		} catch (e) {
			message.unsend(waiting.messageID);
			return message.reply("⚠️ | " + e.message);
		}
	}
};
