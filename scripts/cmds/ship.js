const { createCanvas, loadImage } = require("canvas");
const fetch = require("node-fetch");
const fs = require("fs-extra");
const path = require("path");
const GIFEncoder = require("gifencoder");

module.exports.config = {
  name: "ship",
  version: "4.1",
  author: "Camille Uchiha",
  countDown: 5,
  role: 0,
  description: "Ship animé avec collage et fond artistique",
  category: "fun",
  guide: {
    fr: "{pn} @personne1 @personne2 : ship deux membres\n"
      + "{pn} @personne : te ship avec la personne mentionnée\n"
      + "{pn} : ship aléatoire dans le groupe"
  }
};

// Fond en collage : image gauche / image droite
const bgPairs = [
  [
    "https://i.ibb.co/S4233XwD/c594f98b2035e253c71e243c1ccc6be2.jpg",
    "https://i.ibb.co/qMF1QJrd/4fb1f7476ba5b2869eafb228fe61a88d.jpg"
  ],
  [
    "https://i.ibb.co/bRNs2YX3/767872170-27426160170399463-3886866646206597224-n-jpg-stp-dst-jpg-p480x480-tt6-nc-cat-107-ccb-1-7.jpg",
    "https://i.ibb.co/PZKnFFL5/768172530-1032028612775334-5935273696285647065-n-jpg-stp-dst-jpg-p480x480-tt6-nc-cat-104-ccb-1-7-n.jpg"
  ]
];

function getShipPercent(id1, id2) {
  const combined = [id1, id2].sort().join("-");
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash << 5) - hash + combined.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 101;
}

function getPhrase(percent) {
  const tiers = {
    90: ["Un amour destiné à durer pour toujours 💍", "Le coup de foudre parfait ✨", "Fait l'un pour l'autre 💘"],
    70: ["Une belle histoire s'écrit ici 💕", "Ça sent bon l'amour 🌸", "Un duo qui a tout pour marcher 💞"],
    50: ["Il y a une étincelle... 🌱", "À surveiller de près 👀", "Le potentiel est là 💭"],
    30: ["Amis... pour l'instant ? 😅", "Pas gagné mais pas perdu 🤏", "Zone grise totale 🌫️"],
    0: ["Aucune alchimie détectée 💀", "Restez juste amis, promis 🙅", "Ça va être compliqué... 🚫"]
  };
  const keys = [90, 70, 50, 30, 0];
  const tier = keys.find(k => percent >= k);
  const options = tiers[tier];
  return options[Math.floor(Math.random() * options.length)];
}

function getAvatarUrl(id) {
  return `https://graph.facebook.com/${id}/picture?width=512&height=512&access_token=6628568379|c1e620fa708a1d5696fb991c1bde5662`;
}

async function drawCircleImage(ctx, img, x, y, size) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, x, y, size, size);
  ctx.restore();
}

