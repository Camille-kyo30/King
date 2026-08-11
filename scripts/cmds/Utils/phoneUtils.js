// phoneUtils.js
// Fonctions partagees pour dessiner un cadre de telephone realiste,
// utilisees par fakephone.js et fakeinbox.js

function drawRoundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawWifiIcon(ctx, x, y, size) {
  ctx.save();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    const r = size * (0.35 + i * 0.3);
    ctx.beginPath();
    ctx.arc(x, y + size * 0.4, r, Math.PI * 1.25, Math.PI * 1.75);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(x, y + size * 0.4, 2, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.restore();
}

function drawBatteryIcon(ctx, x, y, w, h, percent) {
  ctx.save();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1.5;
  drawRoundedRect(ctx, x, y, w, h, 3);
  ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.fillRect(x + w, y + h * 0.3, 2.5, h * 0.4);

  const fillW = (w - 4) * (percent / 100);
  ctx.fillStyle = percent > 20 ? "#4ADE80" : "#F87171";
  ctx.fillRect(x + 2, y + 2, fillW, h - 4);
  ctx.restore();
}

// Dimensions standard partagees par tous les ecrans
const FRAME = {
  width: 440,
  height: 900,
  screenX: 12,
  screenY: 12,
  get screenW() { return this.width - 24; },
  get screenH() { return this.height - 24; }
};

// Dessine le cadre exterieur (bezel) + retourne le contexte pret pour dessiner l'ecran (deja clippe)
function startPhoneFrame(createCanvas) {
  const canvas = createCanvas(FRAME.width, FRAME.height);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#0a0a0a";
  drawRoundedRect(ctx, 0, 0, FRAME.width, FRAME.height, 48);
  ctx.fill();

  ctx.save();
  drawRoundedRect(ctx, FRAME.screenX, FRAME.screenY, FRAME.screenW, FRAME.screenH, 38);
  ctx.clip();

  return { canvas, ctx };
}

// Dessine la barre de statut + encoche en haut de l'ecran (a appeler apres avoir rempli le fond)
function drawStatusBar(ctx, batteryPercent = 87) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  ctx.fillStyle = "#fff";
  ctx.font = "600 15px Arial";
  ctx.textAlign = "left";
  ctx.fillText(timeStr, FRAME.screenX + 24, FRAME.screenY + 34);

  drawWifiIcon(ctx, FRAME.screenX + FRAME.screenW - 70, FRAME.screenY + 20, 12);
  drawBatteryIcon(ctx, FRAME.screenX + FRAME.screenW - 50, FRAME.screenY + 22, 26, 13, batteryPercent);

  ctx.fillStyle = "#0a0a0a";
  drawRoundedRect(ctx, FRAME.screenX + FRAME.screenW / 2 - 55, FRAME.screenY, 110, 26, 13);
  ctx.fill();
}

// Barre home en bas de l'ecran
function drawHomeBar(ctx) {
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  drawRoundedRect(ctx, FRAME.screenX + FRAME.screenW / 2 - 60, FRAME.screenY + FRAME.screenH - 12, 120, 4, 2);
  ctx.fill();
}

// A appeler a la toute fin pour fermer le clip ouvert par startPhoneFrame
function endPhoneFrame(ctx) {
  ctx.restore();
}

module.exports = {
  drawRoundedRect,
  drawWifiIcon,
  drawBatteryIcon,
  FRAME,
  startPhoneFrame,
  drawStatusBar,
  drawHomeBar,
  e
  ndPhoneFrame
};
