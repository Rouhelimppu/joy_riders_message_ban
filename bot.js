var Discord = require('discord.io');
var Discordjs = require('discord.js');
var logger = require('winston');
var auth = require('./auth.json');
var jsonfile = require('jsonfile');
var perJsonFile = require('jsonfile');
var file = 'banList.json';
var permissionsFile = 'permissions.json';
// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
	colorize: true
});
logger.level = 'debug';
// Initialize Discord Bot
var bot = new Discord.Client({
	token: auth.token,
	autorun: true
});

bot.on('ready', function (evt) {
	logger.info('Connected');
	logger.info('Logged in as: ');
	logger.info(bot.username + ' - (' + bot.id + ')');
});
/*
 * Launched on message event
 * user - user name
 * userID - id of an user
 * channelID - text channel id
 * message - written message
 * evt - message event object
 */
bot.on('message', function (user, userID, channelID, message, evt) {
	/*
	 * Checks if message contains command prefix !
	 * Takes command input after !
	 * Removes any special cases from the message
	 */
	if(userHasPermission(user)) {
		if (message.substring(0, 1) == '!') {
			message = message.replace(/[^\w\s!]/gi, '')
			var args = message.substring(1).split(' ');
			var cmd = args[0];
			args = args.splice(1);
			switch(cmd) {
				case 'help':
					help = getHelp();
					var helpMessage = '';
					for (i = 0; i < help.length; i++) {
						helpMessage += help[i] + "\r\n";
					}
					bot.sendMessage({
						to: channelID,
						message: helpMessage
					});
					break;
				case 'ban':
					if(args.length) {
						switch(args[0]) {
							case 'link':
								setBanlist(args, 'link');
								break;
							case  'file':
								setBanlist(args, 'file');
								break;
							default:
								setBanlist(args);
								break;
						}
					}
					break;
				case 'unban':
					if(args.length) {
						switch(args[0]) {
							case 'link':
								deleteFromBanlist('link', args[1]);
								break;
							case  'file':
								deleteFromBanlist('file', args[1]);
								break;
							default:
								deleteFromBanlist('word', args[1]);
								break;
						}
					}
					break;
				case 'list':
					bot.sendMessage({
						to: channelID,
						message: banlistToString()
					});
					break;
				case 'add':
					if(args.length) {
						setPerissionsList(args);
					}
					break;
				case 'remove':
					if(args.length) {
						deleteFromPermissionsList(args[0]);
					}
					break;
				case 'permissions':
					bot.sendMessage({
						to: channelID,
						message: permissionslistToString()
					})
					break;
				default:
					sanitizeMessage(evt, channelID, message);
					break;
			}
		} else {
			sanitizeMessage(evt, channelID, message);
		}
	} else {
		sanitizeMessage(evt, channelID, message);
	}
});

/*
 * Deletes message as defined in banlist
 * Object evt - message event object
 * String channelID - ID of a channel where the message was sent
 * String message - written message
 */
function sanitizeMessage(evt, channelID, message) {
	var test = JSON.stringify(evt.d);
	test = JSON.parse(test);
	banlist = getBanlist();
	var deleteMsg = false;

	if(message.indexOf("https://") !== -1 || message.indexOf("http://") !== -1) {
		for(i = 0; i < banlist["link"].length; i++) {
			if(message.indexOf(banlist["link"][i]) !== -1) {
				deleteMsg = true;
			}
		}
	}
	for(i = 0; i < banlist["file"].length; i++) {
		for(j = 0; j < test.attachments.length; j++) {
			var attachmentFile = test.attachments[j]["filename"];
			if(attachmentFile.indexOf(banlist["file"][i]) !== -1) {
				deleteMsg = true;
			}
		}
	}
	if(deleteMsg) {
		logger.info('true');
		bot.deleteMessage({
			channelID: channelID,
			messageID: evt.d.id
		});
	}
}

/*
 * Checks if permissions list contains user
 * String user - username
 * return bool
 */
function userHasPermission(user) {
	var hasPermission = false;
	list = getPermissionsList();
	for(i = 0; i < list["users"].length; i++) {
		if(list["users"][i] === user) {
			hasPermission = true;
		}
	}
	for(i = 0; i < list["super"].length; i++) {
		if(list["super"][i] === user) {
			hasPermission = true;
		}
	}
	return hasPermission;
}

/*
 * Set given arguments in command to banlist
 * array args - written arguments
 * string identifier - written identifer for bannable word (link or file)
 */
