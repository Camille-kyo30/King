// ============================================================================
// Commande GoatBot V2 : cybersecu.js
// Auteur : Camille Uchiha 🎀
// Rôle   : Mini-jeu "Centre de cybersécurité" — le joueur incarne un analyste
//          SOC qui doit réagir correctement à des alertes de sécurité,
//          rendu en Canvas façon dashboard de sécurité.
// ============================================================================

const { createCanvas } = require("canvas")
const fs = require("fs-extra")
const path = require("path")

const games = new Map() // threadID_uid -> partie en cours
const TOTAL_ROUNDS = 5

function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
function rand(arr) { return arr[Math.floor(Math.random() * arr.length)] }

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ----------------------------------------------------------------------------
// Banque de scénarios — alertes de sécurité avec 3 réactions possibles
// (bonne = index de la bonne réponse, 0-based)
// ----------------------------------------------------------------------------

const SCENARIOS = [
  {
    titre: "Email de phishing",
    alerte: "Un email prétendant venir de la banque demande de cliquer sur un lien pour \"vérifier votre compte\" sous 24h.",
    options: ["Cliquer sur le lien pour vérifier", "Signaler l'email comme phishing et le supprimer", "Transférer l'email à un collègue"],
    bonne: 1,
    explication: "Ne jamais cliquer sur un lien dans un email non sollicité. Signaler et supprimer est le réflexe correct."
  },
  {
    titre: "Clé USB inconnue",
    alerte: "Une clé USB sans étiquette est retrouvée sur le parking de l'entreprise.",
    options: ["La brancher pour voir à qui elle appartient", "La remettre au service IT sans la brancher", "La jeter à la poubelle"],
    bonne: 1,
    explication: "Les clés USB abandonnées sont un vecteur d'attaque classique (BadUSB). Ne jamais la brancher soi-même."
  },
  {
    titre: "Mot de passe faible détecté",
    alerte: "L'outil d'audit signale qu'un compte administrateur utilise le mot de passe \"Password123\".",
    options: ["Ignorer, ce n'est qu'un avertissement", "Forcer un changement immédiat vers un mot de passe fort + MFA", "Attendre le prochain audit trimestriel"],
    bonne: 1,
    explication: "Un mot de passe faible sur un compte admin est une urgence : changement immédiat et authentification multifacteur."
  },
  {
    titre: "CVE critique non patchée",
    alerte: "Une vulnérabilité critique (score 9.8) est publiée sur le logiciel utilisé par le serveur de production.",
    options: ["Planifier le correctif dans 3 mois", "Évaluer l'exposition et appliquer le correctif en urgence", "Ne rien faire, le serveur est derrière un pare-feu"],
    bonne: 1,
    explication: "Une vulnérabilité critique doit être évaluée et corrigée en priorité, un pare-feu seul ne suffit pas à s'en protéger."
  },
  {
    titre: "Pic de trafic suspect (DDoS)",
    alerte: "Le trafic entrant explose subitement, provenant de milliers d'adresses IP différentes.",
    options: ["Redémarrer le serveur", "Activer le filtrage anti-DDoS et surveiller", "Attendre que ça passe"],
    bonne: 1,
    explication: "Un afflux massif et distribué est le signe d'une attaque DDoS : le mitigateur/filtrage doit être activé rapidement."
  },
  {
    titre: "Message de rançongiciel",
    alerte: "Des fichiers sur un poste sont soudainement chiffrés avec une note demandant une rançon en cryptomonnaie.",
    options: ["Payer la rançon immédiatement", "Isoler le poste du réseau et alerter l'équipe sécurité", "Redémarrer le poste plusieurs fois"],
    bonne: 1,
    explication: "Isoler la machine infectée empêche la propagation. Payer ne garantit rien et encourage les attaquants."
  },
  {
    titre: "Faux support technique",
    alerte: "Un appel prétend venir du \"support Microsoft\" et demande un accès distant à l'ordinateur pour \"réparer un virus\".",
    options: ["Donner l'accès, ça semble légitime", "Raccrocher et vérifier via le canal officiel de l'entreprise", "Donner son mot de passe pour aller plus vite"],
    bonne: 1,
    explication: "Le support technique légitime ne vous appelle jamais à l'improviste pour demander un accès. C'est du social engineering."
  },
  {
    titre: "Macro dans un document Excel",
    alerte: "Un fichier Excel reçu par email contient une macro et demande d'\"activer le contenu\" pour s'afficher.",
    options: ["Activer le contenu pour voir le document", "Ne pas activer la macro et vérifier la source avant tout", "Renvoyer le fichier à l'expéditeur"],
    bonne: 1,
    explication: "Les macros Office sont un vecteur classique de malware. Ne jamais les activer sans être certain de la source."
  },
  {
    titre: "Tentative d'injection SQL",
    alerte: "Les logs du serveur web montrent des requêtes contenant des motifs comme ' OR '1'='1 dans les champs de connexion.",
    options: ["Ignorer, c'est probablement un faux positif", "Bloquer l'IP source et vérifier les protections (requêtes préparées, WAF)", "Redémarrer la base de données"],
    bonne: 1,
    explication: "C'est une tentative d'injection SQL. Il faut bloquer la source et s'assurer que le code utilise des requêtes préparées."
  },
  {
    titre: "Brute-force sur un compte",
    alerte: "Un compte utilisateur enregistre 200 tentatives de connexion échouées en 5 minutes.",
    options: ["Ne rien faire, les tentatives ont échoué", "Verrouiller temporairement le compte et activer le MFA", "Supprimer le compte définitivement"],
    bonne: 1,
    explication: "Un verrouillage temporaire stoppe l'attaque en cours, et le MFA empêche une prochaine tentative de réussir même avec le bon mot de passe."
  },
  {
    titre: "Appareil inconnu sur le réseau",
    alerte: "Le tableau de bord réseau détecte un nouvel appareil non enregistré connecté au Wi-Fi de l'entreprise.",
    options: ["L'ignorer, ce n'est probablement rien", "L'identifier et le déconnecter s'il n'est pas autorisé", "Redémarrer le routeur Wi-Fi"],
    bonne: 1,
    explication: "Tout appareil non identifié doit être investigué et déconnecté s'il n'a pas d'autorisation légitime."
  },
  {
    titre: "Certificat SSL expiré",
    alerte: "Le certificat SSL du site principal de l'entreprise a expiré il y a 2 jours, affichant un avertissement aux visiteurs.",
    options: ["Ignorer, ce n'est qu'esthétique", "Renouveler le certificat immédiatement", "Désactiver HTTPS en attendant"],
    bonne: 1,
    explication: "Un certificat expiré expose les utilisateurs à des risques et nuit à la confiance. Il faut le renouveler sans délai."
  },
  {
    titre: "Fausse page de connexion",
    alerte: "Un employé signale qu'une page de connexion à l'intranet ressemble à l'originale mais a une URL légèrement différente.",
    options: ["Rassurer l'employé, c'est sûrement normal", "Confirmer qu'il s'agit de phishing et alerter tous les employés", "Se connecter soi-même pour vérifier"],
    bonne: 1,
    explication: "C'est une page de phishing imitant le site légitime. Il faut alerter l'ensemble des employés pour éviter que d'autres tombent dans le piège."
  },
  {
    titre: "Keylogger détecté",
    alerte: "Un antivirus détecte un keylogger actif sur le poste d'un employé du service comptable.",
    options: ["Supprimer juste le fichier détecté", "Isoler le poste, changer tous les mots de passe utilisés dessus, investiguer", "Redémarrer le poste en mode normal"],
    bonne: 1,
    explication: "Un keylogger a pu capturer des identifiants. Il faut isoler la machine et changer tous les mots de passe potentiellement compromis."
  },
  {
    titre: "Compromission d'email professionnel (BEC)",
    alerte: "Le PDG semble envoyer un email urgent demandant un virement bancaire vers un nouveau compte, en dehors des procédures habituelles.",
    options: ["Exécuter le virement rapidement vu l'urgence", "Vérifier la demande par un autre canal avant tout paiement", "Répondre directement à l'email pour confirmer"],
    bonne: 1,
    explication: "Le \"fraude au président\" (BEC) exploite l'urgence. Toujours vérifier par un canal indépendant avant tout virement inhabituel."
  },
  {
    titre: "Bucket de stockage mal configuré",
    alerte: "Un audit révèle qu'un bucket de stockage cloud contenant des données clients est accessible publiquement sur internet.",
    options: ["Laisser tel quel, personne ne le trouvera", "Restreindre immédiatement les accès et auditer les données exposées", "Supprimer le bucket sans vérifier"],
    bonne: 1,
    explication: "Un bucket public expose potentiellement des données sensibles. Il faut restreindre l'accès en urgence puis évaluer l'impact."
  },
  {
    titre: "Élévation de privilèges suspecte",
    alerte: "Un compte utilisateur standard obtient soudainement des droits administrateur sans demande officielle.",
    options: ["Ignorer, c'est peut-être une erreur mineure", "Révoquer les droits, investiguer et vérifier les logs d'audit", "Attribuer les mêmes droits aux autres comptes pour être cohérent"],
    bonne: 1,
    explication: "Une élévation de privilèges non autorisée est un signe fort de compromission. Révocation et investigation immédiates s'imposent."
  },
  {
    titre: "Extension de navigateur douteuse",
    alerte: "Plusieurs employés ont installé une extension de navigateur populaire qui demande un accès à \"toutes les données du site visité\".",
    options: ["Laisser faire, l'extension est populaire", "Évaluer sa légitimité et la bloquer si le risque est injustifié", "Désinstaller tous les navigateurs de l'entreprise"],
    bonne: 1,
    explication: "Une extension avec des permissions larges est un risque de fuite de données. Elle doit être évaluée avant d'être autorisée en masse."
  },
  {
    titre: "Ransomware note sur imprimante réseau",
    alerte: "Toutes les imprimantes du bureau impriment en boucle une note de rançon inconnue.",
    options: ["Redémarrer chaque imprimante individuellement", "Déconnecter les imprimantes du réseau et alerter l'équipe sécurité", "Ignorer, ce ne sont que des imprimantes"],
    bonne: 1,
    explication: "Ce comportement indique une compromission du réseau. Isoler les appareils concernés limite la propagation le temps d'investiguer."
  },
  {
    titre: "Ancien employé toujours actif",
    alerte: "Un audit révèle que le compte d'un employé parti il y a 3 mois est toujours actif et a été utilisé la semaine dernière.",
    options: ["Laisser le compte actif au cas où il revienne", "Désactiver le compte immédiatement et investiguer son usage", "Changer juste le mot de passe"],
    bonne: 1,
    explication: "Un compte d'ex-employé actif est un risque majeur. Désactivation immédiate et investigation de son usage récent sont nécessaires."
  },
  {
    titre: "Application mobile non officielle",
    alerte: "Un employé a installé une version modifiée d'une application professionnelle trouvée en dehors du store officiel.",
    options: ["Ne rien dire, ça fonctionne très bien", "Désinstaller l'application et sensibiliser l'employé aux risques", "Installer la même version sur tous les appareils"],
    bonne: 1,
    explication: "Les applications hors store officiel peuvent contenir du code malveillant. Désinstallation et sensibilisation sont de mise."
  },
  {
    titre: "Faux profil sur les réseaux sociaux",
    alerte: "Un faux compte imitant le PDG de l'entreprise contacte des employés en message privé pour \"des informations confidentielles\".",
    options: ["Répondre pour voir ce qu'il veut", "Signaler le faux compte et alerter les équipes en interne", "Ignorer sans rien faire"],
    bonne: 1,
    explication: "C'est une tentative d'usurpation d'identité (social engineering). Il faut signaler le compte ET prévenir les équipes pour éviter d'autres victimes."
  },
  {
    titre: "Sauvegarde corrompue",
    alerte: "Lors d'un test de restauration, l'équipe découvre que les sauvegardes des 2 dernières semaines sont corrompues.",
    options: ["Ne rien faire, les sauvegardes plus anciennes suffisent", "Corriger le processus de sauvegarde et vérifier l'intégrité régulièrement", "Supprimer les sauvegardes corrompues sans investiguer"],
    bonne: 1,
    explication: "Des sauvegardes fiables sont essentielles en cas d'incident. Il faut corriger le processus et vérifier régulièrement leur intégrité."
  },
  {
    titre: "Session laissée ouverte",
    alerte: "Un poste de travail avec une session administrateur ouverte est laissé sans surveillance dans un espace commun.",
    options: ["Laisser tel quel, personne n'y touchera", "Verrouiller la session et rappeler la politique de verrouillage automatique", "Éteindre le poste brutalement"],
    bonne: 1,
    explication: "Une session admin ouverte est une porte grande ouverte. Verrouillage immédiat et rappel des bonnes pratiques s'imposent."
  },
  {
    titre: "Fuite de code source",
    alerte: "Une recherche révèle que du code source interne de l'entreprise a été publié par erreur sur un dépôt public.",
    options: ["Laisser le dépôt tel quel, le mal est déjà fait", "Rendre le dépôt privé, faire tourner les secrets exposés, investiguer", "Supprimer le compte du développeur concerné"],
    bonne: 1,
    explication: "Il faut retirer l'exposition, considérer tous les secrets (clés API, mots de passe) présents comme compromis, et les régénérer."
  }
]

