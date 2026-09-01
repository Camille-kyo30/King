const fs = require("fs-extra");
const SpamTracker = require("../../func/spamTracker.js");
const CooldownManager = require("../../func/cooldownManager.js");
const analyticsBatcher = require("../../func/analyticsBatcher.js");
const nullAndUndefined = [undefined, null];

// Initialize optimized spam tracker on module load
const spamTracker = new SpamTracker({
	commandThreshold: 8,
	timeWindow: 10000,
	banDuration: 24 * 60 * 60 * 1000,
	maxEntries: 1000,
	cleanupInterval: 60000
});

const cooldownManager = require("../../func/cooldownManager.js");

function getType(obj) {
	return Object.prototype.toString.call(obj).slice(8, -1);
}

async function checkSpamBannedThread(threadID, globalData) {
	if (spamTracker.isBanned(threadID)) return true;
	const spamBannedThreads = await globalData.get("spamBannedThreads", "data", {});
	if (spamBannedThreads[threadID]) {
		if (spamBannedThreads[threadID].expireTime > Date.now()) {
			spamTracker.banThread(threadID, spamBannedThreads[threadID].reason, spamBannedThreads[threadID].expireTime - Date.now());
			return true;
		} else {
			delete spamBannedThreads[threadID];
			await globalData.set("spamBannedThreads", spamBannedThreads, "data");
		}
	}
	return false;
}

async function trackCommandSpam(threadID, threadName, globalData, message) {
	const config = global.GoatBot.config;
	const spamConfig = config.spamProtection || {
		commandThreshold: 8,
		timeWindow: 10,
		banDuration: 24
	};
	spamTracker.options.commandThreshold = spamConfig.commandThreshold;
	spamTracker.options.timeWindow = spamConfig.timeWindow * 1000;
	spamTracker.options.banDuration = spamConfig.banDuration * 60 * 60 * 1000;
	const result = spamTracker.trackCommand(threadID, message.body?.split(' ')[0] || 'unknown');
	if (result.shouldBan) {
		const spamBannedThreads = await globalData.get("spamBannedThreads", "data", {});
		const banDuration = spamConfig.banDuration * 60 * 60 * 1000;
		const now = Date.now();
		spamBannedThreads[threadID] = {
			bannedAt: now,
			expireTime: now + banDuration,
			threadName: threadName || "Unknown",
			reason: "Command spam flood detected"
		};
		await globalData.set("spamBannedThreads", spamBannedThreads, "data");
		const hours = spamConfig.banDuration;
		message.reply(`⛔ | This group has been temporarily banned for ${hours} hours due to command spam.\n\nPlease wait or contact an admin to unban.`);
		global.utils.log.warn("SPAM_BAN", `Thread ${threadID} (${threadName}) banned for command spam`);
		return true;
	}
	return false;
}

function getRole(threadData, senderID) {
        const config = global.GoatBot.config;
        const adminBot = config.adminBot || [];
        const devUsers = config.devUsers || [];
        const premiumUsers = config.premiumUsers || [];
        if (!senderID) return 0;
        const adminBox = threadData ? threadData.adminIDs || [] : [];
        if (devUsers.includes(senderID.toString())) return 4;
        if (adminBot.includes(senderID.toString())) return 2;
        if (premiumUsers.includes(senderID.toString())) {
                const userData = global.db.allUserData.find(u => u.userID == senderID);
                if (userData && userData.data && userData.data.premiumExpireTime) {
                        if (userData.data.premiumExpireTime < Date.now()) {
                                global.temp.expiredPremiumUsers = global.temp.expiredPremiumUsers || [];
                                if (!global.temp.expiredPremiumUsers.includes(senderID))
                                        global.temp.expiredPremiumUsers.push(senderID);
                                return adminBox.map(String).includes(senderID.toString()) ? 1 : 0;
                        }
                }
                return 3;
        }
        if (adminBox.map(String).includes(senderID.toString())) return 1;
        return 0;
}

function canUseCommand(userRole, needRole) {
        if (userRole === 4 || userRole === 2) return true;
        if (userRole === 3) return needRole === 0 || needRole === 3;
        return needRole <= userRole;
}

