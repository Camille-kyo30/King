let createCanvas;
try {
  ({ createCanvas } = require("canvas"));
} catch (e) {
  console.error("[fakecalc] Le module 'canvas' n'est pas installe. Lance: npm install canvas");
}

const fs = require("fs-extra");
const path = require("path");
const {
  drawRoundedRect,
  FRAME,
  startPhoneFrame,
  drawStatusBar,
  drawHomeBar,
  endPhoneFrame
} = require("./utils/phoneUtils");

// ---- Evaluateur mathematique securise (pas d'eval JS, parsing manuel) ----
// Supporte : + - * / % ^ () et nombres decimaux, gere la priorite des operateurs

function tokenize(expr) {
  const tokens = [];
  let i = 0;
  while (i < expr.length) {
    const c = expr[i];
    if (c === " ") { i++; continue; }
    if (/[0-9.]/.test(c)) {
      let num = "";
      while (i < expr.length && /[0-9.]/.test(expr[i])) { num += expr[i]; i++; }
      tokens.push({ type: "num", value: parseFloat(num) });
      continue;
    }
    if ("+-*/%^()".includes(c)) {
      tokens.push({ type: "op", value: c });
      i++;
      continue;
    }
    throw new Error(`Caractere invalide: ${c}`);
  }
  return tokens;
}

function parseExpression(tokens) {
  let pos = 0;

  function peek() { return tokens[pos]; }
  function consume() { return tokens[pos++]; }

  function parsePrimary() {
    const t = peek();
    if (!t) throw new Error("Expression incomplete");
    if (t.type === "num") { consume(); return t.value; }
    if (t.type === "op" && t.value === "(") {
      consume();
      const val = parseAddSub();
      const close = consume();
      if (!close || close.value !== ")") throw new Error("Parenthese manquante");
      return val;
    }
    if (t.type === "op" && t.value === "-") {
      consume();
      return -parsePrimary();
    }
    throw new Error("Expression invalide");
  }

  function parsePow() {
    let left = parsePrimary();
    while (peek() && peek().type === "op" && peek().value === "^") {
      consume();
      const right = parsePrimary();
      left = Math.pow(left, right);
    }
    return left;
  }

  function parseMulDiv() {
    let left = parsePow();
    while (peek() && peek().type === "op" && ["*", "/", "%"].includes(peek().value)) {
      const op = consume().value;
      const right = parsePow();
      if (op === "*") left = left * right;
      else if (op === "/") {
        if (right === 0) throw new Error("Division par zero");
        left = left / right;
      } else left = left % right;
    }
    return left;
  }

  function parseAddSub() {
    let left = parseMulDiv();
    while (peek() && peek().type === "op" && ["+", "-"].includes(peek().value)) {
      const op = consume().value;
      const right = parseMulDiv();
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }

  const result = parseAddSub();
  if (pos !== tokens.length) throw new Error("Expression invalide");
  return result;
}

function safeEval(expr) {
  const tokens = tokenize(expr);
  return parseExpression(tokens);
}

// ---- Rendu visuel dans le cadre de telephone ----

async function generateCalcScreen(expression, result, error) {
  const { canvas, ctx } = startPhoneFrame(createCanvas);

  ctx.fillStyle = "#000";
  ctx.fillRect(FRAME.screenX, FRAME.screenY, FRAME.screenW, FRAME.screenH);

  drawStatusBar(ctx);

  const displayTop = FRAME.screenY + 40;
  const displayH = 220;

  ctx.textAlign = "right";
  ctx.fillStyle = "#9CA3AF";
  ctx.font = "24px Arial";
  const exprDisplay = expression.length > 22 ? expression.slice(-22) : expression;
  ctx.fillText(exprDisplay, FRAME.screenX + FRAME.screenW - 24, displayTop + 90);

  ctx.fillStyle = error ? "#F87171" : "#fff";
  ctx.font = "300 52px Arial";
  const resultText = error ? "Erreur" : formatResult(result);
  ctx.fillText(resultText, FRAME.screenX + FRAME.screenW - 24, displayTop + 150);

  // Grille de boutons (visuel uniquement, juste pour le style)
  const buttons = [
    ["C", "()", "%", "/"],
    ["7", "8", "9", "*"],
    ["4", "5", "6", "-"],
    ["1", "2", "3", "+"],
    ["0", ".", "=", "^"]
  ];

  const btnAreaTop = displayTop + displayH;
  const btnSize = 78;
  const btnGapX = (FRAME.screenW - 40 - btnSize * 4) / 3 + btnSize;
  const btnGapY = 92;

  buttons.forEach((row, ri) => {
    row.forEach((label, ci) => {
      const x = FRAME.screenX + 20 + ci * btnGapX;
      const y = btnAreaTop + ri * btnGapY;

      let bg = "#2C2C2E";
      if (["/", "*", "-", "+", "=", "^"].includes(label)) bg = "#FF9500";
      if (["C", "()", "%"].includes(label)) bg = "#A5A5A5";

      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.arc(x + btnSize / 2, y + btnSize / 2, btnSize / 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = ["C", "()", "%"].includes(label) ? "#000" : "#fff";
      ctx.font = "500 24px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label, x + btnSize / 2, y + btnSize / 2 + 2);
      ctx.textBaseline = "alphabetic";
    });
  });

  drawHomeBar(ctx);
  endPhoneFrame(ctx);

  return canvas;
}

function formatResult(result) {
  if (Number.isInteger(result)) return String(result);
  return String(Math.round(result * 1e8) / 1e8);
}

module.exports = {
  config: {
    name: "fakecalc",
    version: "1.0",
    author: "Camille Uchiha",
    countDown: 3,
    role: 0,
    shortDescription: "Vraie calculatrice dans le portable",
    longDescription: "Calcule reellement une expression mathematique et l'affiche dans le cadre du telephone",
    category: "fun",
    guide: {
      en: "{pn} <expression> : exemple {pn} (12+8)*3/2"
    }
  },

  onStart: async function ({ message, args }) {
    try {
      if (!createCanvas) {
        return message.reply("Erreur: le module 'canvas' n'est pas installe sur le bot.");
      }

      const expression = args.join(" ").trim();
      if (!expression) {
        return message.reply("Usage: fakecalc <expression>\nExemple: fakecalc (12+8)*3/2");
      }

      let result, error = false;
      try {
        result = safeEval(expression);
        if (!isFinite(result)) throw new Error("Resultat invalide");
      } catch (e) {
        error = true;
      }

      const canvas = await generateCalcScreen(expression, result, error);

      const cacheDir = path.join(__dirname, "cache");
      await fs.ensureDir(cacheDir);
      const filePath = path.join(cacheDir, `fakecalc_${Date.now()}.png`);
      fs.writeFileSync(filePath, canvas.toBuffer());

      await message.reply({
        body: error ? "Expression invalide." : `Resultat: ${formatResult(result)}`,
        attachment: fs.createReadStream(filePath)
      });

      fs.unlinkSync(filePath);
    } catch (err) {
      console.error("[fakecalc] Erreur:", err);
      message.reply("Une erreur est survenue. Regarde la console du bot.");
    }
  }
};
