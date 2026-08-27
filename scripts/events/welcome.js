const { createCanvas, loadImage } = require('canvas');
const fs = require('fs-extra');
const axios = require('axios');
const path = require('path');

module.exports = {
    config: {
        name: "welcome",
        version: "1.3.0",
        author: "Camille uchiha 🎀",
        countDown: 5,
        role: 0,
        description: "Envoie une carte de bienvenue Canvas (avec la photo de profil) lorsqu'un utilisateur rejoint le groupe",
        category: "events",
        guide: {
            en: "{pn} s'active automatiquement quand quelqu'un rejoint le groupe."
        }
    },

    onStart: async function () {},

    // GoatBot appelle onEvent pour tous les événements du thread
    onEvent: async function ({ api, event, threadsData, usersData }) {
        if (event.logMessageType !== "log:subscribe") return;

        const { threadID, logMessageData, author } = event;
        const { addedParticipants } = logMessageData;

        // Récupérer le nom du groupe pour l'afficher sur le Canvas
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

        // Récupérer le nom de la personne qui a ajouté le·s nouveau·x membre·s
        let inviterName = "quelqu'un";
        let inviterAvatarImg = null;
        try {
            const inviterInfo = await usersData.get(author);
            inviterName = (inviterInfo && inviterInfo.name) || inviterName;

            const inviterAvatarUrl = `https://graph.facebook.com/${author}/picture?width=200&height=200&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
            const responseInviterAvatar = await axios.get(inviterAvatarUrl, {
                responseType: 'arraybuffer',
                maxRedirects: 5
            });
            inviterAvatarImg = await loadImage(Buffer.from(responseInviterAvatar.data));
        } catch (e) {
            console.error("Impossible de récupérer les infos de l'auteur de l'ajout :", e);
        }

        // Date et heure formatées en français
        const now = new Date();
        const dateStr = now.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
        const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

        for (let participant of addedParticipants) {
            const userID = participant.userFbId;
            const fullName = participant.fullName;

            // Ignorer si c'est le bot lui-même qui rejoint
            if (userID == api.getCurrentUserID()) continue;

            try {
                // 1. Récupération de l'avatar Facebook haute résolution
                // Correction : il manquait "https://graph." et le "$" du template literal
                const avatarUrl = `https://graph.facebook.com/${userID}/picture?width=500&height=500&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;

                const responseAvatar = await axios.get(avatarUrl, {
                    responseType: 'arraybuffer',
                    // Certains CDN redirigent, on suit les redirections
                    maxRedirects: 5
                });
                const avatarImg = await loadImage(Buffer.from(responseAvatar.data));

                // 2. Initialisation de la zone de dessin (1024x500)
                const canvas = createCanvas(1024, 500);
                const ctx = canvas.getContext('2d');

                // 3. Image de fond personnalisée
                const backgroundUrl = "https://i.ibb.co/jkgq4Nzt/a8364c99e94a.jpg";
                const responseBg = await axios.get(backgroundUrl, {
                    responseType: 'arraybuffer',
                    maxRedirects: 5
                });
                const bgImg = await loadImage(Buffer.from(responseBg.data));

                // On dessine l'image en "cover" pour qu'elle remplisse tout le canvas
                // sans être déformée, quel que soit son ratio d'origine
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

                // Voile sombre semi-transparent par-dessus pour garder les textes lisibles
                ctx.fillStyle = 'rgba(10, 8, 20, 0.55)';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Cercles décoratifs néon en arrière-plan
                ctx.fillStyle = 'rgba(122, 79, 240, 0.15)';
                ctx.beginPath(); ctx.arc(900, 100, 200, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = 'rgba(0, 242, 254, 0.1)';
                ctx.beginPath(); ctx.arc(100, 400, 150, 0, Math.PI * 2); ctx.fill();

                // 3bis. Photo de profil du groupe + nom du groupe (en haut à gauche)
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

                    ctx.strokeStyle = '#00f2fe';
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

                // 4. Masque circulaire + dessin de l'avatar (X: 512, Y: 180, rayon 100)
                const avatarX = 512, avatarY = 180, avatarRadius = 100;
                ctx.save();
                ctx.beginPath();
                ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
                ctx.closePath();
                ctx.clip();
                // On dessine l'image exactement dans le carré englobant le cercle,
                // ce qui garantit qu'elle est bien centrée peu importe son ratio d'origine
                ctx.drawImage(
                    avatarImg,
                    avatarX - avatarRadius,
                    avatarY - avatarRadius,
                    avatarRadius * 2,
                    avatarRadius * 2
                );
                ctx.restore();

                // Contour lumineux autour de l'avatar
                ctx.strokeStyle = '#00f2fe';
                ctx.lineWidth = 6;
                ctx.beginPath();
                ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2);
                ctx.stroke();

                // 5. Textes
                ctx.textAlign = 'center';

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 36px Arial';
                ctx.fillText("BIENVENUE !", 512, 330);

                ctx.fillStyle = '#00f2fe';
                ctx.font = 'bold 42px Arial';
                ctx.fillText(fullName, 512, 390);

                ctx.fillStyle = '#a0a0c0';
                ctx.font = 'italic 24px Arial';
                ctx.fillText(`Bienvenue dans : ${threadName}`, 512, 440);

                // 5bis. Petit avatar de la personne qui a ajouté le membre (en bas à gauche)
                if (inviterAvatarImg) {
                    const invX = 90, invY = 460, invRadius = 35;
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(invX, invY, invRadius, 0, Math.PI * 2);
                    ctx.closePath();
                    ctx.clip();
                    ctx.drawImage(
                        inviterAvatarImg,
                        invX - invRadius,
                        invY - invRadius,
                        invRadius * 2,
                        invRadius * 2
                    );
                    ctx.restore();

                    ctx.strokeStyle = '#7a4ff0';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(invX, invY, invRadius, 0, Math.PI * 2);
                    ctx.stroke();
                }

                // Texte "Ajouté par" à côté du petit avatar
                ctx.textAlign = 'left';
                ctx.fillStyle = '#ffffff';
                ctx.font = '18px Arial';
                ctx.fillText(`Ajouté par : ${inviterName}`, 140, 455);

                // Date et heure en bas à droite
                ctx.textAlign = 'right';
                ctx.fillStyle = '#a0a0c0';
                ctx.font = '16px Arial';
                ctx.fillText(dateStr, 934, 450);
                ctx.fillText(timeStr, 934, 470);

                // 6. Cache temporaire et envoi
                const cachePath = path.join(__dirname, `cache/welcome_${userID}.png`);
                await fs.ensureDir(path.dirname(cachePath));
                await fs.outputFile(cachePath, canvas.toBuffer());

                const msg = {
                    body: `Bienvenue ${fullName} ! Prends soin de lire le règlement du groupe.`,
                    attachment: fs.createReadStream(cachePath)
                };

                api.sendMessage(msg, threadID, (err) => {
                    if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath);
                    if (err) console.error("Erreur d'envoi :", err);
                });

            } catch (error) {
                console.error("Erreur lors de la génération de la Welcome Card :", error);
                api.sendMessage(`Bienvenue ${fullName} dans le groupe !`, threadID);
            }
        }
    }
};