// ----------------------------------------------------------------------------
// Rendu Canvas façon dashboard SOC (centre de sécurité)
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
  if (/❌|🚫|ERREUR|BRECHE|ECHEC/i.test(line)) return "#ff5f5f"
  if (/✅|CORRECT|NEUTRALISE|SUCCES/i.test(line)) return "#4dff88"
  if (/ALERTE|SCENARIO/i.test(line)) return "#ffd166"
  return accent
}

function renderSOC(rawText, { accent = "#38bdf8", title = "SOC - CENTRE DE CYBERSECURITE", width = 780 } = {}) {
  const fontSize = 18
  const lineHeight = 26
  const paddingX = 28
  const paddingTop = 78
  const paddingBottom = 26
  const maxChars = Math.floor((width - paddingX * 2) / measureCharWidth(fontSize))

  const rawLines = rawText.split("\n")
  const lines = []
  rawLines.forEach(l => wrapMonoLine(l, maxChars).forEach(w => lines.push(w)))

  const height = paddingTop + lines.length * lineHeight + paddingBottom

  const canvas = createCanvas(width, height)
  const ctx = canvas.getContext("2d")

  const bg = ctx.createLinearGradient(0, 0, 0, height)
  bg.addColorStop(0, "#050a14")
  bg.addColorStop(1, "#0a1524")
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, width, height)

  // Grille discrète façon dashboard
  ctx.strokeStyle = "rgba(56,189,248,0.06)"
  ctx.lineWidth = 1
  for (let gx = 0; gx < width; gx += 30) {
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, height); ctx.stroke()
  }
  for (let gy = 0; gy < height; gy += 30) {
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(width, gy); ctx.stroke()
  }

  // Barre de titre
  ctx.fillStyle = "rgba(0,0,0,0.55)"
  ctx.fillRect(8, 8, width - 16, 46)
  ctx.fillStyle = accent
  ctx.beginPath(); ctx.arc(30, 31, 6, 0, Math.PI * 2); ctx.fill()
  ctx.textAlign = "center"
  ctx.font = `bold 16px ${MONO_FONT}`
  ctx.fillText(title, width / 2, 36)

  // Bordure lumineuse
  ctx.strokeStyle = accent
  ctx.lineWidth = 2
  ctx.shadowColor = accent
  ctx.shadowBlur = 12
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
    ctx.shadowBlur = 4
    ctx.fillText(line, paddingX, y)
    ctx.shadowBlur = 0
    y += lineHeight
  }

  return canvas.toBuffer()
}

