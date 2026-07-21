module.exports = {
    config: {
        name: "blacklist",
        version: "1.0.0",
        author: "Camille Uchiha",
        countDown: 5,
        role: 2, // Réservé aux administrateurs
        shortDescription: "Gestion de la liste noire des utilisateurs",
        longDescription: "Permet d'interdire ou d'autoriser l'accès aux commandes du bot pour des utilisateurs spécifiques via la base de données SQLite.",
        category: "Administration",
        guide: "{pn} [add / remove / list] [mention ou ID]"
    },

    onStart: async function ({ api, event, args, message }) {
        const sqlite3 = require('sqlite3').verbose();
        const path = require('path');
        const dbPath = path.join(process.cwd(), 'database.sqlite');
        
        const action = args[0] ? args[0].toLowerCase() : "";
        let targetID = args[1];

        // Si l'utilisateur est mentionné dans le message
        if (event.messageReply) {
            targetID = event.messageReply.senderID;
        } else if (Object.keys(event.mentions).length > 0) {
            targetID = Object.keys(event.mentions)[0];
        }

        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) console.error("[BLACKLIST DB ERROR]", err.message);
        });

        // Création de la table blacklist si elle n'existe pas
        db.run(`CREATE TABLE IF NOT EXISTS blacklist (userID TEXT PRIMARY KEY, reason TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)`);

        switch (action) {
            case "add": {
                if (!targetID) {
                    db.close();
                    return message.reply("❌ Veuillez mentionner un utilisateur ou fournir son ID à ajouter à la liste noire.");
                }

                const reason = args.slice(2).join(" ") || "Aucune raison spécifiée";

                db.run(`INSERT OR REPLACE INTO blacklist (userID, reason) VALUES (?, ?)`, [targetID, reason], function(err) {
                    db.close();
                    if (err) {
                        return message.reply("❌ Erreur lors de l'ajout à la liste noire.");
                    }
                    return message.reply(`✅ L'utilisateur ${targetID} a été ajouté à la liste noire.\n• Raison : ${reason}`);
                });
                break;
            }

            case "remove": {
                if (!targetID) {
                    db.close();
                    return message.reply("❌ Veuillez mentionner un utilisateur ou fournir son ID à retirer de la liste noire.");
                }

                db.run(`DELETE FROM blacklist WHERE userID = ?`, [targetID], function(err) {
                    db.close();
                    if (this.changes === 0) {
                        return message.reply("⚠️ Cet utilisateur n'était pas dans la liste noire.");
                    }
                    return message.reply(`✅ L'utilisateur ${targetID} a été retiré de la liste noire.`);
                });
                break;
            }

            case "list": {
                db.all(`SELECT userID, reason, timestamp FROM blacklist`, [], (err, rows) => {
                    db.close();
                    if (err) {
                        return message.reply("❌ Erreur lors de la lecture de la liste noire.");
                    }
                    if (rows.length === 0) {
                        return message.reply("📂 La liste noire est actuellement vide.");
                    }

                    let listMsg = "=== [ LISTE NOIRE DU BOT ] ===\n";
                    rows.forEach((row, index) => {
                        listMsg += `\n${index + 1}. ID : ${row.userID}\n   • Raison : ${row.reason}\n   • Date : ${row.timestamp}`;
                    });

                    return message.reply(listMsg);
                });
                break;
            }

            default:
                db.close();
                return message.reply("❌ Action inconnue. Utilisez : \n• !blacklist add [@mention/ID] [raison]\n• !blacklist remove [@mention/ID]\n• !blacklist list");
        }
    }
};
