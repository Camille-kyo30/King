const fs = require('fs-extra');
const path = require('path');

const dataPath = path.join(__dirname, 'data', 'blacklistGroups.json');

async function readBlacklist() {
    await fs.ensureDir(path.dirname(dataPath));
    if (!(await fs.pathExists(dataPath))) {
        await fs.outputJson(dataPath, []);
        return [];
    }
    try {
        return await fs.readJson(dataPath);
    } catch (e) {
        return [];
    }
}

async function writeBlacklist(list) {
    await fs.ensureDir(path.dirname(dataPath));
    await fs.outputJson(dataPath, list, { spaces: 2 });
}

module.exports = {
    config: {
        name: "blacklistgroup",
        aliases: ["blg", "bgr"],
        version: "1.0.0",
        author: "Camille uchiha 🎀",
        countDown: 5,
        role: 2, // Réservé à l'administration du bot (bot admin)
        shortDescription: {
            fr: "Gère la liste noire des groupes interdits au bot",
            en: "Manage the list of groups banned for the bot"
        },
        longDescription: {
            fr: "Ajoute, retire ou liste les groupes dans lesquels le bot n'a pas le droit d'être. Si quelqu'un ajoute le bot dans un groupe blacklisté, le bot quitte ce groupe immédiatement et automatiquement.",
            en: "Add, remove or list groups the bot is forbidden to be in. If someone adds the bot to a blacklisted group, the bot leaves it immediately and automatically."
        },
        category: "owner",
        guide: {
            fr: "{pn} add <threadID> : ajoute un groupe à la liste noire (par défaut le groupe actuel)\n"
                + "{pn} remove <threadID> : retire un groupe de la liste noire\n"
                + "{pn} list : affiche la liste des groupes blacklistés",
            en: "{pn} add <threadID>\n{pn} remove <threadID>\n{pn} list"
        }
    },

    onStart: async function ({ api, args, message, event }) {
        const action = (args[0] || "").toLowerCase();
        const threadID = args[1] || event.threadID;

        let blacklist = await readBlacklist();

        switch (action) {
            case "add": {
                if (blacklist.includes(threadID)) {
                    return message.reply(`⚠️ Le groupe ${threadID} est déjà dans la liste noire.`);
                }
                blacklist.push(threadID);
                await writeBlacklist(blacklist);
                return message.reply(`✅ Groupe ${threadID} ajouté à la liste noire.\nSi le bot y est ajouté, il quittera automatiquement ce groupe.`);
            }

            case "remove":
            case "rm": {
                if (!blacklist.includes(threadID)) {
                    return message.reply(`⚠️ Le groupe ${threadID} n'est pas dans la liste noire.`);
                }
                blacklist = blacklist.filter(id => id !== threadID);
                await writeBlacklist(blacklist);
                return message.reply(`✅ Groupe ${threadID} retiré de la liste noire.`);
            }

            case "list":
            case "ls": {
                if (blacklist.length === 0) {
                    return message.reply("📋 La liste noire est vide.");
                }
                return message.reply(`📋 Groupes blacklistés (${blacklist.length}) :\n${blacklist.map((id, i) => `${i + 1}. ${id}`).join("\n")}`);
            }

            default:
                return message.reply(
                    "❌ Utilisation :\n"
                    + `${global.config.prefix}blacklistgroup add [threadID] — ajoute un groupe (ou le groupe actuel si non précisé)\n`
                    + `${global.config.prefix}blacklistgroup remove [threadID] — retire un groupe\n`
                    + `${global.config.prefix}blacklistgroup list — affiche la liste`
                );
        }
    },

    // Vérifie à chaque événement si le bot vient d'être ajouté dans un groupe blacklisté
    onEvent: async function ({ api, event }) {
        if (event.logMessageType !== "log:subscribe") return;

        const { threadID, logMessageData } = event;
        const { addedParticipants } = logMessageData;
        const botID = api.getCurrentUserID();

        // On ne s'intéresse qu'au cas où c'est le BOT lui-même qui a été ajouté
        const botWasAdded = addedParticipants.some(p => p.userFbId == botID);
        if (!botWasAdded) return;

        const blacklist = await readBlacklist();
        if (!blacklist.includes(threadID)) return;

        try {
            // Message d'avertissement avant de partir
            await api.sendMessage(
                "🚫 Ce groupe est interdit d'accès pour ce bot (liste noire de l'administration). Le bot quitte immédiatement.",
                threadID
            );
        } catch (e) {
            console.error("Impossible d'envoyer le message d'avertissement avant de quitter :", e);
        }

        try {
            await api.removeUserFromGroup(botID, threadID);
        } catch (e) {
            console.error("Erreur lors du départ automatique du groupe blacklisté :", e);
        }
    }
};
