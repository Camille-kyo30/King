/**
 * 🍓━━━━━━━━🍓
 * COMMANDE: detective.js
 * Jeu d enquete a scenarios generes proceduralement.
 * Auteur: Camille Uchiha 🍓 | Bot: Mini Bot
 * 🍓━━━━━━━━🍓
 *
 * Principe:
 *  - Chaque affaire combine victime x suspects (ordre) x arme x lieu x mobile x moment x indices
 *  - Le nombre total de scenarios distincts est calcule dynamiquement au chargement
 *    et largement superieur a plusieurs centaines de millions (voir computeTotalScenarios)
 *  - Etat de partie garde en memoire par thread (une enquete active a la fois par salon)
 */

const path = require("path");
const fs = require("fs");

// ============================================================
// 1. BANQUES DE DONNEES
// ============================================================

const VICTIMES = [
  "Monsieur Girard", "Madame Blanchet", "Baron Castellane", "Amiral Roquefort",
  "Professeur Novak", "Comtesse Delarue", "Docteur Manet", "Colonel Ferrand",
  "Madame Voss", "Monsieur Levesque", "Notaire Brunel", "Duchesse Ardant",
  "Capitaine Rieux", "Madame Corbin", "Monsieur Fabre", "Juge Chastain",
  "Marquise Odette", "Monsieur Serrurier", "Docteur Halvard", "Madame Quesnel",
  "Chevalier Tancrede", "Monsieur Ecrivain", "Madame Salvatori", "Inspecteur Rambeau"
];

const SUSPECTS = [
  "Le jardinier", "La gouvernante", "Le majordome", "Le chauffeur",
  "La cuisiniere", "Le neveu", "La niece prodigue", "Le associe daffaires",
  "La veuve remariee", "Le medecin de famille", "Le antiquaire", "La bibliothecaire",
  "Le agent immobilier", "La femme de chambre", "Le horloger", "Le musicien invite",
  "La journaliste", "Le avocat de la famille", "La comptable", "Le garde du corps",
  "La photographe", "Le sommelier", "La styliste", "Le pilote prive",
  "La restauratrice de tableaux", "Le collectionneur rival", "La secretaire particuliere",
  "Le pecheur du village", "La fleuriste", "Le architecte", "La comedienne",
  "Le professeur de musique", "La infirmiere de nuit", "Le vigile", "La couturiere",
  "Le libraire", "La cartographe", "Le facteur", "La voisine curieuse", "Le taxidermiste"
];

const ARMES = [
  "chandelier en bronze", "corde de piano", "flacon de poison rare", "coupe papier ancien",
  "presse livre en marbre", "revolver de collection", "hachette de jardin", "seringue vide",
  "ceinture de peignoir", "trophee de chasse", "canne a pommeau lourd", "bouteille de vin brisee",
  "fil electrique denude", "pierre du jardin", "aiguille a tricoter", "clef anglaise",
  "extrait de digitale", "morceau de verre brise", "corde a rideaux", "hamecon de peche",
  "pied de statuette", "tisonnier de cheminee", "boite a bijoux lourde", "rasoir droit",
  "sac de sable", "epingle a chapeau", "gant empoisonne", "carafe en cristal",
  "vase Ming replique", "instrument chirurgical"
];

const LIEUX = [
  "bibliotheque du manoir", "serre botanique", "cave a vin", "salon de musique",
  "cuisine du sous sol", "bureau prive", "terrasse est", "chambre bleue",
  "atelier de peinture", "ecurie", "orangerie", "grenier poussiereux",
  "salle a manger", "quai prive", "pavillon de chasse", "chapelle desaffectee",
  "verger", "garage a voitures anciennes", "fumoir", "salle de bal",
  "escalier de service", "jardin de roses", "cabinet de curiosites", "buanderie",
  "belvedere", "labyrinthe de haies", "roseraie fermee", "cellier"
];

const MOBILES = [
  "heritage conteste", "dette de jeu cachee", "chantage decouvert", "amour non partage",
  "vengeance ancienne", "secret de famille menace", "rivalite professionnelle", "fraude financiere",
  "jalousie amoureuse", "testament modifie", "trahison commerciale", "honneur bafoue",
  "peur du scandale", "assurance vie generosite", "manuscrit vole", "brevet dispute",
  "liaison secrete devoilee", "dette de honneur", "faux tableau demasque", "promesse rompue",
  "reputation a proteger", "part de societe convoitee", "lettre compromettante", "collection volee",
  "adoption cachee"
];

