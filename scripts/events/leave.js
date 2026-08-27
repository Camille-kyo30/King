const { createCanvas, loadImage } = require('canvas');
const fs = require('fs-extra');
const axios = require('axios');
const path = require('path');

module.exports = {
    config: {
        name: "leave",
        version: "1.0.0",
        author: "Camille uchiha 🎀",
        countDown: 5,
        role: 0,
        description: "Envoie une carte Canvas (avec photo de profil, date/heure et qui a retiré la personne) lorsqu'un utilisateur quitte le groupe",
        category: "events",
        guide: {
            en: "{pn} s'active automatiquement quand quelqu'un quitte le groupe."
        }
    },

    onStart: async function () {},

    // GoatBot appelle onEvent pour tous les événements du thread
    onEvent: async function ({ api, event, threadsData, usersData }) {
        if (event.logMessageType !== "log:unsubscribe") return;

        const { threadID, logMessageData, author } = event;
        const leftUserID = logMessageData.leftParticipantFbId;

        // Ignorer si c'est le bot lui-même qui quitte
        if (leftUserID == api.getCurrentUserID()) return;

        // Récupérer le nom du groupe
        const threadInfo = await threadsData.get(threadID) || {};
        const threadName = threadInfo.threadName || "ce groupe";

        // Récupérer la photo de profil du groupe (si définie)
        let groupAvatarImg = null;
        if (threadInfo.imageSrc) {
            try {
                const responseGroupAvatar = await axios.get(threadInfo.imageSrc, {
                    responseType: 'arraybuffer',
                    maxRedirects: 5
                });
                groupAvatarImg = await loadImage(Buffer.from(responseGroupAvatar.data));
            } catch (e) {
                console.error("Impossible de récupérer la photo du groupe :", e);
            }
        }

        // Récupérer le nom de la personne qui a quitté
        let leftUserName = "Un membre";
        try {
            const leftUserInfo = await usersData.get(leftUserID);
            leftUserName = (leftUserInfo && leftUserInfo.name) || leftUserName;
        } catch (e) {
            console.error("Impossible de récupérer le nom du membre parti :", e);
        }

        // Déterminer si la personne est partie d'elle-même ou a été retirée
        const wasKicked = author && author != leftUserID;
        let actorName = "elle-même";
        let actorAvatarImg = null;

        if (wasKicked) {
            try {
                const actorInfo = await usersData.get(author);
                actorName = (actorInfo && actorInfo.name) || "quelqu'un";

                const actorAvatarUrl = `https://graph.facebook.com/${author}/picture?width=200&height=200&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
                const responseActorAvatar = await axios.get(actorAvatarUrl, {
                    responseType: 'arraybuffer',
                    maxRedirects: 5
                });
                actorAvatarImg = await loadImage(Buffer.from(responseActorAvatar.data));
            } catch (e) {
                console.error("Impossible de récupérer les infos de l'auteur du retrait :", e);
            }
        }

        // Date et heure formatées en français
        const now = new Date();
        const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
        const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

        try {
            // 1. Avatar du membre parti
            const avatarUrl = `https://graph.facebook.com/${leftUserID}/picture?width=500&height=500&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
            const responseAvatar = await axios.get(avatarUrl, {
                responseType: 'arraybuffer',
                maxRedirects: 5
            });
            const avatarImg = await loadImage(Buffer.from(responseAvatar.data));

            // 2. Initialisation du canvas
            const canvas = createCanvas(1024, 500);
            const ctx = canvas.getContext('2d');

            // 3. Image de fond personnalisée
            const backgroundUrl = "https://i.ibb.co/jkgq4Nzt/a8364c99e94a.jpg";
            const responseBg = await axios.get(backgroundUrl, {
                responseType: 'arraybuffer',
                maxRedirects: 5
            });
            const bgImg = await loadImage(Buffer.from(responseBg.data));

            const canvasRatio = canvas.width / canvas.height;
            const imgRatio = bgImg.width / bgImg.height;
            let drawWidth, drawHeight, drawX, drawY;

            if (imgRatio > canvasRatio) {
                drawHeight = canvas.height;
                drawWidth = bgImg.width * (canvas.height / bgImg.height);
                drawX = (canvas.width - drawWidth) / 2;
                drawY = 0;
            } else {
                drawWidth = canvas.width;
                drawHeight = bgImg.height * (canvas.width / bgImg.width);
                drawX = 0;
                drawY = (canvas.height - drawHeight) / 2;
            }

            ctx.drawImage(bgImg, drawX, drawY, drawWidth, drawHeight);

            // Voile sombre (plus prononcé, ton "départ" plus grave que le welcome)
            ctx.fillStyle = 'rgba(10, 8, 20, 0.65)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Cercles décoratifs rougeâtres en arrière-plan (ton différent du welcome)
            ctx.fillStyle = 'rgba(240, 79, 79, 0.15)';
            ctx.beginPath(); ctx.arc(900, 100, 200, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = 'rgba(254, 128, 0, 0.1)';
            ctx.beginPath(); ctx.arc(100, 400, 150, 0, Math.PI * 2); ctx.fill();

            // 4bis. Photo de profil du groupe + nom du groupe (en haut à gauche)
            if (groupAvatarImg) {
                const grpX = 70, grpY = 60, grpRadius = 32;
                ctx.save();
                ctx.beginPath();
                ctx.arc(grpX, grpY, grpRadius, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(
                    groupAvatarImg,
                    grpX - grpRadius,
                    grpY - grpRadius,
                    grpRadius * 2,
                    grpRadius * 2
                );
                ctx.restore();

                ctx.strokeStyle = '#ff4f4f';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(grpX, grpY, grpRadius, 0, Math.PI * 2);
                ctx.stroke();
            }

            ctx.textAlign = 'left';
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px Arial';
            ctx.fillText(threadName, groupAvatarImg ? 115 : 40, 55);
            ctx.fillStyle = '#a0a0c0';
            ctx.font = '14px Arial';
            ctx.fillText("Groupe", groupAvatarImg ? 115 : 40, 75);

            // 4. Avatar circulaire du membre parti (en niveaux de gris pour l'effet "départ")
            const avatarX = 512, avatarY = 180, avatarRadius = 100;
            ctx.save();
            ctx.beginPath();
            ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.filter = 'grayscale(70%)';
            ctx.drawImage(
                avatarImg,
                avatarX - avatarRadius,
                avatarY - avatarRadius,
                avatarRadius * 2,
                avatarRadius * 2
            );
            ctx.filter = 'none';
            ctx.restore();

            // Contour rouge/orangé autour de l'avatar
            ctx.strokeStyle = '#ff4f4f';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
            ctx.stroke();

            // 5. Textes
            ctx.textAlign = 'center';

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 36px Arial';
            ctx.fillText("AU REVOIR !", 512, 330);

            ctx.fillStyle = '#ff4f4f';
            ctx.font = 'bold 42px Arial';
            ctx.fillText(leftUserName, 512, 390);

            ctx.fillStyle = '#a0a0c0';
            ctx.font = 'italic 24px Arial';
            ctx.fillText(`A quitté : ${threadName}`, 512, 440);

            // 5bis. Avatar de la personne qui a retiré le membre (si retiré par quelqu'un)
            if (wasKicked && actorAvatarImg) {
                const actX = 90, actY = 460, actRadius = 35;
                ctx.save();
                ctx.beginPath();
                ctx.arc(actX, actY, actRadius, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();
                ctx.drawImage(
                    actorAvatarImg,
                    actX - actRadius,
                    actY - actRadius,
                    actRadius * 2,
                    actRadius * 2
                );
                ctx.restore();

                ctx.strokeStyle = '#ff4f4f';
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(actX, actY, actRadius, 0, Math.PI * 2);
                ctx.stroke();
            }

            // Texte indiquant qui a retiré la personne (ou si elle est partie seule)
            ctx.textAlign = 'left';
            ctx.fillStyle = '#ffffff';
            ctx.font = '18px Arial';
            ctx.fillText(
                wasKicked ? `Retiré par : ${actorName}` : `Parti de lui-même / elle-même`,
                wasKicked ? 140 : 90,
                455
            );

            // Date et heure en bas à droite
            ctx.textAlign = 'right';
            ctx.fillStyle = '#a0a0c0';
            ctx.font = '16px Arial';
            ctx.fillText(dateStr, 934, 450);
            ctx.fillText(timeStr, 934, 470);

            // 6. Cache temporaire et envoi
            const cachePath = path.join(__dirname, `cache/leave_${leftUserID}.png`);
            await fs.ensureDir(path.dirname(cachePath));
            await fs.outputFile(cachePath, canvas.toBuffer());

            const msg = {
                body: wasKicked
                    ? `${leftUserName} a été retiré(e) du groupe par ${actorName}.`
                    : `${leftUserName} a quitté le groupe.`,
                attachment: fs.createReadStream(cachePath)
            };

            api.sendMessage(msg, threadID, (err) => {
                if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
                if (err) console.error("Erreur d'envoi :", err);
            });

        } catch (error) {
            console.error("Erreur lors de la génération de la Leave Card :", error);
            api.sendMessage(
                wasKicked
                    ? `${leftUserName} a été retiré(e) du groupe par ${actorName}.`
                    : `${leftUserName} a quitté le groupe.`,
                threadID
            );
        }
    }
};
