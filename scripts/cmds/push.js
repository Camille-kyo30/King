const fs = require("fs-extra");
const path = require("path");

module.exports = {
  config: {
    name: "push",
    aliases: ["file", "explore", "folder", "f"],
    version: "1.4",
    author: "Camille Uchiha",
    countDown: 3,
    role: 2, // 2 = Administrateurs du Bot
    description: {
      en: "Explore, view, or delete bot system files and directories from the chat",
      fr: "Explorer, lire ou supprimer des fichiers et dossiers du système du bot depuis le chat"
    },
    category: "admin",
    guide: {
      en: "Use:\n{pn} : List root files\n{pn} [folder] : Browse a folder (add p2, p3... for pages)\n{pn} view [filename] : View file content\n{pn} search [term] : Search files by name\n{pn} delete [filename] : Delete a file\n{pn} delete confirm [folder] : Delete a folder (requires confirm)\n{pn} back : Go up one folder",
      fr: "Utilisation :\n{pn} : Lister la racine\n{pn} [dossier] : Explorer un dossier (ajoute p2, p3... pour paginer)\n{pn} view [nom_fichier] : Lire le contenu d'un fichier\n{pn} search [terme] : Rechercher des fichiers par nom\n{pn} delete [nom_fichier] : Supprimer un fichier\n{pn} delete confirm [dossier] : Supprimer un dossier (confirmation requise)\n{pn} back : Remonter d'un dossier"
    }
  },

  onStart: async function ({ message, args }) {
    const rootPath = path.resolve("./");
    let action = (args[0] || "").toLowerCase();

    const formatSize = (bytes) => {
      if (bytes < 1024) return `${bytes} o`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
    };

    const ICONS = {
      ".js": "🟨", ".json": "🗂️", ".md": "📝", ".txt": "📃",
      ".png": "🖼️", ".jpg": "🖼️", ".jpeg": "🖼️", ".gif": "🖼️", ".webp": "🖼️",
      ".env": "🔐", ".css": "🎨", ".html": "🌐", ".log": "🧾"
    };
    const iconFor = (item, isDir) => {
      if (isDir) return "📁";
      return ICONS[path.extname(item).toLowerCase()] || "📄";
    };

    const PAGE_SIZE = 20;

    const box = (title, body, footer) => {
      const line = "─".repeat(24);
      let out = `╭${line}╮\n│  📦 ${title}\n╰${line}╯\n${body}`;
      if (footer) out += `\n\n┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n💡 ${footer}`;
      return out;
    };

    // --- ACTION : REMONTER D'UN DOSSIER ---
    if (action === "back" || action === "..") {
      const current = args.slice(1).join(" ");
      const parent = path.dirname(current);
      const newArgs = parent === "." ? [] : parent.split(path.sep);
      return this.onStart({ message, args: newArgs });
    }

    // --- ACTION : LIRE UN FICHIER ---
    if (action === "view" || action === "read") {
      const target = args.slice(1).join(" ");
      if (!target) return message.reply("⚠️ Spécifiez le nom ou le chemin du fichier à lire.\n\n📌 Exemple : `push view scripts/cmds/help.js`");
      const filePath = path.join(rootPath, target);

      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        return message.reply("❌ Fichier introuvable ou il s'agit d'un dossier.");
      }

      try {
        const content = fs.readFileSync(filePath, "utf-8");
        const stat = fs.statSync(filePath);
        const header = `📄 ${path.basename(target)}  •  ${formatSize(stat.size)}  •  ${content.split("\n").length} lignes`;

        if (content.length > 3900) {
          const tempPath = path.join(rootPath, "scripts", "cmds", "cache", `view_${path.basename(filePath)}.txt`);
          fs.ensureDirSync(path.dirname(tempPath));
          fs.writeFileSync(tempPath, content);
          return message.reply({
            body: box(header, "Fichier trop long pour être affiché ici, envoyé en pièce jointe ⬇️"),
            attachment: fs.createReadStream(tempPath)
          }, () => {
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
          });
        }
        const parentDir = path.dirname(target);
        const backCmd = parentDir === "." ? "push" : `push ${parentDir}`;
        return message.reply(box(header, `\`\`\`text\n${content}\n\`\`\``, `Retour : \`${backCmd}\``));
      } catch (e) {
        return message.reply(`❌ Erreur lors de la lecture : ${e.message}`);
      }
    }

    // --- ACTION : SUPPRIMER UN FICHIER ---
    if (action === "delete" || action === "del") {
      let rest = args.slice(1);
      const confirmed = rest[0] === "confirm";
      if (confirmed) rest = rest.slice(1);
      const target = rest.join(" ");

      if (!target) return message.reply("⚠️ Spécifiez le fichier ou dossier à supprimer.");
      const filePath = path.join(rootPath, target);

      if (!fs.existsSync(filePath)) return message.reply("❌ Fichier ou dossier introuvable.");

      const protectedPaths = ["index.js", "package.json", "config.json", "node_modules", ".git", "scripts/cmds"];
      if (protectedPaths.includes(target)) {
        return message.reply("🚫 Action refusée : cet élément est vital pour la survie du bot.");
      }

      const isDir = fs.statSync(filePath).isDirectory();

      // Sécurité : un dossier doit être confirmé explicitement
      if (isDir && !confirmed) {
        const count = fs.readdirSync(filePath).length;
        return message.reply(box(
          "⚠️ Confirmation requise",
          `Tu es sur le point de supprimer le dossier \`${target}\` (${count} élément(s)) et TOUT son contenu, sans retour possible.`,
          `Pour confirmer : \`push delete confirm ${target}\``
        ));
      }

      try {
        fs.removeSync(filePath);
        return message.reply(box(
          "Suppression réussie",
          `${isDir ? "📁" : "📄"} \`${target}\`\nSupprimé définitivement.`
        ));
      } catch (e) {
        return message.reply(`❌ Impossible de supprimer : ${e.message}`);
      }
    }

    // --- ACTION : RECHERCHER UN FICHIER ---
    if (action === "search" || action === "find") {
      const term = args.slice(1).join(" ").toLowerCase();
      if (!term) return message.reply("⚠️ Spécifiez un terme à rechercher.\n\n📌 Exemple : `push search wanted`");

      const results = [];
      const IGNORED = new Set(["node_modules", ".git", "cache"]);
      const walk = (dir, relDir) => {
        if (results.length >= 30) return;
        let entries;
        try { entries = fs.readdirSync(dir); } catch { return; }
        for (const entry of entries) {
          if (IGNORED.has(entry)) continue;
          const full = path.join(dir, entry);
          const rel = relDir ? `${relDir}/${entry}` : entry;
          const stat = fs.statSync(full);
          if (entry.toLowerCase().includes(term)) {
            results.push(`  ${iconFor(entry, stat.isDirectory())} ${rel}`);
          }
          if (stat.isDirectory() && results.length < 30) walk(full, rel);
        }
      };
      walk(rootPath, "");

      if (results.length === 0) {
        return message.reply(box("Recherche", `Aucun résultat pour \`${term}\`.`));
      }
      return message.reply(box(
        `Recherche : "${term}"`,
        `${results.length} résultat(s)${results.length >= 30 ? " (limité à 30)" : ""}\n┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n${results.join("\n")}`,
        "`push view [chemin]` → ouvrir un résultat"
      ));
    }

    // --- 🟢 LOGIQUE D'EXPLORATION ET REDIRECTION AUTO ---
    // Extraction du numéro de page si présent (ex: "push scripts/cmds p2")
    let pageArgs = [...args];
    let pageNum = 1;
    const lastArg = pageArgs[pageArgs.length - 1];
    if (lastArg && /^p(age)?\d+$/i.test(lastArg)) {
      pageNum = parseInt(lastArg.replace(/^p(age)?/i, ""), 10) || 1;
      pageArgs = pageArgs.slice(0, -1);
    }

    const fullPathInput = pageArgs.join(" ");
    let currentDir = fullPathInput ? path.join(rootPath, fullPathInput) : rootPath;

    // Redirection intelligente : fichier saisi sans "view"
    if (fs.existsSync(currentDir) && fs.statSync(currentDir).isFile()) {
      pageArgs.unshift("view");
      return this.onStart({ message, args: pageArgs });
    }

    // Nom sans extension .js
    if (!fs.existsSync(currentDir) && fs.existsSync(currentDir + ".js")) {
      pageArgs[pageArgs.length - 1] = pageArgs[pageArgs.length - 1] + ".js";
      pageArgs.unshift("view");
      return this.onStart({ message, args: pageArgs });
    }

    if (!fs.existsSync(currentDir) || !fs.statSync(currentDir).isDirectory()) {
      return message.reply(box(
        "Introuvable",
        `❌ Le dossier \`${fullPathInput}\` n'existe pas.`,
        "Pour voir les commandes : `push scripts/cmds`"
      ));
    }

    try {
      const items = fs.readdirSync(currentDir);
      if (items.length === 0) {
        return message.reply(box(fullPathInput || "RACINE", "📁 Ce dossier est vide."));
      }

      const folders = [];
      const files = [];

      items.forEach(item => {
        const itemPath = path.join(currentDir, item);
        const stat = fs.statSync(itemPath);
        if (stat.isDirectory()) {
          folders.push({ label: `  📁 ${item}/`, name: item });
        } else {
          files.push({ label: `  ${iconFor(item, false)} ${item}  ⟶  ${formatSize(stat.size)}`, name: item });
        }
      });

      folders.sort((a, b) => a.name.localeCompare(b.name));
      files.sort((a, b) => a.name.localeCompare(b.name));

      const allEntries = [...folders, ...files].map(e => e.label);
      const totalPages = Math.max(1, Math.ceil(allEntries.length / PAGE_SIZE));
      const safePage = Math.min(Math.max(pageNum, 1), totalPages);
      const pageEntries = allEntries.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

      const breadcrumb = fullPathInput ? `📍 /${fullPathInput}` : "📍 / (racine)";
      const pageInfo = totalPages > 1 ? `  •  page ${safePage}/${totalPages}` : "";
      const body =
        `${breadcrumb}\n` +
        `${folders.length} dossier(s)  •  ${files.length} fichier(s)${pageInfo}\n` +
        `┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n` +
        pageEntries.join("\n");

      const footerLines = [
        "`push [dossier]` → ouvrir un dossier",
        "💡 `push view [fichier]` → lire un fichier",
        `💡 \`push back${fullPathInput ? " " + fullPathInput : ""}\` → remonter`
      ];
      if (totalPages > 1 && safePage < totalPages) {
        footerLines.push(`➡️ \`push ${fullPathInput ? fullPathInput + " " : ""}p${safePage + 1}\` → page suivante`);
      }

      return message.reply(box("EXPLORATEUR", body, footerLines.join("\n")));
    } catch (e) {
      return message.reply(`❌ Erreur d'exploration : ${e.message}`);
    }
  }
};