async function checkMoneyRequirement(userData, requiredMoney) {
        if (!requiredMoney || requiredMoney <= 0) return true;
        const userMoney = userData.money || 0;
        return userMoney >= requiredMoney;
}

function getText(type, reason, time, targetID, lang) {
        const utils = global.utils;
        if (type == "userBanned") return utils.getText({ lang, head: "handlerEvents" }, "userBanned", reason, time, targetID);
        else if (type == "threadBanned") return utils.getText({ lang, head: "handlerEvents" }, "threadBanned", reason, time, targetID);
        else if (type == "onlyAdminBox") return utils.getText({ lang, head: "handlerEvents" }, "onlyAdminBox");
        else if (type == "onlyAdminBot") return utils.getText({ lang, head: "handlerEvents" }, "onlyAdminBot");
}

function replaceShortcutInLang(text, prefix, commandName) {
        return text
                .replace(/\{(?:p|prefix)\}/g, prefix)
                .replace(/\{(?:n|name)\}/g, commandName)
                .replace(/\{pn\}/g, `${prefix}${commandName}`);
}

function getRoleConfig(utils, command, isGroup, threadData, commandName) {
        let roleConfig;
        if (utils.isNumber(command.config.role)) {
                roleConfig = { onStart: command.config.role };
        } else if (typeof command.config.role == "object" && !Array.isArray(command.config.role)) {
                if (!command.config.role.onStart) command.config.role.onStart = 0;
                roleConfig = command.config.role;
        } else {
                roleConfig = { onStart: 0 };
        }
        if (isGroup) roleConfig.onStart = threadData.data.setRole?.[commandName] ?? roleConfig.onStart;
        for (const key of ["onChat", "onStart", "onReaction", "onReply"]) {
                if (roleConfig[key] == undefined) roleConfig[key] = roleConfig.onStart;
        }
        return roleConfig;
}

function isBannedOrOnlyAdmin(userData, threadData, senderID, threadID, isGroup, commandName, message, lang) {
        const config = global.GoatBot.config;
        const { adminBot, hideNotiMessage } = config;
        const infoBannedUser = userData.banned;
        if (infoBannedUser.status == true) {
                const { reason, date } = infoBannedUser;
                if (hideNotiMessage.userBanned == false) message.reply(getText("userBanned", reason, date, senderID, lang));
                return true;
        }
        if (config.adminOnly.enable == true && !adminBot.includes(senderID) && !config.adminOnly.ignoreCommand.includes(commandName)) {
                if (hideNotiMessage.adminOnly == false) message.reply(getText("onlyAdminBot", null, null, null, lang));
                return true;
        }
        if (isGroup == true) {
                if (threadData.data.onlyAdminBox === true && !threadData.adminIDs.includes(senderID) && !(threadData.data.ignoreCommanToOnlyAdminBox || []).includes(commandName)) {
                        if (!threadData.data.hideNotiMessageOnlyAdminBox) message.reply(getText("onlyAdminBox", null, null, null, lang));
                        return true;
                }
                const infoBannedThread = threadData.banned;
                if (infoBannedThread.status == true) {
                        const { reason, date } = infoBannedThread;
                        if (hideNotiMessage.threadBanned == false) message.reply(getText("threadBanned", reason, date, threadID, lang));
                        return true;
                }
        }
        return false;
}

function createGetText2(langCode, pathCustomLang, prefix, command) {
        const commandType = command.config.countDown ? "command" : "command event";
        const commandName = command.config.name;
        let customLang = {};
        let getText2 = () => { };
        if (fs.existsSync(pathCustomLang)) customLang = require(pathCustomLang)[commandName]?.text || {};
        if (command.langs || customLang || {}) {
                getText2 = function (key, ...args) {
                        let lang = command.langs?.[langCode]?.[key] || customLang[key] || "";
                        lang = replaceShortcutInLang(lang, prefix, commandName);
                        for (let i = args.length - 1; i >= 0; i--) lang = lang.replace(new RegExp(`%${i + 1}`, "g"), args[i]);
                        return lang || `❌ Can't find text on language "${langCode}" for ${commandType} "${commandName}" with key "${key}"`;
                };
        }
        return getText2;
}