const MOMENTS = [
  "aube", "matinee", "midi", "debut apres midi", "fin apres midi", "crepuscule",
  "debut de soiree", "diner", "apres minuit", "petites heures", "orage nocturne", "brouillard matinal"
];

// Gabarits d indices, {S}=suspect, {L}=lieu, {A}=arme, {M}=moment
const GABARITS_INDICES = [
  "Un temoin affirme avoir vu {S} pres de {L} vers {M}",
  "Des traces menant a {L} correspondent a des chaussures inhabituelles",
  "Le {A} manquant a ete localise non loin de {L}",
  "{S} a change de version des faits concernant la soiree",
  "Une odeur particuliere flotte encore pres du {L}",
  "Un carnet retrouve mentionne un rendez vous a {M}",
  "{S} possede une motivation liee au mobile de laffaire",
  "Des empreintes partielles ont ete relevees sur le {A}",
  "Le personnel de maison confirme une dispute pres du {L}",
  "Une lettre inachevee evoque une rencontre a {M}",
  "{S} pretend avoir un alibi qui ne resiste pas a lexamen",
  "Un objet appartenant a {S} a ete retrouve pres du {A}",
  "Des bruits de pas ont ete entendus en direction du {L} a {M}",
  "Un domestique se souvient dune remarque etrange de {S}",
  "La police retrouve des traces de {A} dans le {L}"
];

// ============================================================
// 2. OUTILS: RNG, MELANGE, TEXTE EN GRAS
// ============================================================

