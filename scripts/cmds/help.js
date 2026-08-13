const { commands, aliases } = global.GoatBot;
const axios = require('axios');
const fs = require("fs-extra");
const path = require("path");

// 🖼️ Photos (plus de gifs) — Nagi & Bachira vibes
const IMAGES = [
  "https://i.ibb.co/39BPBpg8/771738672-2637215926733836-1000279514700449203-n-jpg-stp-dst-jpg-s480x480-tt6-nc-cat-111-ccb-1-7-n.jpg",
  "https://i.ibb.co/3ydkw2V6/491215932-30098829383064304-4279624188519857664-n-jpg-stp-dst-jpg-s480x480-tt6-nc-cat-100-ccb-1-7.jpg",
  "https://i.ibb.co/DfLPvrYy/494358705-1964055407753237-2551923016596289973-n-jpg-stp-dst-jpg-s480x480-tt6-nc-cat-108-ccb-1-7-n.jpg",
  "https://i.imgur.com/9cRwhtd.jpeg"
];

// 💬 Phrases d'ambiance Nagi (flemmard, génie discret) & Bachira (monstre affamé, chaotique)
const NAGI_LINES = [
  "😴 Nagi : « Franchement... j'avais la flemme, mais j'ai quand même sorti le meilleur menu d'aide du game. »",
  "😴 Nagi : « Pas besoin de me forcer pour être le meilleur. Regarde cette liste, c'est déjà fini. »",
  "😴 Nagi : « Ez. Prochaine commande. »"
];

const BACHIRA_LINES = [
  "⚽ Bachira : « MIAOUUU ! Cette liste de commandes, c'est mon terrain de chasse ! Dévore-la comme moi je dévore le ballon ! »",
  "⚽ Bachira : « Ego, égo, égo... utilise ces commandes ou reste hors-jeu, connard ! »",
  "⚽ Bachira : « Chaque commande ici est une occasion de devenir un monstre. Choisis bien. »"
];

async function getRandomImage() {
  const url = IMAGES[Math.floor(Math.random() * IMAGES.length)];
  const tmpPath = path.join(__dirname, "..", "cache", `help_${Date.now()}.jpg`);
  await fs.ensureDir(path.dirname(tmpPath));
  const response = await axios.get(url, { responseType: "arraybuffer" });
  fs.writeFileSync(tmpPath, response.data);
  return fs.createReadStream(tmpPath);
}

function toCmdFont(text = "") {
  const map = {
    A:"𝖠",B:"𝖡",C:"𝖢",D:"𝖣",E:"𝖤",F:"𝖥",G:"𝖦",H:"𝖧",I:"𝖨",J:"𝖩",
    K:"𝖪",L:"𝖫",M:"𝖬",N:"𝖭",O:"𝖮",P:"𝖯",Q:"𝖰",R:"𝖱",S:"𝖲",T:"𝖳",
    U:"𝖴",V:"𝖵",W:"𝖶",X:"𝖷",Y:"𝖸",Z:"𝖹",
    a:"𝖺",b:"𝖻",c:"𝖼",d:"𝖽",e:"𝖾",f:"𝖿",g:"𝗀",h:"𝗁",i:"𝗂",j:"𝗃",
    k:"𝗄",l:"𝗅",m:"𝗆",n:"𝗇",o:"𝗈",p:"𝗉",q:"𝗊",r:"𝗋",s:"𝗌",t:"𝗍",
    u:"𝗎",v:"𝗏",w:"𝗐",x:"𝗑",y:"𝗒",z:"𝗓",
    " ":" "
  };
  return text.split("").map(c => map[c] || c).join("");
}

function toQuestionFont(text = "") {
  const map = {
    A:"𝐴",B:"𝐵",C:"𝐶",D:"𝐷",E:"𝐸",F:"𝐹",G:"𝐺",H:"𝐻",I:"𝐼",J:"𝐽",
    K:"𝐾",L:"𝐿",M:"𝑀",N:"𝑁",O:"𝑂",P:"𝑃",Q:"𝑄",R:"𝑅",S:"𝑆",T:"𝑇",
    U:"𝑈",V:"𝑉",W:"𝑊",X:"𝑋",Y:"𝑌",Z:"𝑍",
    a:"𝑎",b:"𝑏",c:"𝑐",d:"𝑑",e:"𝑒",f:"𝑓",g:"𝑔",h:"ℎ",i:"𝑖",j:"𝑗",
    k:"𝑘",l:"𝑙",m:"𝑚",n:"𝑛",o:"𝑜",p:"𝑝",q:"𝑞",r:"𝑟",s:"𝑠",t:"𝑡",
    u:"𝑢",v:"𝑣",w:"𝑤",x:"𝑥",y:"𝑦",z:"𝑧",
    " ":" "
  };
  return text.split("").map(c => map[c] || c).join("");
}