module.exports.onStart = async function ({ api, event, usersData }) {
  const { threadID, messageID, senderID, mentions } = event;
  const mentionIDs = Object.keys(mentions);

  let id1, id2;

  if (mentionIDs.length >= 2) {
    id1 = mentionIDs[0];
    id2 = mentionIDs[1];
  } else if (mentionIDs.length === 1) {
    id1 = senderID;
    id2 = mentionIDs[0];
  } else {
    const threadInfo = await api.getThreadInfo(threadID);
    const members = threadInfo.participantIDs.filter(id => id !== senderID);
    if (members.length === 0) {
      return api.sendMessage("❌ Pas assez de membres pour un ship aléatoire.", threadID, messageID);
    }
    id1 = senderID;
    id2 = members[Math.floor(Math.random() * members.length)];
  }

  if (id1 === id2) {
    return api.sendMessage("😏 Tu veux te ship avec toi-même ? Un peu de narcissisme ne fait pas de mal !", threadID, messageID);
  }

  const name1 = await usersData.getName(id1).catch(() => "Inconnu");
  const name2 = await usersData.getName(id2).catch(() => "Inconnu");
  const percent = getShipPercent(id1, id2);
  const phrase = getPhrase(percent);

  api.sendMessage("💘 Génération du collage en cours...", threadID);

  try {
    const [avatar1, avatar2] = await Promise.all([
      loadImage(getAvatarUrl(id1)),
      loadImage(getAvatarUrl(id2))
    ]);

    const [bgLeftUrl, bgRightUrl] = bgPairs[Math.floor(Math.random() * bgPairs.length)];
    const [bgLeft, bgRight] = await Promise.all([
      loadImage(bgLeftUrl),
      loadImage(bgRightUrl)
    ]);

    const width = 800;
    const height = 500;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    const encoder = new GIFEncoder(width, height);
    const cacheDir = path.join(__dirname, "cache");
    fs.ensureDirSync(cacheDir);
    const filePath = path.join(cacheDir, `ship_${id1}_${id2}.gif`);
    const stream = fs.createWriteStream(filePath);
    encoder.createReadStream().pipe(stream);
    encoder.start();
    encoder.setRepeat(0);
    encoder.setDelay(90);
    encoder.setQuality(10);

    const totalFrames = 28;
    const avatarSize = 150;

    for (let frame = 0; frame < totalFrames; frame++) {
      const t = frame / totalFrames;

      // Fond en collage avec léger zoom/pan animé (parallax)
      const zoom = 1.08 + Math.sin(frame / 6) * 0.02;
      const panX = Math.sin(frame / 10) * 8;

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, width / 2, height);
      ctx.clip();
      ctx.drawImage(bgLeft, -panX - (width / 2 * (zoom - 1)) / 2, -(height * (zoom - 1)) / 2, (width / 2) * zoom, height * zoom);
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.rect(width / 2, 0, width / 2, height);
      ctx.clip();
      ctx.drawImage(bgRight, width / 2 + panX - (width / 2 * (zoom - 1)) / 2, -(height * (zoom - 1)) / 2, (width / 2) * zoom, height * zoom);
      ctx.restore();

      // Ligne de séparation
      ctx.save();
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.stroke();
      ctx.restore();

      // Voile dégradé pour lisibilité du texte
      const overlay = ctx.createLinearGradient(0, height - 160, 0, height);
      overlay.addColorStop(0, "rgba(0,0,0,0)");
      overlay.addColorStop(1, "rgba(0,0,0,0.65)");
      ctx.fillStyle = overlay;
      ctx.fillRect(0, height - 160, width, 160);

      // Avatars réels en médaillon
      const pulse = 1 + Math.sin(frame / 4) * 0.04;
      const size = avatarSize * pulse;
      const offset = (size - avatarSize) / 2;
      const avY = 40 - offset;
      const cxLeft = width / 4;
      const cxRight = (width * 3) / 4;
      const cy = 40 + avatarSize / 2;

      // Halo lumineux pulsant derrière chaque avatar
      const haloPulse = 1 + Math.sin(frame / 5) * 0.12;
      [cxLeft, cxRight].forEach(cx => {
        const halo = ctx.createRadialGradient(cx, cy, size / 2 * 0.6, cx, cy, size / 2 * 1.6 * haloPulse);
        halo.addColorStop(0, "rgba(255,105,180,0.55)");
        halo.addColorStop(1, "rgba(255,105,180,0)");
        ctx.save();
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(cx, cy, size / 2 * 1.6 * haloPulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 12;
      await drawCircleImage(ctx, avatar1, width / 4 - size / 2, avY, size);
      await drawCircleImage(ctx, avatar2, (width * 3) / 4 - size / 2, avY, size);
      ctx.restore();

      // Anneau doré animé (rotation) + liseré blanc
      const ringGrad = ctx.createLinearGradient(0, cy - size / 2, 0, cy + size / 2);
      ringGrad.addColorStop(0, "#ffd76a");
      ringGrad.addColorStop(1, "#ff5da2");
      ctx.lineWidth = 6;
      ctx.strokeStyle = ringGrad;
      ctx.beginPath();
      ctx.arc(cxLeft, cy, size / 2 + 2, (frame / 15) * Math.PI, (frame / 15) * Math.PI + Math.PI * 1.7);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cxRight, cy, size / 2 + 2, -(frame / 15) * Math.PI, -(frame / 15) * Math.PI + Math.PI * 1.7);
      ctx.stroke();

      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.arc(cxLeft, cy, size / 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cxRight, cy, size / 2, 0, Math.PI * 2);
      ctx.stroke();

      // Cœur central battant
      const heartScale = 1 + Math.sin(frame / 3) * 0.15;
      ctx.save();
      ctx.translate(width / 2, 40 + avatarSize / 2);
      ctx.scale(heartScale, heartScale);
      ctx.font = "70px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("💖", 0, 0);
      ctx.restore();

      // Cœurs & étincelles flottants
      const particles = ["💗", "💫", "✨", "💕"];
      for (let i = 0; i < 8; i++) {
        const heartT = (t + i / 8) % 1;
        const hx = width / 2 + Math.sin((frame + i * 15) / 7) * 120;
        const hy = height - 180 - heartT * 170;
        ctx.save();
        ctx.globalAlpha = (1 - heartT) * 0.9;
        ctx.font = `${14 + i * 3}px Arial`;
        ctx.fillText(particles[i % particles.length], hx, hy);
        ctx.restore();
      }

      // Phrase + pourcentage
      const textAlpha = Math.min(1, frame / 8);
      ctx.save();
      ctx.globalAlpha = textAlpha;
      ctx.font = "bold 26px Arial";
      ctx.textAlign = "center";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(phrase, width / 2, height - 78);
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = textAlpha;
      ctx.font = "bold 48px Arial";
      ctx.textAlign = "center";
      const pctGrad = ctx.createLinearGradient(width / 2 - 60, 0, width / 2 + 60, 0);
      pctGrad.addColorStop(0, "#ffd76a");
      pctGrad.addColorStop(0.5, "#ff5da2");
      pctGrad.addColorStop(1, "#ff2e63");
      ctx.strokeStyle = "rgba(0,0,0,0.6)";
      ctx.lineWidth = 6;
      ctx.strokeText(`${percent}%`, width / 2, height - 32);
      ctx.fillStyle = pctGrad;
      ctx.fillText(`${percent}%`, width / 2, height - 32);
      ctx.restore();

      encoder.addFrame(ctx);
    }

    encoder.finish();

    await new Promise((resolve, reject) => {
      stream.on("finish", resolve);
      stream.on("error", reject);
    });

    const msg = `💘 ${name1} ❤️ ${name2}\n\n${phrase}\nCompatibilité : ${percent}%`;

    await api.sendMessage(
      { body: msg, attachment: fs.createReadStream(filePath) },
      threadID,
      () => fs.unlinkSync(filePath),
      messageID
    );
  } catch (err) {
    console.error(err);
    return api.sendMessage(
      `💘 ${name1} ❤️ ${name2}\n\n${phrase}\nCompatibilité : ${percent}%\n\n(⚠️ Impossible de générer le collage)`,
      threadID,
      messageID
    );
  }
};