function creerRng(graine) {
  let etat = graine >>> 0;
  return function () {
    etat |= 0;
    etat = (etat + 0x6d2b79f5) | 0;
    let t = Math.imul(etat ^ (etat >>> 15), 1 | etat);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function choisir(rng, tableau) {
  return tableau[Math.floor(rng() * tableau.length)];
}

function melangerEtPrendre(rng, tableau, n) {
  const copie = [...tableau];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie.slice(0, n);
}

function texteEnGras(texte) {
  const majA = 0x1d5d4, minA = 0x1d5ee, chiffre0 = 0x1d7ec;
  let resultat = "";
  for (const car of texte) {
    const code = car.codePointAt(0);
    if (code >= 65 && code <= 90) resultat += String.fromCodePoint(majA + (code - 65));
    else if (code >= 97 && code <= 122) resultat += String.fromCodePoint(minA + (code - 97));
    else if (code >= 48 && code <= 57) resultat += String.fromCodePoint(chiffre0 + (code - 48));
    else resultat += car;
  }
  return resultat;
}

// Nombre de suspects retenus par affaire (avec ordre = permutation)
const NB_SUSPECTS_PAR_AFFAIRE = 6;
const NB_INDICES_PAR_AFFAIRE = 7;

function permutations(n, r) {
  let total = 1;
  for (let i = 0; i < r; i++) total *= (n - i);
  return total;
}

function computeTotalScenarios() {
  const permSuspects = permutations(SUSPECTS.length, NB_SUSPECTS_PAR_AFFAIRE);
  const total =
    VICTIMES.length *
    permSuspects *
    ARMES.length *
    LIEUX.length *
    MOBILES.length *
    MOMENTS.length;
  return total;
}

const TOTAL_SCENARIOS = computeTotalScenarios();

function formaterGrandNombre(n) {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + " milliards";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + " millions";
  return n.toLocaleString("fr-FR");
}

// ============================================================
// 3. ETAT DES PARTIES (une enquete active par thread)
// ============================================================

const partiesEnCours = new Map();

function genererAffaire(idAffaire) {
  const rng = creerRng(idAffaire);

  const victime = choisir(rng, VICTIMES);
  const suspects = melangerEtPrendre(rng, SUSPECTS, NB_SUSPECTS_PAR_AFFAIRE);
  const coupable = choisir(rng, suspects);
  const arme = choisir(rng, ARMES);
  const lieu = choisir(rng, LIEUX);
  const mobile = choisir(rng, MOBILES);
  const moment = choisir(rng, MOMENTS);

  const gabaritsChoisis = melangerEtPrendre(rng, GABARITS_INDICES, NB_INDICES_PAR_AFFAIRE);
  const indices = gabaritsChoisis.map((gabarit) => {
    const suspectIndice = choisir(rng, suspects);
    return gabarit
      .replace("{S}", suspectIndice)
      .replace("{L}", lieu)
      .replace("{A}", arme)
      .replace("{M}", moment);
  });

  return {
    idAffaire,
    victime,
    suspects,
    coupable,
    arme,
    lieu,
    mobile,
    moment,
    indices,
    indicesReveles: 1,
    tentativesRestantes: 3,
    demarree: Date.now()
  };
}

// ============================================================
// 4. EXPORT DE LA COMMANDE
// ============================================================

module.exports.config = {
  name: "detective",
  version: "1.0.0",
  hasPermssion: 0,
  credits: "Camille Uchiha 🍓",
  description: "Enquete de detective a scenarios generes proceduralement (indices, suspects, mobiles)",
  commandCategory: "jeux",
  usages: "detective [nouvelle | indice | accuser <suspect> | abandonner]",
  cooldowns: 3
};

module.exports.langs = {
  fr: {
    aide:
      "🍓━━━━━━━━🍓\n%1\n🍓━━━━━━━━🍓\n" +
      "Une victime, %2 suspects en ordre, une arme, un lieu, un mobile, un moment.\n" +
      "Reserve de scenarios distincts calcules: plus de %3.\n\n" +
      "Commandes disponibles:\n" +
      "• detective nouvelle — demarrer une nouvelle enquete\n" +
      "• detective indice — reveler un indice supplementaire\n" +
      "• detective accuser <nom du suspect> — tenter une accusation\n" +
      "• detective abandonner — reveler la solution et arreter",
    dejaEnCours:
      "🍓━━━━━━━━🍓\n%1\n🍓━━━━━━━━🍓\n" +
      "Une enquete est deja active dans ce salon (affaire n°%2).\n" +
      "Terminez la avec accuser ou abandonner avant den demarrer une nouvelle.",
    nouvelleAffaire:
      "🍓━━━━━━━━🍓\n%1\n🍓━━━━━━━━🍓\n" +
      "Affaire n°%2 — %3 a ete retrouve sans vie.\n" +
      "Lieu du drame: %4\n" +
      "Suspects retenus: %5\n\n" +
      "Premier indice:\n➤ %6\n\n" +
      "Tentatives disponibles: %7\n" +
      "Utilisez detective indice pour en savoir plus, ou detective accuser <nom>",
    indiceRevele:
      "🍓━━━━━━━━🍓\n%1\n🍓━━━━━━━━🍓\n" +
      "Indice %2 sur %3:\n➤ %4",
    plusDindices:
      "🍓━━━━━━━━🍓\n%1\n🍓━━━━━━━━🍓\n" +
      "Tous les indices disponibles ont deja ete reveles (%2/%2).\n" +
      "A vous de trancher avec detective accuser <nom du suspect>",
    pasDePartie:
      "Aucune enquete active dans ce salon. Lancez detective nouvelle pour commencer.",
    suspectInconnu:
      "🍓━━━━━━━━🍓\n%1\n🍓━━━━━━━━🍓\n" +
      "Ce nom ne correspond a aucun suspect de laffaire en cours.\n" +
      "Suspects retenus: %2",
    accusationCorrecte:
      "🍓━━━━━━━━🍓\n%1\n🍓━━━━━━━━🍓\n" +
      "Bravo, laffaire n°%2 est resolue.\n\n" +
      "Coupable: %3\n" +
      "Arme: %4\n" +
      "Lieu: %5\n" +
      "Mobile: %6\n" +
      "Moment: %7\n\n" +
      "Indices utilises: %8/%9 — tentatives restantes: %10",
    accusationIncorrecte:
      "🍓━━━━━━━━🍓\n%1\n🍓━━━━━━━━🍓\n" +
      "%2 nest pas le coupable.\n" +
      "Tentatives restantes: %3\n" +
      "Utilisez detective indice si vous avez encore des indices disponibles",
    echecEnquete:
      "🍓━━━━━━━━🍓\n%1\n🍓━━━━━━━━🍓\n" +
      "Plus aucune tentative disponible. Laffaire reste non resolue par vous.\n\n" +
      "Le veritable coupable etait: %2\n" +
      "Arme: %3 — Lieu: %4 — Mobile: %5",
    abandon:
      "🍓━━━━━━━━🍓\n%1\n🍓━━━━━━━━🍓\n" +
      "Enquete abandonnee.\n" +
      "Le coupable etait: %2\n" +
      "Arme: %3 — Lieu: %4 — Mobile: %5"
  }
};

module.exports.onStart = async function ({ args, message, threadID, getLang }) {
  const sousCommande = (args[0] || "").toLowerCase();
  const partie = partiesEnCours.get(threadID);

  // -------- AIDE PAR DEFAUT --------
  if (!sousCommande || sousCommande === "aide" || sousCommande === "help") {
    return message.reply(
      getLang("aide", texteEnGras("ENQUETE DETECTIVE"), NB_SUSPECTS_PAR_AFFAIRE, formaterGrandNombre(TOTAL_SCENARIOS))
    );
  }

  // -------- NOUVELLE AFFAIRE --------
  if (sousCommande === "nouvelle" || sousCommande === "new") {
    if (partie) {
      return message.reply(getLang("dejaEnCours", texteEnGras("ENQUETE EN COURS"), partie.idAffaire));
    }
    const idAffaire = Math.floor(Math.random() * TOTAL_SCENARIOS) % 2147483647;
    const nouvelleAffaire = genererAffaire(idAffaire);
    partiesEnCours.set(threadID, nouvelleAffaire);

    return message.reply(
      getLang(
        "nouvelleAffaire",
        texteEnGras("NOUVELLE AFFAIRE"),
        idAffaire,
        nouvelleAffaire.victime,
        nouvelleAffaire.lieu,
        nouvelleAffaire.suspects.join(", "),
        nouvelleAffaire.indices[0],
        nouvelleAffaire.tentativesRestantes
      )
    );
  }

  if (!partie) {
    return message.reply(getLang("pasDePartie"));
  }

  // -------- INDICE SUPPLEMENTAIRE --------
  if (sousCommande === "indice" || sousCommande === "clue") {
    if (partie.indicesReveles >= partie.indices.length) {
      return message.reply(getLang("plusDindices", texteEnGras("INDICES EPUISES"), partie.indices.length));
    }
    partie.indicesReveles += 1;
    return message.reply(
      getLang(
        "indiceRevele",
        texteEnGras("INDICE REVELE"),
        partie.indicesReveles,
        partie.indices.length,
        partie.indices[partie.indicesReveles - 1]
      )
    );
  }

  // -------- ACCUSATION --------
  if (sousCommande === "accuser" || sousCommande === "accuse") {
    const nomAccuse = args.slice(1).join(" ").trim();
    if (!nomAccuse) {
      return message.reply(getLang("suspectInconnu", texteEnGras("NOM MANQUANT"), partie.suspects.join(", ")));
    }
    const suspectTrouve = partie.suspects.find((s) => s.toLowerCase() === nomAccuse.toLowerCase());
    if (!suspectTrouve) {
      return message.reply(getLang("suspectInconnu", texteEnGras("SUSPECT INCONNU"), partie.suspects.join(", ")));
    }

    if (suspectTrouve === partie.coupable) {
      partiesEnCours.delete(threadID);
      return message.reply(
        getLang(
          "accusationCorrecte",
          texteEnGras("AFFAIRE RESOLUE"),
          partie.idAffaire,
          partie.coupable,
          partie.arme,
          partie.lieu,
          partie.mobile,
          partie.moment,
          partie.indicesReveles,
          partie.indices.length,
          partie.tentativesRestantes
        )
      );
    }

    partie.tentativesRestantes -= 1;
    if (partie.tentativesRestantes <= 0) {
      partiesEnCours.delete(threadID);
      return message.reply(
        getLang("echecEnquete", texteEnGras("ENQUETE ECHOUEE"), partie.coupable, partie.arme, partie.lieu, partie.mobile)
      );
    }

    return message.reply(
      getLang("accusationIncorrecte", texteEnGras("ACCUSATION REJETEE"), suspectTrouve, partie.tentativesRestantes)
    );
  }

  // -------- ABANDON --------
  if (sousCommande === "abandonner" || sousCommande === "giveup") {
    partiesEnCours.delete(threadID);
    return message.reply(
      getLang("abandon", texteEnGras("ENQUETE ABANDONNEE"), partie.coupable, partie.arme, partie.lieu, partie.mobile)
    );
  }

  return message.reply(
    getLang("aide", texteEnGras("ENQUETE DETECTIVE"), NB_SUSPECTS_PAR_AFFAIRE, formaterGrandNombre(TOTAL_SCENARIOS))
  );
};
