var Discord = require('discord.js');
var auth = require('./auth.json');
const eloRoles = require('./eloRoles.json');

const client = new Discord.Client();
client.login(auth.token)

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

module.exports.setHandler = function setHandler(handleMessage) {
    client.on('message', handleMessage);
}

module.exports.getEmoji = function setHandgetEmojier(name) {
    return client.emojis.cache.find(emoji => emoji.name === name);
}

module.exports.giveRole = function giveRole(roleName, guild, member) {
    var role = guild.roles.cache.find(role => role.name === roleName);
    member.roles.add(role);
}

module.exports.clearRoles = function clearRoles(guild, member) {
    for (var i = 0; i < eloRoles.length; i++) {
        var role = eloRoles[i].name;
        var ro = guild.roles.cache.find(r => r.name === role);
        if (member.roles.cache.find(r => r.name === role))
            member.roles.remove(ro.id);
    };
}