async function sendSOC(message, threadID, messageID, text, opts = {}) {
  const buffer = renderSOC(text, opts)
  const cachePath = path.join(__dirname, "cache", `cybersecu_${Date.now()}_${randInt(1000, 9999)}.png`)
  await fs.ensureDir(path.dirname(cachePath))
  await fs.outputFile(cachePath, buffer)
  const sent = await message.reply({ body: "", attachment: fs.createReadStream(cachePath) }, threadID, messageID)
  if (fs.existsSync(cachePath)) fs.unlinkSync(cachePath)
  return sent
}

// ----------------------------------------------------------------------------
// Logique de jeu
// ----------------------------------------------------------------------------

function buildScenarioText(scenario, roundNumber, score, breaches) {
  const optionsTxt = scenario.options.map((o, i) => `${i + 1}) ${o}`).join("\n")
  return (
    `RONDE ${roundNumber} / ${TOTAL_ROUNDS}    NEUTRALISEES: ${score}    BRECHES: ${breaches}\n\n` +
    `ALERTE : ${scenario.titre}\n\n` +
    `${scenario.alerte}\n\n` +
    `ACTIONS POSSIBLES :\n${optionsTxt}\n\n` +
    `Réponds avec le numéro de ton choix.`
  )
}

async function playRound({ message, event, state }) {
  const { threadID, messageID, senderID } = event
  const scenario = state.scenarios[state.round - 1]

  const text = buildScenarioText(scenario, state.round, state.score, state.breaches)
  const sent = await sendSOC(message, threadID, messageID, text, { title: "SOC - NOUVELLE ALERTE" })

  if (sent && sent.messageID) {
    global.GoatBot.onReply.set(sent.messageID, {
      commandName: "cybersecu",
      author: senderID,
      state
    })
  }
}

