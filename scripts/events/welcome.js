const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const axios = require("axios");
const path = require("path");

module.exports = {
    config: {
        name: "welcome",
        version: "1.4.0",
        author: "Camille Uchiha 🎀",
        countDown: 5,
        role: 0,
        description: "Bienvenue automatique avec carte Canvas et message spécial lorsque le bot rejoint un groupe",
        category: "events",
        guide: {
            en: "{pn} s'active automatiquement lors des arrivées dans le groupe."
        }
    },

    onStart: async function () {},

    onEvent: async function ({ api, event, threadsData, usersData }) {
        if (event.logMessageType !== "log:subscribe") return;

        const { threadID, logMessageData, author } = event;

        if (!logMessageData || !logMessageData.addedParticipants) return;

        const addedParticipants = logMessageData.addedParticipants;

        // =========================================================
        // 📁 INFORMATIONS DU GROUPE
        // =========================================================

        const threadInfo = await threadsData.get(threadID) || {};
        const threadName = threadInfo.threadName || "ce groupe";

        // =========================================================
        // 🤖 ID DU BOT
        // =========================================================

        const botID = String(api.getCurrentUserID());

        // =========================================================
        // 💤 IMAGE SPÉCIALE DU BOT
        // =========================================================

        const botImageURL =
            "https://i.ibb.co/cX8mbg6f/8e13a5dca805.jpg";

        // =========================================================
        // 👤 INFOS DE LA PERSONNE QUI A AJOUTÉ LE BOT
        // =========================================================

        let inviterName = "quelqu'un";

        try {
            const inviterInfo = await usersData.get(author);

            if (inviterInfo && inviterInfo.name) {
                inviterName = inviterInfo.name;
            }
        } catch (e) {
            console.error(
                "Impossible de récupérer le nom de l'auteur :",
                e.message
            );
        }

        // =========================================================
        // 🤖 DÉTECTION DU BOT
        // =========================================================

        for (const participant of addedParticipants) {

            const userID = String(participant.userFbId);
            const fullName = participant.fullName || "Nouveau membre";

            // =====================================================
            // 🤖 LE BOT VIENT D'ÊTRE AJOUTÉ
            // =====================================================

            if (userID === botID) {

                const cachePath = path.join(
                    __dirname,
                    "cache",
                    `bot_join_${threadID}.jpg`
                );

                try {

                    await fs.ensureDir(path.dirname(cachePath));

                    // Télécharger l'image
                    const response = await axios.get(botImageURL, {
                        responseType: "arraybuffer",
                        maxRedirects: 5,
                        timeout: 15000
                    });

                    await fs.outputFile(
                        cachePath,
                        Buffer.from(response.data)
                    );

                    // =================================================
                    // 💬 MESSAGE SPÉCIAL
                    // =================================================

                    const botMessage =
`╭───────────────╮
      💤  N A G I
╰───────────────╯

Bon... me voilà.

Merci à ${inviterName}
de m'avoir ajouté dans le groupe.

Je vais rester tranquille ici.
Évitez juste de me donner trop de travail... 😴

📂 Groupe : ${threadName}

⚡ Système activé.
🤖 Bot connecté avec succès.`;

                    await new Promise((resolve) => {

                        api.sendMessage(
                            {
                                body: botMessage,
                                attachment: fs.createReadStream(cachePath)
                            },
                            threadID,
                            (err) => {

                                if (err) {
                                    console.error(
                                        "Erreur lors de l'envoi du message du bot :",
                                        err
                                    );
                                }

                                if (fs.existsSync(cachePath)) {
                                    fs.unlinkSync(cachePath);
                                }

                                resolve();
                            }
                        );

                    });

                } catch (error) {

                    console.error(
                        "Erreur lors de l'accueil du bot :",
                        error
                    );

                    api.sendMessage(
                        `💤 Bon... me voilà dans ${threadName}.\n\nMerci de m'avoir ajouté, ${inviterName}. 😴`,
                        threadID
                    );
                }

                // Ne pas générer la carte de bienvenue normale pour le bot
                continue;
            }

            // =====================================================
            // 👤 NOUVEL UTILISATEUR NORMAL
            // =====================================================

            try {

                // =================================================
                // 👤 AVATAR DU NOUVEL UTILISATEUR
                // =================================================

                const avatarUrl =
                    `https://graph.facebook.com/${userID}/picture?width=500&height=500&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;

                const responseAvatar = await axios.get(
                    avatarUrl,
                    {
                        responseType: "arraybuffer",
                        maxRedirects: 5
                    }
                );

                const avatarImg = await loadImage(
                    Buffer.from(responseAvatar.data)
                );

                // =================================================
                // 🖼️ CANVAS
                // =================================================

                const canvas = createCanvas(1024, 500);
                const ctx = canvas.getContext("2d");

                // =================================================
                // 🌌 BACKGROUND
                // =================================================

                const backgroundUrl =
                    "https://i.ibb.co/jkgq4Nzt/a8364c99e94a.jpg";

                const responseBg = await axios.get(
                    backgroundUrl,
                    {
                        responseType: "arraybuffer",
                        maxRedirects: 5
                    }
                );

                const bgImg = await loadImage(
                    Buffer.from(responseBg.data)
                );

                const canvasRatio =
                    canvas.width / canvas.height;

                const imgRatio =
                    bgImg.width / bgImg.height;

                let drawWidth;
                let drawHeight;
                let drawX;
                let drawY;

                if (imgRatio > canvasRatio) {

                    drawHeight = canvas.height;
                    drawWidth =
                        bgImg.width *
                        (canvas.height / bgImg.height);

                    drawX =
                        (canvas.width - drawWidth) / 2;

                    drawY = 0;

                } else {

                    drawWidth = canvas.width;

                    drawHeight =
                        bgImg.height *
                        (canvas.width / bgImg.width);

                    drawX = 0;

                    drawY =
                        (canvas.height - drawHeight) / 2;
                }

                ctx.drawImage(
                    bgImg,
                    drawX,
                    drawY,
                    drawWidth,
                    drawHeight
                );

                // =================================================
                // 🌑 VOILE SOMBRE
                // =================================================

                ctx.fillStyle =
                    "rgba(10, 8, 20, 0.55)";

                ctx.fillRect(
                    0,
                    0,
                    canvas.width,
                    canvas.height
                );

                // =================================================
                // 🔵 EFFETS
                // =================================================

                ctx.fillStyle =
                    "rgba(122, 79, 240, 0.15)";

                ctx.beginPath();

                ctx.arc(
                    900,
                    100,
                    200,
                    0,
                    Math.PI * 2
                );

                ctx.fill();

                ctx.fillStyle =
                    "rgba(0, 242, 254, 0.1)";

                ctx.beginPath();

                ctx.arc(
                    100,
                    400,
                    150,
                    0,
                    Math.PI * 2
                );

                ctx.fill();

                // =================================================
                // 👤 AVATAR
                // =================================================

                const avatarX = 512;
                const avatarY = 180;
                const avatarRadius = 100;

                ctx.save();

                ctx.beginPath();

                ctx.arc(
                    avatarX,
                    avatarY,
                    avatarRadius,
                    0,
                    Math.PI * 2
                );

                ctx.closePath();
                ctx.clip();

                ctx.drawImage(
                    avatarImg,
                    avatarX - avatarRadius,
                    avatarY - avatarRadius,
                    avatarRadius * 2,
                    avatarRadius * 2
                );

                ctx.restore();

                // =================================================
                // ✨ CONTOUR
                // =================================================

                ctx.strokeStyle = "#00f2fe";
                ctx.lineWidth = 6;

                ctx.beginPath();

                ctx.arc(
                    avatarX,
                    avatarY,
                    avatarRadius,
                    0,
                    Math.PI * 2
                );

                ctx.stroke();

                // =================================================
                // 📝 TEXTES
                // =================================================

                ctx.textAlign = "center";

                ctx.fillStyle = "#ffffff";
                ctx.font = "bold 36px Arial";

                ctx.fillText(
                    "BIENVENUE !",
                    512,
                    330
                );

                ctx.fillStyle = "#00f2fe";
                ctx.font = "bold 42px Arial";

                ctx.fillText(
                    fullName,
                    512,
                    390
                );

                ctx.fillStyle = "#a0a0c0";
                ctx.font = "italic 24px Arial";

                ctx.fillText(
                    `Bienvenue dans : ${threadName}`,
                    512,
                    440
                );

                // =================================================
                // 📅 DATE
                // =================================================

                const now = new Date();

                const dateStr =
                    now.toLocaleDateString(
                        "fr-FR",
                        {
                            day: "2-digit",
                            month: "long",
                            year: "numeric"
                        }
                    );

                const timeStr =
                    now.toLocaleTimeString(
                        "fr-FR",
                        {
                            hour: "2-digit",
                            minute: "2-digit"
                        }
                    );

                ctx.textAlign = "right";

                ctx.fillStyle = "#a0a0c0";
                ctx.font = "16px Arial";

                ctx.fillText(
                    dateStr,
                    934,
                    450
                );

                ctx.fillText(
                    timeStr,
                    934,
                    470
                );

                // =================================================
                // 💾 CACHE
                // =================================================

                const cachePath = path.join(
                    __dirname,
                    "cache",
                    `welcome_${userID}.png`
                );

                await fs.ensureDir(
                    path.dirname(cachePath)
                );

                await fs.outputFile(
                    cachePath,
                    canvas.toBuffer()
                );

                // =================================================
                // 💬 MESSAGE
                // =================================================

                const msg = {
                    body:
                        `╭───〔 💤 BIENVENUE 〕───╮\n` +
                        `│ ${fullName}\n` +
                        `│\n` +
                        `│ Prends le temps de découvrir\n` +
                        `│ le groupe et de lire le règlement.\n` +
                        `╰────────────────────╯`,
                    attachment:
                        fs.createReadStream(cachePath)
                };

                api.sendMessage(
                    msg,
                    threadID,
                    (err) => {

                        if (fs.existsSync(cachePath)) {
                            fs.unlinkSync(cachePath);
                        }

                        if (err) {
                            console.error(
                                "Erreur d'envoi :",
                                err
                            );
                        }
                    }
                );

            } catch (error) {

                console.error(
                    "Erreur lors de la génération de la Welcome Card :",
                    error
                );

                api.sendMessage(
                    `💤 Bienvenue ${fullName} dans le groupe !`,
                    threadID
                );
            }
        }
    }
};