function setBanlist(args, identifier = '') {
	var banList = getBanlist();
	if(identifier == '') {
		for(i = 0; i < args.length; i++) {
			banList["word"].push(args[i]);
		}
	} else {
		for(i = 1; i < args.length; i++) {
			banList[identifier].push(args[i]);
		}
	}
	saveBanlist(banList);
}

/*
 * Set given arguments in command to permissionslist
 * array args - written arguments
 */
function setPerissionsList(args) {
	var permissionsList = getPermissionsList();
	for(i = 0; i < args.length; i++) {
		permissionsList["users"].push(args[i]);
	}
	savePermissionsList(permissionsList);
}

/*
 * banlist to string
 * return String
 */
function banlistToString() {
	var list = getBanlist();
	var listString = '```';
	if(typeof list["word"] !== 'undefined' && list["word"].length !== 0) {
		listString += "Banned words:\r\n";
		for(i = 0; i < list["word"].length; i++) {
			listString += i + " : " + list["word"][i] + "\r\n";
		}
	} else {
		listString += "No banned words\r\n";
	}
	if(typeof list["link"] !== 'undefined' && list["link"].length !== 0) {
		listString += "Banned links:\r\n";
		for(i = 0; i < list["link"].length; i++) {
			listString += i + " : " + list["link"][i] + "\r\n";
		}
	} else {
		listString += "No banned links\r\n";
	}
	if(typeof list["file"] !== 'undefined' && list["file"].length !== 0) {
		listString += "Banned files:\r\n";
		for(i = 0; i < list["file"].length; i++) {
			listString += i + " : " + list["file"][i] + "\r\n";
		}
	} else {
		listString += "No banned files\r\n";
	}

	return listString + "```";
}

/*
 * permissions to string
 * return String
 */
function permissionslistToString() {
	var list = getPermissionsList();
	var listString = '```';
	if(typeof list["users"] !== 'undefined' && list["users"].length !== 0) {
		listString += "All users who can use commands:\r\n";
		for(i = 0; i < list["users"].length; i++) {
			listString += i + " : " + list["users"][i] + "\r\n";
		}
	}
	return listString + "```";
}

/*
 * Deletes word from banlist
 * String identifier - key in banlist (word, link, file)
 * Integer index - word position within banlist array
 */
function deleteFromBanlist(identifier, index) {
	var banList = getBanlist();
	list = banList[identifier];
	list.splice(index, 1);
	banList[identifier] = list;
	saveBanlist(banList);
}

/*
 * Deletes user for permissions list
 * Integer index - user name position within permissions array
 */
function deleteFromPermissionsList(index) {
	var permissionsList = getPermissionsList();
	list = permissionsList["users"];
	list.splice(index, 1);
	permissionsList["users"] = list;
	savePermissionsList(permissionsList);
}

/*
 * Writes array to json file
 * Array object - banlist array
 */
function saveBanlist(object) {
	jsonfile.writeFile(file, object, function(err){});
}

/*
 * Writes array to json file
 * Array object - permissions array
 */
function savePermissionsList(object) {
	perJsonFile.writeFile(permissionsFile, object, function(err){});
}

/*
 * Reads banList.json
 * return Array
 */
function getBanlist() {
	return jsonfile.readFileSync(file);
}

/*
 * Reads permissions.json
 * return Array
 */
function getPermissionsList() {
	return perJsonFile.readFileSync(permissionsFile);
}

/*
 * Help message
 * return array
 */
function getHelp() {
	var help = new Array(
		'```',
		'List of commands:',
		'!ban',
		'!list',
		'!unban',
		'!add',
		'!remove',
		'!permissions',
		'------------------------------',
		'examples:',
		'!ban word',
		'!ban link google',
		'!ban file mp4',
		'!unban word 2',
		'!add username',
		'!remove 2',
		'!permissions',
		'------------------------------',
		'With simple !ban <word> you can block messages containing banned word',
		'!ban link <word> blocks links containing banned word',
		'!ban file <file extension> blocks uploading files with banned extension',
		'!ban file can take multiple extensions as argument separated with space',
		'!list prints the list of banned words, links and files',
		'!unban <type> <index> removes banned word, link or file from the ban list',
		'Types for !unban are word, link and file',
		'!add <username> adds user to permissions list. Users in that list may use bot commands. Case sensitive',
		'!remove <index> removes user from permissions list',
		'!permissions displays permissions list',
		"This bot doesn't sanitize only messages just yet",
		'```'
	)
	return help;
}