async function resolveRound({ message, event, Reply, choice }) {
  const { threadID, messageID, senderID } = event
  const state = Reply.state
  const scenario = state.scenarios[state.round - 1]
  const correct = choice - 1 === scenario.bonne

  if (correct) state.score++
  else state.breaches++

  const verdict = correct ? "BONNE DECISION ✅" : "MAUVAISE DECISION ❌"
  const resultText =
    `${verdict}\n\n` +
    `${scenario.titre}\n` +
    `Action correcte : ${scenario.options[scenario.bonne]}\n\n` +
    `${scenario.explication}\n\n` +
    `NEUTRALISEES: ${state.score}    BRECHES: ${state.breaches}`

  await sendSOC(message, threadID, messageID, resultText, {
    title: correct ? "INCIDENT RESOLU" : "BRECHE DE SECURITE",
    accent: correct ? "#4dff88" : "#ff5f5f"
  })

  if (state.round >= TOTAL_ROUNDS) {
    const bilan =
      `FIN DE GARDE\n\n` +
      `Incidents neutralisés : ${state.score} / ${TOTAL_ROUNDS}\n` +
      `Brèches de sécurité : ${state.breaches} / ${TOTAL_ROUNDS}\n\n` +
      (state.score > state.breaches
        ? "Excellent travail, analyste. Le réseau est resté sous contrôle."
        : state.score < state.breaches
          ? "Plusieurs incidents ont échappé à ta vigilance. Révise les bons réflexes !"
          : "Garde équilibrée. Peut mieux faire la prochaine fois.")
    return sendSOC(message, threadID, messageID, bilan, { title: "RAPPORT DE FIN DE GARDE", accent: "#38bdf8" })
  }

  state.round++
  return playRound({ message, event, state })
}

