// Commande GoatBot V2 — Jeu de hacker (rendu Canvas façon terminal)

const { createCanvas } = require("canvas")
const fs = require("fs-extra")
const path = require("path")

const games = new Map() // threadID_uid -> partie en cours

// ----------------------------------------------------------------------------
// Génération de centaines de cibles (préfixes de systèmes × organisations)
// ----------------------------------------------------------------------------

const SYSTEME_PREFIXES = [
  "Serveur", "Base de données", "Réseau", "Système de sécurité", "Terminal d'accès",
  "Cluster de calcul", "Nœud principal", "Passerelle réseau", "API interne",
  "Coffre-fort numérique", "Registre central", "Portail d'administration",
  "Pare-feu périphérique", "Système embarqué", "Console de contrôle"
]

const ORGANISATIONS = [
  "de la Banque Centrale", "du Pentagone", "de la Mairie", "d'une multinationale pharmaceutique",
  "d'un casino en ligne", "d'une compagnie aérienne", "d'un hôpital universitaire", "de la NASA",
  "d'un fournisseur d'électricité", "d'une chaîne de télévision", "d'un aéroport international",
  "d'une plateforme de streaming", "d'un opérateur télécom", "d'une usine automatisée",
  "d'un data center", "d'une agence de renseignement", "du métro municipal",
  "d'une centrale nucléaire", "d'un réseau social", "d'une banque en ligne",
  "d'un système de vidéosurveillance", "d'un satellite commercial", "d'une flotte de drones",
  "d'un supermarché connecté", "d'un système de vote électronique", "d'une compagnie d'assurance",
  "d'un laboratoire de recherche", "d'une plateforme de cryptomonnaie", "d'un constructeur automobile",
  "d'un fournisseur d'accès internet", "d'une agence spatiale privée", "d'un studio de jeux vidéo",
  "d'un réseau hospitalier", "d'une chaîne de restauration", "d'un port maritime",
  "d'une centrale hydroélectrique", "d'un système ferroviaire", "d'une plateforme de e-commerce",
  "d'un cabinet d'avocats", "d'une agence gouvernementale", "d'un fonds d'investissement",
  "d'un site de rencontre", "d'une chaîne hôtelière", "d'un service de livraison",
  "d'une usine chimique", "d'une base militaire", "d'un réseau de distributeurs automatiques",
  "d'un centre commercial connecté", "d'une plateforme de streaming musical", "d'un opérateur satellite"
]

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
function rand(arr) { return arr[Math.floor(Math.random() * arr.length)] }

function genererCibles() {
  const cibles = []
  for (const prefixe of SYSTEME_PREFIXES) {
    for (const org of ORGANISATIONS) {
      const niveau = randInt(1, 5)
      const gain = Math.round(300 + niveau * 1500 + randInt(0, 800))
      cibles.push({ nom: `${prefixe} ${org}`, niveau, gain })
    }
  }
  return cibles
}

const CIBLES = genererCibles()

const FIREWALLS = [
  "ICE-7", "BlackWall", "Kryptos", "Cerberus", "NullSec", "OmegaGate", "Sentinel-X",
  "GhostShield", "RedLock", "Hydra-9", "Obsidian", "VoidGuard", "Panopticon",
  "Basilisk", "Wraith", "IronCurtain", "Chimera-3", "Prometheus", "Nemesis",
  "SilentEcho", "Aegis", "Behemoth", "Shadowban", "Titan-Core", "Reaper"
]

// ----------------------------------------------------------------------------
// Utilitaires de jeu
// ----------------------------------------------------------------------------