module.exports = function (api, threadModel, userModel, dashBoardModel, globalModel, usersData, threadsData, dashBoardData, globalData) {
        return async function (event, message) {

                const { utils, client, GoatBot } = global;
                const { getPrefix, removeHomeDir, log, getTime } = utils;
                const { config, configCommands: { envGlobal, envCommands, envEvents } } = GoatBot;
                const { autoRefreshThreadInfoFirstTime } = config.database;
                let { hideNotiMessage = {} } = config;

                const { body, messageID, threadID, isGroup } = event;
                if (!threadID) return;

                const senderID = event.userID || event.senderID || event.author;

                let threadData = global.db.allThreadData.find(t => t.threadID == threadID);
                let userData = global.db.allUserData.find(u => u.userID == senderID);

                if (!userData && !isNaN(senderID)) userData = await usersData.create(senderID);
                if (!threadData && !isNaN(threadID)) {
                        if (global.temp.createThreadDataError.includes(threadID)) return;
                        threadData = await threadsData.create(threadID);
                        global.db.receivedTheFirstMessage[threadID] = true;
                } else {
                        if (autoRefreshThreadInfoFirstTime === true && !global.db.receivedTheFirstMessage[threadID]) {
                                global.db.receivedTheFirstMessage[threadID] = true;
                                await threadsData.refreshInfo(threadID);
                        }
                }

                if (typeof threadData.settings.hideNotiMessage == "object") hideNotiMessage = threadData.settings.hideNotiMessage;

                const prefix = getPrefix(threadID);
                const role = getRole(threadData, senderID);
                const parameters = {
                        api, usersData, threadsData, message, event,
                        userModel, threadModel, prefix, dashBoardModel,
                        globalModel, dashBoardData, globalData, envCommands,
                        envEvents, envGlobal, role,
                        removeCommandNameFromBody: function removeCommandNameFromBody(body_, prefix_, commandName_) {
                                if ([body_, prefix_, commandName_].every(x => nullAndUndefined.includes(x)))
                                        throw new Error("Please provide body, prefix and commandName to use this function, this function without parameters only support for onStart");
                                for (let i = 0; i < arguments.length; i++)
                                        if (typeof arguments[i] != "string")
                                                throw new Error(`The parameter "${i + 1}" must be a string, but got "${getType(arguments[i])}"`);
                                return body_.replace(new RegExp(`^${prefix_}(\\s+|)${commandName_}`, "i"), "").trim();
                        }
                };
                const langCode = threadData.data.lang || config.language || "en";

                function createMessageSyntaxError(commandName) {
                        message.SyntaxError = async function () {
                                return await message.reply(utils.getText({ lang: langCode, head: "handlerEvents" }, "commandSyntaxError", prefix, commandName));
                        };
                }

                let isUserCallCommand = false;

                async function onStart() {
                        if (!body) return;
                        const noPrefixEnabled = config.noPrefix === true;
                        const userCanSkipPrefix = role === 2 || role === 4;
                        const hasPrefix = body.startsWith(prefix);
                        const hasNoPrefix = noPrefixEnabled && userCanSkipPrefix && !hasPrefix;
                        if (!hasPrefix && !hasNoPrefix) return;

                        // PREFIX ONLY RESPONSE (with mention)
                        if (hasPrefix && body.trim() === prefix.trim()) {
                                const userName = userData.name || senderID;
                                const text = utils.getText({ lang: langCode, head: "handlerEvents" }, "prefixOnly", userName, prefix);
                                if (!hideNotiMessage.prefixOnly) {
                                        return await message.reply({ body: text, mentions: [{ tag: userName, id: senderID }] });
                                } else return true;
                        }

                        if (isGroup) {
                                const isSpamBanned = await checkSpamBannedThread(threadID, globalData);
                                if (isSpamBanned) {
                                        if (!hideNotiMessage.threadBanned) message.reply("This group is temporarily banned for command spam.");
                                        return;
                                }
                        }
                        const dateNow = Date.now();
                        const args = hasPrefix ? body.slice(prefix.length).trim().split(/ +/) : body.trim().split(/ +/);
                        let commandName = args.shift().toLowerCase();
                        let command = GoatBot.commands.get(commandName) || GoatBot.commands.get(GoatBot.aliases.get(commandName));
                        const aliasesData = threadData.data.aliases || {};
                        for (const cmdName in aliasesData) {
                                if (aliasesData[cmdName].includes(commandName)) {
                                        command = GoatBot.commands.get(cmdName);
                                        break;
                                }
                        }
                        if (command) commandName = command.config.name;
                        function removeCommandNameFromBody(body_, prefix_, commandName_) {
                                if (arguments.length) {
                                        if (typeof body_ != "string") throw new Error(`The first argument (body) must be a string, but got "${getType(body_)}"`);
                                        if (typeof prefix_ != "string") throw new Error(`The second argument (prefix) must be a string, but got "${getType(prefix_)}"`);
                                        if (typeof commandName_ != "string") throw new Error(`The third argument (commandName) must be a string, but got "${getType(commandName_)}"`);
                                        return body_.replace(new RegExp(`^${prefix_}(\\s+|)${commandName_}`, "i"), "").trim();
                                } else {
                                        return body.replace(new RegExp(`^${prefix}(\\s+|)${commandName}`, "i"), "").trim();
                                }
                        }
                        if (isBannedOrOnlyAdmin(userData, threadData, senderID, threadID, isGroup, commandName, message, langCode)) return;
                        if (!command) {
                                if (!hasPrefix) return;
                                if (!hideNotiMessage.commandNotFound) {
                                        if (!commandName) {
                                                return await message.reply(`That's only the prefix. Type ${prefix}help to see commands.`);
                                        }
                                        function getCachedCommandNames() {
                                                const cmdCount = GoatBot.commands.size;
                                                const aliasCount = GoatBot.aliases.size;
                                                const cache = GoatBot._cmdNameCache || {};
                                                if (!cache.list || cache.cmdCount !== cmdCount || cache.aliasCount !== aliasCount) {
                                                        const list = [...GoatBot.commands.keys(), ...GoatBot.aliases.keys()];
                                                        GoatBot._cmdNameCache = { list, lower: list.map(s => s.toLowerCase()), cmdCount, aliasCount };
                                                }
                                                return GoatBot._cmdNameCache;
                                        }
                                        const { list, lower } = getCachedCommandNames();
                                        const input = commandName.toLowerCase();
                                        let index = lower.findIndex(n => n.startsWith(input));
                                        let bestMatch = index !== -1 ? list[index] : null;
                                        if (!bestMatch) {
                                                function editDistance(a, b) {
                                                        const m = a.length, n = b.length;
                                                        if (Math.abs(m - n) > 2) return 99;
                                                        const dp = Array.from({ length: m + 1 }, (_, i) => i);
                                                        for (let j = 1; j <= n; j++) {
                                                                let prev = j - 1;
                                                                let cur = j;
                                                                for (let i = 1; i <= m; i++) {
                                                                        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                                                                        const tmp = Math.min(dp[i] + 1, cur + 1, dp[i - 1] + cost);
                                                                        dp[i - 1] = prev;
                                                                        prev = tmp;
                                                                        cur = tmp;
                                                                }
                                                                dp[m] = cur;
                                                        }
                                                        return dp[m];
                                                }
                                                let best = { name: null, dist: 3 };
                                                for (let i = 0; i < lower.length; i++) {
                                                        const name = lower[i];
                                                        if (Math.abs(name.length - input.length) > 2) continue;
                                                        const d = editDistance(input, name);
                                                        if (d < best.dist) {
                                                                best = { name: list[i], dist: d };
                                                                if (d === 0) break;
                                                        }
                                                }
                                                if (best.dist <= 2) bestMatch = best.name;
                                        }
                                        const userName = userData.name || senderID;
                                        let 