// 🖼️ Cadre stylé réutilisable
function frame(title, body) {
  return (
`╭─────═━ ${title} ━═─────╮

${body}

╰─────═━━━━━━━━━━═─────╯`
  );
}

module.exports = {
  config: {
    name: "help",
    version: "7.0",
    author: "Christus", // Pas touché
    editor: "Camille Uchiha", // Ajouté
    countDown: 2,
    role: 0,
    shortDescription: { en: "Explore all bot commands" },
    category: "info",
    guide: { en: "help <command>" },
  },

  onStart: async function ({ message, args, event, usersData }) {
    try {
      const uid = event.senderID;
      const attachment = await getRandomImage(); // Photo random Nagi/Bachira

      const nagiLine = NAGI_LINES[Math.floor(Math.random() * NAGI_LINES.length)];
      const bachiraLine = BACHIRA_LINES[Math.floor(Math.random() * BACHIRA_LINES.length)];

      let avatarStream;
      try {
        const avatarUrl = await usersData.getAvatarUrl(uid);
        avatarStream = await global.utils.getStreamFromURL(avatarUrl);
      } catch {
        avatarStream = await global.utils.getStreamFromURL(
          `https://graph.facebook.com/${uid}/picture?width=720&height=720`
        );
      }

      if (!args || args.length === 0) {
        const categories = {};
        for (const [name, command] of commands) {
          const category = command.config.category || "Misc";
          if (!categories[category]) categories[category] = [];
          categories[category].push(name);
        }

        let listBody = "";
        for (const [category, cmds] of Object.entries(categories)) {
          listBody += `\n『 ${toCmdFont(category)} 』\n`;
          listBody += cmds.map(c => `  ⚡ ${toCmdFont(c)}`).join("\n") + "\n";
        }

        listBody += `\n${nagiLine}`;
        listBody += `\n${bachiraLine}`;
        listBody += `\n\n📌 Comment utiliser cette commande :`;
        listBody += `\n😴 Nagi : « Tape juste help + nom de la commande, pas besoin de te fatiguer plus que ça. »`;
        listBody += `\n⚽ Bachira : « Genre : help ping ! Vas-y fonce, dévore l'info comme un monstre affamé ! »`;

        listBody += `\n\n🔢 Total : ${commands.size} commandes`;
        listBody += `\n📄 Page 1/${Math.ceil(commands.size / 20)}`;

        const body = frame("📚 GOAT BOT ✦ MENU", listBody.trim());

        return message.reply({
          body,
          attachment
        });
      }

      const commandName = args[0].toLowerCase();
      const command = commands.get(commandName) || commands.get(aliases.get(commandName));

      if (!command) {
        const body = frame(
          "❌ INTROUVABLE",
          `Commande "${toQuestionFont(commandName)}" introuvable.\n\n${bachiraLine}\n😴 Nagi : « Vérifie l'orthographe... la flemme de chercher pour toi. »`
        );

        return message.reply({
          body,
          attachment
        });
      }

      const cfg = command.config;
      const infoBody =
`📝 Description : ${cfg.longDescription?.en || cfg.shortDescription?.en || "No description"}
📁 Catégorie : ${cfg.category || "Misc"}
🔖 Alias : ${Array.isArray(cfg.aliases) ? cfg.aliases.join(", ") : "None"}
👑 Auteur : ${cfg.author}
✏️ Éditeur : ${cfg.editor || "None"}
🔢 Version : ${cfg.version}
⏰ Cooldown : ${cfg.countDown}s
👤 Rôle : ${cfg.role}
📖 Guide : ${cfg.guide?.en || "No guide"}

📌 Comment l'utiliser :
😴 Nagi : « Suis juste le guide au-dessus, pas la peine de réfléchir plus loin. »
⚽ Bachira : « Lance cette commande et deviens un monstre dans ce domaine, MIAOUUU ! »`;

      const body = frame(`ℹ️ ${toCmdFont(cfg.name)}`, infoBody);

      return message.reply({
        body,
        attachment
      });

    } catch (e) {
      console.log(e);
    }
  }
};