function genCode(niveau) {
  const chars = "ABCDEF0123456789"
  const len = 3 + niveau
  let out = ""
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

function barre(p) {
  const total = 20
  const full = Math.round((p / 100) * total)
  return "[" + "█".repeat(full) + "░".repeat(total - full) + `] ${p}%`
}

function compteVide() {
  return { credits: 500, rang: 1, reussies: 0, echecs: 0, pseudo: null, inscritLe: null }
}

async function getCompte(usersData, uid) {
  const data = await usersData.get(uid)
  return { data, h: data.data?.hacker || null }
}

async function saveCompte(usersData, uid, data, h) {
  await usersData.set(uid, { data: { ...data.data, hacker: h } })
}

function masque(code, revelees) {
  return code
    .split("")
    .map((c, i) => (revelees.includes(i) ? c : "•"))
    .join(" ")
}

// ----------------------------------------------------------------------------
// Banque d'indices — chaque mission en tire un sous-ensemble au hasard
// ----------------------------------------------------------------------------

const HINT_GENERATORS = [
  code => {
    const chiffres = code.split("").filter(c => /[0-9]/.test(c)).length
    const lettres = code.length - chiffres
    return `${lettres} lettre(s) (A-F) et ${chiffres} chiffre(s)`
  },
  code => {
    const somme = code.split("").reduce((s, c) => s + parseInt(c, 16), 0)
    return `Somme hexadécimale des caractères = ${somme}`
  },
  code => `Premier caractère : ${code[0]}`,
  code => `Dernier caractère : ${code[code.length - 1]}`,
  code => {
    const max = [...code].reduce((a, b) => (parseInt(b, 16) > parseInt(a, 16) ? b : a))
    return `Le caractère de plus grande valeur hexadécimale est ${max}`
  },
  code => {
    const min = [...code].reduce((a, b) => (parseInt(b, 16) < parseInt(a, 16) ? b : a))
    return `Le caractère de plus petite valeur hexadécimale est ${min}`
  },
  code => {
    const somme = code.split("").reduce((s, c) => s + parseInt(c, 16), 0)
    return `La somme hexadécimale est ${somme % 2 === 0 ? "paire" : "impaire"}`
  },
  code => {
    const uniques = new Set(code.split("")).size
    return `Le code contient ${uniques} caractère(s) distinct(s) sur ${code.length}`
  },
  code => {
    const counts = {}
    code.split("").forEach(c => (counts[c] = (counts[c] || 0) + 1))
    const doublons = Object.values(counts).filter(n => n > 1).length
    return doublons
      ? `Le code contient ${doublons} caractère(s) qui apparaissent plusieurs fois`
      : `Aucun caractère ne se répète dans ce code`
  },
  code => {
    let adjacents = false
    for (let i = 0; i < code.length - 1; i++) if (code[i] === code[i + 1]) adjacents = true
    return adjacents
      ? `Au moins deux caractères identiques se suivent directement`
      : `Aucun caractère identique ne se suit directement`
  },
  code => {
    const xor = code.split("").reduce((x, c) => x ^ parseInt(c, 16), 0)
    return `Checksum XOR de tous les caractères = ${xor.toString(16).toUpperCase()}`
  },
  code => {
    if (code.length % 2 === 0) return `Le code a une longueur paire (${code.length} caractères)`
    return `Le caractère central est ${code[Math.floor(code.length / 2)]}`
  },
  code => {
    const chiffres = code.split("").filter(c => /[0-9]/.test(c)).length
    const pct = Math.round((chiffres / code.length) * 100)
    return `${pct}% du code est composé de chiffres`
  },
  code => {
    const voyelles = code.split("").filter(c => "ACE".includes(c)).length
    return voyelles
      ? `Le code contient ${voyelles} caractère(s) parmi A, C, E`
      : `Le code ne contient aucun des caractères A, C ou E`
  },
  code => {
    const vals = code.split("").map(c => parseInt(c, 16))
    const croissant = vals.every((v, i) => i === 0 || v >= vals[i - 1])
    const decroissant = vals.every((v, i) => i === 0 || v <= vals[i - 1])
    if (croissant) return `Les valeurs hexadécimales sont globalement croissantes`
    if (decroissant) return `Les valeurs hexadécimales sont globalement décroissantes`
    return `L'ordre des valeurs hexadécimales n'est ni croissant ni décroissant`
  },
  code => {
    const produit = code.split("").reduce((p, c) => (p * parseInt(c, 16)) % 997, 1)
    return `Produit des valeurs (mod 997) = ${produit}`
  },
  code => {
    const chiffres = code.split("").map((c, i) => (/[0-9]/.test(c) ? i + 1 : null)).filter(Boolean)
    return chiffres.length
      ? `Un chiffre se trouve en position ${rand(chiffres)}`
      : `Ce code ne contient aucun chiffre, uniquement des lettres A-F`
  }
]

function pickHints(code, count = 3) {
  const pool = [...HINT_GENERATORS]
  const chosen = []
  while (chosen.length < count && pool.length) {
    const idx = randInt(0, pool.length - 1)
    chosen.push(pool.splice(idx, 1)[0](code))
  }
  return chosen
}

function indicesCode(code) {
  const lignes = pickHints(code, 3)
  return `INDICES :\n` + lignes.map(l => `  > ${l}`).join("\n")
}

// ----------------------------------------------------------------------------
// Rendu Canvas façon terminal de hacker
// ----------------------------------------------------------------------------

const MONO_FONT = '"Courier New", monospace'

function measureCharWidth(fontSize) {
  const scratch = createCanvas(10, 10)
  const ctx = scratch.getContext("2d")
  ctx.font = `${fontSize}px ${MONO_FONT}`
  return ctx.measureText("0").width
}

function wrapMonoLine(line, maxChars) {
  if (line.length <= maxChars) return [line]
  const words = line.split(" ")
  const out = []
  let current = ""
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (test.length > maxChars && current) {
      out.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) out.push(current)
  return out
}

function lineColor(line, accent) {
  if (/⚠️|❌|⛔|🚨|🚫|💸/.test(line)) return "#ff4d4d"
  if (/✅|💰|🏅|ACCÈS|ROOT/.test(line)) return "#ffd700"
  if (/🎯|🛡️|INDICE|>/i.test(line)) return accent
  return "#d8ffe8"
}

function renderTerminal(rawText, { accent = "#00ff9d", title = "TERMINAL", width = 760 } = {}) {
  const fontSize = 19
  const lineHeight = 27
  const paddingX = 28
  const paddingTop = 76
  const paddingBottom = 26
  const maxChars = Math.floor((width - paddingX * 2) / measureCharWidth(fontSize))

  const rawLines = rawText.split("\n")
  const lines = []
  rawLines.forEach(l => wrapMonoLine(l, maxChars).forEach(w => lines.push(w)))

  const height = paddingTop + lines.length * lineHeight + paddingBottom

  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext("2d")

  // Fond dégradé sombre
  const bg = ctx.createLinearGradient(0, 0, 0, height)
  bg.addColorStop(0, "#040a07")
  bg.addColorStop(1, "#0a1712")
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)

  // Pluie de caractères décorative en fond (faible opacité)
  ctx.font = `13px ${MONO_FONT}`
  ctx.fillStyle = "rgba(0,255,157,0.05)"
  const rainChars = "01ABCDEF"
  for (let x = 6; x < width; x += 16) {
    const colLen = randInt(4, 14)
    for (let i = 0; i < colLen; i++) {
      ctx.fillText(rainChars[randInt(0, rainChars.length - 1)], x, randInt(0, height))
    }
  }

  // Barre de titre
  ctx.fillStyle = "rgba(0,0,0,0.55)"
  ctx.fillRect(8, 8, width - 16, 44)
  ;["#ff5f56", "#ffbd2e", "#27c93f"].forEach((c, i) => {
    ctx.fillStyle = c
    ctx.beginPath()
    ctx.arc(32 + i * 20, 30, 6, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.textAlign = "center"
  ctx.fillStyle = accent
  ctx.font = `bold 16px ${MONO_FONT}`
  ctx.fillText(title, width / 2, 35)

  // Bordure lumineuse
  ctx.strokeStyle = accent
  ctx.lineWidth = 2
  ctx.shadowColor = accent
  ctx.shadowBlur = 14
  ctx.strokeRect(8, 8, width - 16, height - 16)
  ctx.shadowBlur = 0

  // Texte
  ctx.textAlign = "left"
  ctx.font = `${fontSize}px ${MONO_FONT}`
  let y = paddingTop
  for (const line of lines) {
    const color = lineColor(line, accent)
    ctx.fillStyle = color
    ctx.shadowColor = color
    ctx.shadowBlur = 5
    ctx.fillText(line, paddingX, y)
    ctx.shadowBlur = 0
    y += lineHeight
  }

  // Scanlines par-dessus
  ctx.fillStyle = "rgba(0,0,0,0.08)"
  for (let sy = 0; sy < height; sy += 4) ctx.fillRect(0, sy, width, 2)

  return canvas.toBuffer()
}

async function sendTerminal(message, text, opts = {}) {
  const buffer = renderTerminal(text, opts)
  const cachePath = path.join(__dirname, "cache", `hacker_${Date.now()}_${randInt(1000, 9999)}.png`)
  await fs.ensureDir(path.dirname(cachePath))
  await fs.outputFile(cachePath, buffer)
  const sent = await message.reply({ body: "", attachment: fs.createReadStream(cachePath) })
  if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath)
  return sent
}

// ----------------------------------------------------------------------------
// Difficultés disponibles
// ----------------------------------------------------------------------------

const DIFFICULTES = {
  facile: { label: "FACILE", min: 1, max: 2, bonusEssais: 2, accent: "#4dff88" },
  moyen: { label: "MOYEN", min: 2, max: 3, bonusEssais: 0, accent: "#00ff9d" },
  difficile: { label: "DIFFICILE", min: 4, max: 5, bonusEssais: -1, accent: "#ff5f5f" }
}

const ALIAS_DIFFICULTE = {
  facile: "facile", easy: "facile", "1": "facile",
  moyen: "moyen", normal: "moyen", medium: "moyen", "2": "moyen",
  difficile: "difficile", hard: "difficile", "3": "difficile"
}

// ----------------------------------------------------------------------------
// Commande
// ----------------------------------------------------------------------------

module.exports = {
  config: {
    name: "hacker",
    aliases: ["hack", "piratage"],
    version: "3.0",
    author: "Camille uchiha",
    countDown: 5,
    role: 0,
    shortDescription: { fr: "Jeu de hacker (Canvas)", en: "Hacker game (Canvas)" },
    longDescription: {
      fr: "Mini-jeu de piratage entièrement affiché en Canvas façon terminal : crée ton compte, choisis ta difficulté parmi des centaines de scénarios, casse le firewall et décrypte le code d'accès.",
      en: "Hacking mini-game entirely rendered as Canvas terminal screens: create your account, choose a difficulty among hundreds of scenarios, break the firewall and crack the access code."
    },
    category: "game",
    guide: {
      fr:
        "{pn} créer <pseudo> — créer ton compte hacker\n" +
        "{pn} — choisir une difficulté puis lancer une mission\n" +
        "{pn} facile | moyen | difficile — lancer directement une mission à cette difficulté\n" +
        "{pn} indice — acheter un indice (100 ₿) pendant une mission\n" +
        "{pn} top — classement des hackers\n" +
        "{pn} profil — ton profil hacker\n" +
        "{pn} supprimer — supprimer ton compte"
    }
  },

  onStart: async function ({ message, event, args, usersData }) {
    const uid = event.senderID
    const key = `${event.threadID}_${uid}`
    const sub = (args[0] || "").toLowerCase()

    // --- Classement (public) ---
    if (sub === "top" || sub === "classement") {
      const all = await usersData.getAll()
      const list = all
        .filter(u => u.data?.hacker?.inscritLe)
        .sort((a, b) => (b.data.hacker.credits || 0) - (a.data.hacker.credits || 0))
        .slice(0, 10)
      if (!list.length) return sendTerminal(message, "TOP HACKERS\n\nAucun hacker enregistré.", { title: "CLASSEMENT" })
      const txt = list.map((u, i) => `${i + 1}. ${u.data.hacker.pseudo || u.name} - ${u.data.hacker.credits || 0} B (rang ${u.data.hacker.rang || 1})`).join("\n")
      return sendTerminal(message, `TOP HACKERS\n\n${txt}`, { title: "CLASSEMENT" })
    }

    // --- Création de compte ---
    if (sub === "créer" || sub === "creer" || sub === "register" || sub === "inscription") {
      const { data, h } = await getCompte(usersData, uid)
      if (h?.inscritLe) return sendTerminal(message, `COMPTE DEJA EXISTANT\n\nPseudo : ${h.pseudo}`, { title: "ERREUR", accent: "#ff5f5f" })
      const pseudo = args.slice(1).join(" ").trim().slice(0, 20)
      if (!pseudo) return sendTerminal(message, `USAGE\n\nhacker créer <pseudo>\nEx: hacker créer Gh0stByte`, { title: "SYNTAXE" })
      const all = await usersData.getAll()
      if (all.some(u => (u.data?.hacker?.pseudo || "").toLowerCase() === pseudo.toLowerCase()))
        return sendTerminal(message, `PSEUDO INDISPONIBLE\n\n"${pseudo}" est déjà utilisé.`, { title: "ERREUR", accent: "#ff5f5f" })
      const nouveau = { ...compteVide(), pseudo, inscritLe: Date.now() }
      await saveCompte(usersData, uid, data, nouveau)
      return sendTerminal(
        message,
        `COMPTE CREE\n\nPseudo : ${pseudo}\nCrédits de départ : ${nouveau.credits} B\nRang : 1\n\nTape "hacker" pour ta première intrusion.`,
        { title: "BIENVENUE" }
      )
    }

    // --- Suppression de compte ---
    if (sub === "supprimer" || sub === "delete") {
      const { data, h } = await getCompte(usersData, uid)
      if (!h?.inscritLe) return sendTerminal(message, "Tu n'as pas de compte hacker.", { title: "ERREUR", accent: "#ff5f5f" })
      const rest = { ...data.data }
      delete rest.hacker
      await usersData.set(uid, { data: rest })
      return sendTerminal(message, `COMPTE SUPPRIME\n\nTape "hacker créer <pseudo>" pour recommencer.`, { title: "AU REVOIR" })
    }

    const { data, h } = await getCompte(usersData, uid)
    if (!h?.inscritLe)
      return sendTerminal(
        message,
        `ACCES REFUSE\n\nAucun compte hacker détecté.\nCrée le tien avec :\nhacker créer <pseudo>`,
        { title: "ACCES REFUSE", accent: "#ff5f5f" }
      )

    // --- Profil ---
    if (sub === "profil" || sub === "profile") {
      return sendTerminal(
        message,
        `PROFIL HACKER\n\n` +
        `Pseudo : ${h.pseudo}\n` +
        `Rang : ${h.rang || 1}\n` +
        `Crédits : ${h.credits || 0} B\n` +
        `Intrusions réussies : ${h.reussies || 0}\n` +
        `Échecs : ${h.echecs || 0}\n` +
        `Inscrit le : ${new Date(h.inscritLe).toLocaleDateString("fr-FR")}`,
        { title: "PROFIL" }
      )
    }

    // --- Indice payant pendant une mission ---
    if (sub === "indice" || sub === "hint") {
      const partie = games.get(key)
      if (!partie) return sendTerminal(message, "Aucune intrusion en cours.", { title: "ERREUR", accent: "#ff5f5f" })
      if ((h.credits || 0) < 100) return sendTerminal(message, "Il te faut 100 B pour acheter un indice.", { title: "SOLDE INSUFFISANT", accent: "#ff5f5f" })
      const cachees = partie.code.split("").map((_, i) => i).filter(i => !partie.revelees.includes(i))
      if (!cachees.length) return sendTerminal(message, "Tout le code est déjà révélé !", { title: "INDICE" })
      partie.revelees.push(rand(cachees))
      h.credits -= 100
      await saveCompte(usersData, uid, data, h)
      return sendTerminal(
        message,
        `INDICE ACHETE (-100 B)\n\nCode : ${masque(partie.code, partie.revelees)}\nSolde : ${h.credits} B`,
        { title: "INDICE" }
      )
    }

    if (games.has(key)) return sendTerminal(message, "Une intrusion est déjà en cours. Termine-la d'abord.", { title: "ERREUR", accent: "#ff5f5f" })

    // --- Difficulté choisie directement en argument ---
    const diffKey = ALIAS_DIFFICULTE[sub]
    if (diffKey) {
      return lancerMission({ message, uid, key, h, diffKey })
    }

    // --- Aucun argument : on demande à l'utilisateur de choisir sa difficulté ---
    if (!sub) {
      const question = await sendTerminal(
        message,
        `CHOISIS TA DIFFICULTE\n\n` +
        `1) FACILE   - cibles faciles, +2 essais\n` +
        `2) MOYEN    - équilibré\n` +
        `3) DIFFICILE - gros butin, -1 essai\n\n` +
        `Réponds par le numéro ou le nom.`,
        { title: "SELECTION" }
      )
      global.GoatBot.onReply.set(question.messageID, {
        commandName: "hacker",
        type: "difficulte",
        key,
        author: uid
      })
      return
    }

    // --- Argument non reconnu ---
    return sendTerminal(
      message,
      `SOUS-COMMANDE INCONNUE : "${sub}"\n\nTape "hacker" seul pour choisir une difficulté,\nou "hacker facile/moyen/difficile" directement.`,
      { title: "ERREUR", accent: "#ff5f5f" }
    )
  },

  onReply: async function ({ message, event, Reply, usersData }) {
    // --- Étape de choix de la difficulté ---
    if (Reply.type === "difficulte") {
      if (event.senderID !== Reply.author) return sendTerminal(message, "Ce choix ne t'appartient pas.", { title: "ACCES REFUSE", accent: "#ff5f5f" })

      const rep = (event.body || "").trim().toLowerCase()
      const diffKey = ALIAS_DIFFICULTE[rep]

      if (!diffKey) {
        return sendTerminal(message, `Réponds par "facile", "moyen", "difficile" (ou 1/2/3).`, { title: "SELECTION" })
      }

      const { data, h } = await getCompte(usersData, event.senderID)
      if (!h?.inscritLe) return sendTerminal(message, `Ton compte hacker n'existe plus.\nRecrée-le avec "hacker créer <pseudo>".`, { title: "ERREUR", accent: "#ff5f5f" })
      if (games.has(Reply.key)) return sendTerminal(message, "Une intrusion est déjà en cours.", { title: "ERREUR", accent: "#ff5f5f" })

      return lancerMission({ message, uid: event.senderID, key: Reply.key, h, diffKey })
    }

    return onReplyPartie({ message, event, Reply, usersData })
  }
}

// ----------------------------------------------------------------------------
// Lance une mission de piratage pour la difficulté choisie
// ----------------------------------------------------------------------------

async function lancerMission({ message, uid, key, h, diffKey }) {
  const diff = DIFFICULTES[diffKey]
  const poolFiltre = CIBLES.filter(c => c.niveau >= diff.min && c.niveau <= diff.max)
  const cible = rand(poolFiltre.length ? poolFiltre : CIBLES)
  const firewall = rand(FIREWALLS)
  const code = genCode(cible.niveau)
  const essais = Math.max(3, 9 - cible.niveau + diff.bonusEssais)
  const revelees = [0]

  const msg =
    `TERMINAL - HACKER : ${h.pseudo}\n` +
    `DIFFICULTE : ${diff.label}\n` +
    `Connexion au réseau ... OK\n` +
    `${barre(randInt(70, 99))}\n\n` +
    `CIBLE : ${cible.nom}\n` +
    `FIREWALL : ${firewall} (niveau ${cible.niveau}/5)\n` +
    `BUTIN : ${cible.gain} B\n\n` +
    `CODE D'ACCES (${code.length} caractères hex) :\n${masque(code, revelees)}\n\n` +
    indicesCode(code) + `\n\n` +
    `Réponds à ce message avec le code complet.\n` +
    `"hacker indice" révèle un caractère (100 B).\n` +
    `Essais restants : ${essais}\n` +
    `Auto-déconnexion dans 120s.`

  const info = await sendTerminal(message, msg, { title: `MISSION - ${diff.label}`, accent: diff.accent })

  const partie = {
    messageID: info.messageID,
    author: uid,
    code,
    cible,
    firewall,
    essais,
    revelees,
    accent: diff.accent,
    timeout: setTimeout(() => {
      if (games.has(key)) {
        games.delete(key)
        message.unsend(info.messageID).catch(() => {})
        sendTerminal(
          message,
          `TRACE DETECTEE\n\nConnexion coupée par ${firewall}.\nMission "${cible.nom}" abandonnée.\nLe code était : ${code}`,
          { title: "DECONNEXION", accent: "#ff5f5f" }
        )
      }
    }, 120000)
  }
  games.set(key, partie)
  global.GoatBot.onReply.set(info.messageID, {
    commandName: "hacker",
    type: "code",
    key,
    author: uid
  })
}

// ----------------------------------------------------------------------------
// Traite la réponse au code d'une mission en cours
// ----------------------------------------------------------------------------

async function onReplyPartie({ message, event, Reply, usersData }) {
  const key = Reply.key
  const partie = games.get(key)
  if (!partie) return
  if (event.senderID !== partie.author) return sendTerminal(message, "Ce terminal n'est pas le tien.", { title: "ACCES REFUSE", accent: "#ff5f5f" })

  const essai = (event.body || "").trim().toUpperCase().replace(/\s+/g, "")
  if (!/^[A-F0-9]+$/.test(essai)) return sendTerminal(message, "Format invalide. Uniquement des caractères hex (0-9, A-F).", { title: "ERREUR", accent: "#ff5f5f" })
  if (essai.length !== partie.code.length)
    return sendTerminal(message, `Le code fait ${partie.code.length} caractères, tu en as envoyé ${essai.length}.`, { title: "ERREUR", accent: "#ff5f5f" })

  const { data, h } = await getCompte(usersData, event.senderID)
  const compte = h || compteVide()

  if (essai === partie.code) {
    clearTimeout(partie.timeout)
    games.delete(key)
    global.GoatBot.onReply.delete(partie.messageID)

    compte.credits = (compte.credits || 0) + partie.cible.gain
    compte.reussies = (compte.reussies || 0) + 1
    compte.rang = Math.max(1, Math.floor(compte.reussies / 5) + 1)
    await saveCompte(usersData, event.senderID, data, compte)

    return sendTerminal(
      message,
      `ACCES ROOT OBTENU\n\n` +
      `${barre(100)}\n` +
      `Firewall ${partie.firewall} contourné.\n` +
      `Données exfiltrées : ${partie.cible.nom}\n\n` +
      `+${partie.cible.gain} B\n` +
      `Solde : ${compte.credits} B\n` +
      `Rang : ${compte.rang}`,
      { title: "SUCCES", accent: "#ffd700" }
    )
  }

  let bons = 0
  for (let i = 0; i < partie.code.length; i++) if (essai[i] === partie.code[i]) bons++

  const restCode = []
  const restEssai = []
  for (let i = 0; i < partie.code.length; i++) {
    if (essai[i] !== partie.code[i]) { restCode.push(partie.code[i]); restEssai.push(essai[i]) }
  }
  let malPlaces = 0
  for (const c of restEssai) {
    const idx = restCode.indexOf(c)
    if (idx !== -1) { malPlaces++; restCode.splice(idx, 1) }
  }

  partie.essais--

  let bonus = ""
  const cachees = partie.code.split("").map((_, i) => i).filter(i => !partie.revelees.includes(i))
  if (partie.essais > 0 && cachees.length > 1 && partie.essais % 2 === 0) {
    partie.revelees.push(rand(cachees))
    bonus = `\n\nIndice offert : ${masque(partie.code, partie.revelees)}`
  }

  if (partie.essais <= 0) {
    clearTimeout(partie.timeout)
    games.delete(key)
    global.GoatBot.onReply.delete(partie.messageID)

    compte.echecs = (compte.echecs || 0) + 1
    compte.credits = Math.max(0, (compte.credits || 0) - 200)
    await saveCompte(usersData, event.senderID, data, compte)

    return sendTerminal(
      message,
      `INTRUSION BLOQUEE\n\n` +
      `${partie.firewall} t'a repéré.\n` +
      `Le code était : ${partie.code}\n` +
      `-200 B (frais d'anonymisation)`,
      { title: "ECHEC", accent: "#ff5f5f" }
    )
  }

  return sendTerminal(
    message,
    `CODE REFUSE\n\n` +
    `${bons}/${partie.code.length} bien placés - ${malPlaces} présent(s) mais mal placé(s)\n` +
    `Code : ${masque(partie.code, partie.revelees)}\n` +
    `Essais restants : ${partie.essais}\n` +
    `${barre(Math.round((bons / partie.code.length) * 100))}` +
    bonus,
    { title: "ACCES REFUSE", accent: partie.accent || "#00ff9d" }
  )
}
