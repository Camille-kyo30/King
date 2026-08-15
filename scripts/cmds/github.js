const axios = require("axios");

module.exports = {
  config: {
    name: "github",
    aliases: ["repo", "gh"],
    version: "1.0",
    author: "Camille Uchiha",
    countDown: 5,
    role: 0,
    description: {
      en: "Search GitHub repositories, view repo info, or list a repo's forks",
      fr: "Rechercher des dépôts GitHub, voir les infos d'un repo ou lister ses forks"
    },
    category: "utility",
    guide: {
      en: "Use:\n{pn} search [term] : Search repositories\n{pn} info [owner/repo] : Repo details\n{pn} forks [owner/repo] : List forks of a repo\n{pn} forks [owner/repo] p2 : Next page of forks",
      fr: "Utilisation :\n{pn} search [terme] : Rechercher des dépôts\n{pn} info [owner/repo] : Détails d'un dépôt\n{pn} forks [owner/repo] : Lister les forks d'un dépôt\n{pn} forks [owner/repo] p2 : Page suivante des forks"
    }
  },

  onStart: async function ({ message, args }) {
    const action = (args[0] || "").toLowerCase();
    const PAGE_SIZE = 10;

    const box = (title, body, footer) => {
      const line = "─".repeat(24);
      let out = `╭${line}╮\n│  🐙 ${title}\n╰${line}╯\n${body}`;
      if (footer) out += `\n\n┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n💡 ${footer}`;
      return out;
    };

    const formatNum = (n) => {
      if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
      if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
      return `${n}`;
    };

    const timeAgo = (dateStr) => {
      const diffMs = Date.now() - new Date(dateStr).getTime();
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      if (days < 1) return "aujourd'hui";
      if (days < 30) return `il y a ${days}j`;
      if (days < 365) return `il y a ${Math.floor(days / 30)} mois`;
      return `il y a ${Math.floor(days / 365)} an(s)`;
    };

    const ghHeaders = { headers: { Accept: "application/vnd.github+json", "User-Agent": "GoatBot-Camille-Uchiha" } };

    const handleApiError = (e, msg) => {
      if (e.response && e.response.status === 403) {
        return message.reply("⏳ Limite de requêtes GitHub atteinte (API publique limitée). Réessaie dans quelques minutes.");
      }
      if (e.response && e.response.status === 404) {
        return message.reply(`❌ Introuvable : ${msg}`);
      }
      return message.reply(`❌ Erreur GitHub : ${e.message}`);
    };

    // --- ACTION : RECHERCHER DES REPOS ---
    if (action === "search" || action === "find") {
      const query = args.slice(1).join(" ");
      if (!query) return message.reply("⚠️ Spécifiez un terme de recherche.\n\n📌 Exemple : `github search goatbot`");

      try {
        const { data } = await axios.get("https://api.github.com/search/repositories", {
          ...ghHeaders,
          params: { q: query, sort: "stars", order: "desc", per_page: 8 }
        });

        if (!data.items || data.items.length === 0) {
          return message.reply(box("Recherche", `Aucun résultat pour \`${query}\`.`));
        }

        const lines = data.items.map((repo, i) => {
          const desc = repo.description ? repo.description.slice(0, 70) : "Pas de description";
          return `${i + 1}. **${repo.full_name}** ${repo.fork ? "🍴" : ""}\n   ⭐ ${formatNum(repo.stargazers_count)}  •  🍴 ${formatNum(repo.forks_count)}  •  ${repo.language || "?"}\n   _${desc}_`;
        });

        return message.reply(box(
          `Recherche : "${query}"`,
          `${formatNum(data.total_count)} résultat(s) au total\n┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n${lines.join("\n\n")}`,
          "`github info [owner/repo]` → détails\n💡 `github forks [owner/repo]` → voir les forks"
        ));
      } catch (e) {
        return handleApiError(e, query);
      }
    }

    // --- ACTION : INFOS D'UN REPO ---
    if (action === "info" || action === "repo") {
      const target = args[1];
      if (!target || !target.includes("/")) {
        return message.reply("⚠️ Format attendu : `owner/repo`\n\n📌 Exemple : `github info facebook/react`");
      }

      try {
        const { data: repo } = await axios.get(`https://api.github.com/repos/${target}`, ghHeaders);

        const body =
          `📦 **${repo.full_name}**${repo.fork ? " (fork)" : ""}\n` +
          `${repo.description || "Pas de description"}\n` +
          `┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n` +
          `⭐ Stars : ${formatNum(repo.stargazers_count)}\n` +
          `🍴 Forks : ${formatNum(repo.forks_count)}\n` +
          `👁️ Watchers : ${formatNum(repo.subscribers_count)}\n` +
          `🐛 Issues ouvertes : ${formatNum(repo.open_issues_count)}\n` +
          `💻 Langage : ${repo.language || "Non spécifié"}\n` +
          `📜 Licence : ${repo.license ? repo.license.name : "Aucune"}\n` +
          `🕒 Dernière MAJ : ${timeAgo(repo.updated_at)}\n` +
          `🔗 ${repo.html_url}`;

        return message.reply(box("INFO DÉPÔT", body, `\`github forks ${target}\` → voir ses forks`));
      } catch (e) {
        return handleApiError(e, target);
      }
    }

    // --- ACTION : LISTER LES FORKS ---
    if (action === "forks" || action === "fork") {
      let rest = args.slice(1);
      let page = 1;
      const last = rest[rest.length - 1];
      if (last && /^p(age)?\d+$/i.test(last)) {
        page = parseInt(last.replace(/^p(age)?/i, ""), 10) || 1;
        rest = rest.slice(0, -1);
      }
      const target = rest.join("");

      if (!target || !target.includes("/")) {
        return message.reply("⚠️ Format attendu : `owner/repo`\n\n📌 Exemple : `github forks facebook/react`");
      }

      try {
        const [{ data: repo }, { data: forks }] = await Promise.all([
          axios.get(`https://api.github.com/repos/${target}`, ghHeaders),
          axios.get(`https://api.github.com/repos/${target}/forks`, {
            ...ghHeaders,
            params: { sort: "stargazers", per_page: PAGE_SIZE, page }
          })
        ]);

        if (forks.length === 0) {
          return message.reply(box(
            `Forks de ${target}`,
            page === 1
              ? `Ce dépôt n'a aucun fork pour l'instant (🍴 ${repo.forks_count}).`
              : `Aucun fork sur cette page.`
          ));
        }

        const lines = forks.map((f, i) => {
          const idx = (page - 1) * PAGE_SIZE + i + 1;
          return `${idx}. **${f.full_name}**\n   ⭐ ${formatNum(f.stargazers_count)}  •  🕒 ${timeAgo(f.pushed_at)}\n   🔗 ${f.html_url}`;
        });

        const totalPages = Math.max(1, Math.ceil(repo.forks_count / PAGE_SIZE));
        const footerLines = [`Dépôt d'origine : \`github info ${target}\``];
        if (page < totalPages) footerLines.push(`➡️ \`github forks ${target} p${page + 1}\` → page suivante`);

        return message.reply(box(
          `Forks de ${target}`,
          `🍴 ${formatNum(repo.forks_count)} fork(s) au total  •  page ${page}/${totalPages}\n┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈┈\n${lines.join("\n\n")}`,
          footerLines.join("\n")
        ));
      } catch (e) {
        return handleApiError(e, target);
      }
    }

    // --- AUCUNE ACTION : AIDE ---
    return message.reply(box(
      "GITHUB",
      `Recherche et explore des dépôts GitHub directement depuis le chat.`,
      `\`github search [terme]\` → chercher des repos\n💡 \`github info [owner/repo]\` → détails d'un repo\n💡 \`github forks [owner/repo]\` → lister ses forks`
    ));
  }
};