// ----------------------------------------------------------------------------
// Commande
// ----------------------------------------------------------------------------

module.exports = {
  config: {
    name: "cybersecu",
    aliases: ["secu", "soc", "cyberdefense"],
    version: "1.0",
    author: "Camille uchiha 🎀",
    countDown: 5,
    role: 0,
    shortDescription: {
      fr: "Mini-jeu de centre de cybersécurité (SOC)",
      en: "Cybersecurity SOC mini-game"
    },
    longDescription: {
      fr: "Incarne un analyste SOC : réagis correctement à 5 alertes de sécurité (phishing, ransomware, intrusions...) rendues en Canvas façon dashboard.",
      en: "Play as a SOC analyst: react correctly to 5 security alerts (phishing, ransomware, intrusions...) rendered as a Canvas dashboard."
    },
    category: "game",
    guide: {
      fr: "{pn} — démarre une garde de 5 alertes de sécurité\nRéponds par 1, 2 ou 3 pour choisir ton action.",
      en: "{pn} — starts a 5-alert security shift. Reply with 1/2/3 to choose your action."
    }
  },

  onStart: async function ({ message, event }) {
    const state = {
      round: 1,
      score: 0,
      breaches: 0,
      scenarios: shuffle(SCENARIOS).slice(0, TOTAL_ROUNDS)
    }
    await playRound({ message, event, state })
  },

  onReply: async function ({ message, event, Reply }) {
    if (Reply.author !== event.senderID) return

    const choice = parseInt((event.body || "").trim(), 10)
    const scenario = Reply.state.scenarios[Reply.state.round - 1]

    if (!choice || choice < 1 || choice > scenario.options.length) {
      return message.reply(
        `Réponds avec un numéro entre 1 et ${scenario.options.length}.`,
        event.threadID, event.messageID
      )
    }

    await resolveRound({ message, event, Reply, choice })
  }
}
