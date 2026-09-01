const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "push",
    aliases: ["file", "explore", "folder", "f"],
    version: "2.0",
    author: "Camille Uchiha",
    countDown: 3,
    role: 2,

    description: {
      en: "Explore, read and manage bot files",
      fr: "Explorer, lire et gérer les fichiers du bot"
    },

    category: "admin",

    guide: {
      en:
        "{pn} → Explore\n" +
        "{pn} [folder] → Open folder\n" +
        "{pn} view [file] → Read file\n" +
        "{pn} delete [file] → Delete",

      fr:
        "{pn} → Explorer\n" +
        "{pn} [dossier] → Ouvrir\n" +
        "{pn} view [fichier] → Lire\n" +
        "{pn} delete [fichier] → Supprimer"
    }
  },

  onStart: async function ({ message, args }) {

    const rootPath = path.resolve("./");

    // ═══════════════════════════════════════
    // 𝙉𝘼𝙂𝙄 × 𝘽𝘼𝘾𝙃𝙄𝙍𝘼
    // ═══════════════════════════════════════

    function box(title, lines = []) {
      return [
        `╭━━━〔 ${title} 〕━━━╮`,
        ...lines.map(line => `┃ ${line}`),
        `╰━━━━━━━━━━━━━━━━━━━━╯`
      ].join("\n");
    }

    function error(text) {
      return box("⚠️ 𝙀𝙍𝙍𝙀𝙐𝙍", [
        "😴 𝙉𝙖𝙜𝙞 › Trop de problèmes...",
        `🐝 𝘽𝙖𝙘𝙝𝙞𝙧𝙖 › ${text}`
      ]);
    }

    function success(text) {
      return box("⚡ 𝘼𝘾𝙏𝙄𝙊𝙉 𝙏𝙀𝙍𝙈𝙄𝙉𝙀́𝙀", [
        `😴 𝙉𝙖𝙜𝙞 › ${text}`,
        "🐝 𝘽𝙖𝙘𝙝𝙞𝙧𝙖 › Et maintenant... on continue !"
      ]);
    }

    function safePath(input) {
      if (!input) return rootPath;

      const target = path.resolve(rootPath, input);

      if (
        target !== rootPath &&
        !target.startsWith(rootPath + path.sep)
      ) {
        return null;
      }

      return target;
    }

    function formatSize(bytes) {
      if (bytes < 1024) return `${bytes} B`;

      if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)} KB`;

      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    // ═══════════════════════════════════════
    // 📖 𝙇𝙀𝘾𝙏𝙐𝙍𝙀
    // ═══════════════════════════════════════

    if (args[0] === "view" || args[0] === "read") {

      const target = args.slice(1).join(" ");

      if (!target) {
        return message.reply(
          error("𝙄𝙡 𝙛𝙖𝙪𝙩 𝙙𝙤𝙣𝙣𝙚𝙧 𝙪𝙣 𝙛𝙞𝙘𝙝𝙞𝙚𝙧 𝙖̀ 𝙡𝙞𝙧𝙚.")
        );
      }

      const filePath = safePath(target);

      if (!filePath) {
        return message.reply(
          error("𝘾𝙚 𝙘𝙝𝙚𝙢𝙞𝙣 𝙚𝙨𝙩 𝙞𝙣𝙩𝙚𝙧𝙙𝙞𝙩.")
        );
      }

      if (!fs.existsSync(filePath)) {
        return message.reply(
          error(`𝙁𝙞𝙘𝙝𝙞𝙚𝙧 𝙞𝙣𝙩𝙧𝙤𝙪𝙫𝙖𝙗𝙡𝙚 › ${target}`)
        );
      }

      const stats = fs.statSync(filePath);

      if (!stats.isFile()) {
        return message.reply(
          error("𝘾𝙚 𝙘𝙝𝙚𝙢𝙞𝙣 𝙘𝙤𝙧𝙧𝙚𝙨𝙥𝙤𝙣𝙙 𝙖̀ 𝙪𝙣 𝙙𝙤𝙨𝙨𝙞𝙚𝙧.")
        );
      }

      try {

        const content = fs.readFileSync(filePath, "utf8");

        const header = box("📖 𝙇𝙀𝘾𝙏𝙐𝙍𝙀", [
          `📌 𝙁𝙞𝙘𝙝𝙞𝙚𝙧 › ${target}`,
          `📦 𝙏𝙖𝙞𝙡𝙡𝙚 › ${formatSize(stats.size)}`,
          `📝 𝙇𝙞𝙜𝙣𝙚𝙨 › ${content.split("\n").length}`,
          "🐝 𝘽𝙖𝙘𝙝𝙞𝙧𝙖 › Voyons ce qu'il cache..."
        ]);

        if (content.length <= 3500) {

          return message.reply(
            `${header}\n\n` +
            `╭━━〔 📜 𝘾𝙊𝙉𝙏𝙀𝙉𝙐 〕━━╮\n` +
            `${content}\n` +
            `╰━━━━━━━━━━━━━━━━━━━╯`
          );
        }

        const cacheDir = path.join(
          rootPath,
          "scripts",
          "cmds",
          "cache"
        );

        await fs.ensureDir(cacheDir);

        const safeName =
          path.basename(filePath)
            .replace(/[^\w.-]/g, "_");

        const tempPath = path.join(
          cacheDir,
          `push_${Date.now()}_${safeName}.txt`
        );

        await fs.writeFile(tempPath, content, "utf8");

        return message.reply(
          {
            body:
              `${header}\n\n` +
              "📎 𝙁𝙞𝙘𝙝𝙞𝙚𝙧 𝙩𝙧𝙤𝙥 𝙡𝙤𝙣𝙜.\n" +
              "🐝 𝘽𝙖𝙘𝙝𝙞𝙧𝙖 › Voilà tout le fichier !",
            attachment: fs.createReadStream(tempPath)
          },
          async () => {
            try {
              await fs.remove(tempPath);
            } catch {}
          }
        );

      } catch (e) {

        return message.reply(
          error(`𝙀𝙧𝙧𝙚𝙪𝙧 𝙙𝙚 𝙡𝙚𝙘𝙩𝙪𝙧𝙚 › ${e.message}`)
        );
      }
    }

    // ═══════════════════════════════════════
    // 🗑️ 𝙎𝙐𝙋𝙋𝙍𝙀𝙎𝙎𝙄𝙊𝙉
    // ═══════════════════════════════════════

    if (
      args[0] === "delete" ||
      args[0] === "del" ||
      args[0] === "remove"
    ) {

      const target = args.slice(1).join(" ");

      if (!target) {
        return message.reply(
          error("𝙎𝙥𝙚́𝙘𝙞𝙛𝙞𝙚 𝙡'𝙚́𝙡𝙚́𝙢𝙚𝙣𝙩 𝙖̀ 𝙨𝙪𝙥𝙥𝙧𝙞𝙢𝙚𝙧.")
        );
      }

      const filePath = safePath(target);

      if (!filePath) {
        return message.reply(
          error("𝘾𝙝𝙚𝙢𝙞𝙣 𝙞𝙣𝙩𝙚𝙧𝙙𝙞𝙩.")
        );
      }

      if (!fs.existsSync(filePath)) {
        return message.reply(
          error(`𝙄𝙣𝙩𝙧𝙤𝙪𝙫𝙖𝙗𝙡𝙚 › ${target}`)
        );
      }

      const protectedFiles = [
        "index.js",
        "package.json",
        "config.json",
        ".env"
      ];

      if (protectedFiles.includes(path.basename(filePath))) {

        return message.reply(
          box("🛡️ 𝙋𝙍𝙊𝙏𝙀𝘾𝙏𝙄𝙊𝙉", [
            "😴 𝙉𝙖𝙜𝙞 › Non.",
            `📌 ${target}`,
            "🐝 𝘽𝙖𝙘𝙝𝙞𝙧𝙖 › Celui-là reste en place !",
            "🔒 𝙁𝙞𝙘𝙝𝙞𝙚𝙧 𝙥𝙧𝙤𝙩𝙚́𝙜𝙚́."
          ])
        );
      }

      try {

        const stats = fs.statSync(filePath);

        await fs.remove(filePath);

        return message.reply(
          success(
            `${stats.isDirectory() ? "𝘿𝙤𝙨𝙨𝙞𝙚𝙧" : "𝙁𝙞𝙘𝙝𝙞𝙚𝙧"} ` +
            `\`${target}\` 𝙨𝙪𝙥𝙥𝙧𝙞𝙢𝙚́.`
          )
        );

      } catch (e) {

        return message.reply(
          error(`𝙎𝙪𝙥𝙥𝙧𝙚𝙨𝙨𝙞𝙤𝙣 𝙞𝙢𝙥𝙤𝙨𝙨𝙞𝙗𝙡𝙚 › ${e.message}`)
        );
      }
    }

    // ═══════════════════════════════════════
    // 📚 𝘼𝙄𝘿𝙀
    // ═══════════════════════════════════════

    if (
      args[0] === "help" ||
      args[0] === "h" ||
      args[0] === "?"
    ) {

      return message.reply(
        box("🐝 𝙉𝘼𝙂𝙄 × 𝘽𝘼𝘾𝙃𝙄𝙍𝘼 😴", [
          "😴 𝙉𝙖𝙜𝙞 › Voilà les commandes...",
          "",
          "📂 𝙥𝙪𝙨𝙝",
          "└─ Explorer la racine",
          "",
          "📁 𝙥𝙪𝙨𝙝 [𝙙𝙤𝙨𝙨𝙞𝙚𝙧]",
          "└─ Ouvrir un dossier",
          "",
          "📖 𝙥𝙪𝙨𝙝 𝙫𝙞𝙚𝙬 [𝙛𝙞𝙘𝙝𝙞𝙚𝙧]",
          "└─ Lire un fichier",
          "",
          "🗑️ 𝙥𝙪𝙨𝙝 𝙙𝙚𝙡𝙚𝙩𝙚 [𝙛𝙞𝙘𝙝𝙞𝙚𝙧]",
          "└─ Supprimer",
          "",
          "🐝 𝘽𝙖𝙘𝙝𝙞𝙧𝙖 › Cherche ton monstre !",
          "🔐 𝘼𝙘𝙘𝙚̀𝙨 › 𝘼𝙙𝙢𝙞𝙣𝙨 𝘽𝙤𝙩"
        ])
      );
    }

    // ═══════════════════════════════════════
    // 🔎 𝙀𝙓𝙋𝙇𝙊𝙍𝘼𝙏𝙄𝙊𝙉
    // ═══════════════════════════════════════

    const input = args.join(" ");
    let currentPath = safePath(input);

    if (!currentPath) {
      return message.reply(
        error("𝘾𝙝𝙚𝙢𝙞𝙣 𝙞𝙣𝙩𝙚𝙧𝙙𝙞𝙩.")
      );
    }

    if (
      fs.existsSync(currentPath) &&
      fs.statSync(currentPath).isFile()
    ) {

      return this.onStart({
        message,
        args: ["view", ...args]
      });
    }

    if (
      !fs.existsSync(currentPath) &&
      !path.extname(input)
    ) {

      const jsPath = safePath(`${input}.js`);

      if (
        jsPath &&
        fs.existsSync(jsPath) &&
        fs.statSync(jsPath).isFile()
      ) {

        return this.onStart({
          message,
          args: [
            "view",
            ...args.slice(0, -1),
            `${args[args.length - 1]}.js`
          ]
        });
      }
    }

    if (!fs.existsSync(currentPath)) {

      return message.reply(
        error(
          `𝘿𝙤𝙨𝙨𝙞𝙚𝙧 𝙞𝙣𝙩𝙧𝙤𝙪𝙫𝙖𝙗𝙡𝙚 › ${input}\n` +
          "💡 Exemple › 𝙥𝙪𝙨𝙝 𝙨𝙘𝙧𝙞𝙥𝙩𝙨/𝙘𝙢𝙙𝙨"
        )
      );
    }

    if (!fs.statSync(currentPath).isDirectory()) {

      return message.reply(
        error("𝘾𝙚 𝙣'𝙚𝙨𝙩 𝙥𝙖𝙨 𝙪𝙣 𝙙𝙤𝙨𝙨𝙞𝙚𝙧.")
      );
    }

    return explore(currentPath, input);

    // ═══════════════════════════════════════
    // 📂 𝙀𝙓𝙋𝙇𝙊𝙍𝘼𝙏𝙀𝙐𝙍
    // ═══════════════════════════════════════

    async function explore(directory, displayPath) {

      try {

        const items = await fs.readdir(directory);

        if (items.length === 0) {

          return message.reply(
            box("📂 𝘿𝙊𝙎𝙎𝙄𝙀𝙍 𝙑𝙄𝘿𝙀", [
              `📍 ${displayPath || "𝙍𝘼𝘾𝙄𝙉𝙀"}`,
              "😴 𝙉𝙖𝙜𝙞 › Rien ici...",
              "🐝 𝘽𝙖𝙘𝙝𝙞𝙧𝙖 › On cherche ailleurs !"
            ])
          );
        }

        const folders = [];
        const files = [];

        for (const item of items) {

          const itemPath = path.join(
            directory,
            item
          );

          try {

            const stats = await fs.stat(itemPath);

            if (stats.isDirectory()) {
              folders.push(item);
            } else {
              files.push({
                name: item,
                size: stats.size
              });
            }

          } catch {}
        }

        folders.sort((a, b) =>
          a.localeCompare(b)
        );

        files.sort((a, b) =>
          a.name.localeCompare(b.name)
        );

        const lines = [];

        lines.push(
          `📍 𝙋𝘼𝙏𝙃 › ${displayPath || "𝙍𝘼𝘾𝙄𝙉𝙀"}`,
          `📊 ${folders.length} 𝙙𝙤𝙨𝙨𝙞𝙚𝙧(𝙨) • ${files.length} 𝙛𝙞𝙘𝙝𝙞𝙚𝙧(𝙨)`,
          ""
        );

        if (folders.length) {

          lines.push("📁 𝘿𝙊𝙎𝙎𝙄𝙀𝙍𝙎");

          folders.forEach((folder, index) => {

            const last =
              index === folders.length - 1;

            lines.push(
              `${last ? "└" : "├"}─ 📁 ${folder}`
            );
          });

          lines.push("");
        }

        if (files.length) {

          lines.push("📄 𝙁𝙄𝘾𝙃𝙄𝙀𝙍𝙎");

          files.forEach((file, index) => {

            const last =
              index === files.length - 1;

            lines.push(
              `${last ? "└" : "├"}─ 📄 ${file.name} • ${formatSize(file.size)}`
            );
          });
        }

        lines.push(
          "",
          "━━━━━━━━━━━━━━━━━━━━",
          "😴 𝙉𝙖𝙜𝙞 › Trop de fichiers...",
          "🐝 𝘽𝙖𝙘𝙝𝙞𝙧𝙖 › Alors trouvons le monstre !",
          "",
          "💡 𝙥𝙪𝙨𝙝 [𝙣𝙤𝙢] › ouvrir",
          "📖 𝙥𝙪𝙨𝙝 𝙫𝙞𝙚𝙬 [𝙛𝙞𝙘𝙝𝙞𝙚𝙧] › lire",
          "🗑️ 𝙥𝙪𝙨𝙝 𝙙𝙚𝙡𝙚𝙩𝙚 [𝙛𝙞𝙘𝙝𝙞𝙚𝙧] › supprimer"
        );

        return message.reply(
          box("😴 𝙉𝘼𝙂𝙄 × 🐝 𝘽𝘼𝘾𝙃𝙄𝙍𝘼", lines)
        );

      } catch (e) {

        return message.reply(
          error(
            `𝙀𝙧𝙧𝙚𝙪𝙧 𝙙'𝙚𝙭𝙥𝙡𝙤𝙧𝙖𝙩𝙞𝙤𝙣 › ${e.message}`
          )
        );
      }
    }
  }
};
