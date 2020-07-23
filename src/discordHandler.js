var Discord = require('discord.js');
var auth = require('./auth.json');
const eloRoles = require('./eloRoles.json');

var honguGuild = null;
const client = new Discord.Client();
client.login(auth.token)

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.channels.cache.get('726379536832266271').messages.fetch('726379869092577380'); //specific channel/msg id
    honguGuild = client.guilds.cache.get("723217977998180452"); //HONGUELO server id
});

client.on('guildMemberAdd', (evt) => {
    let userid = evt.id;
    let guild = evt.guild;
    let member = guild.members.cache.find(member => member.id === userid);

    let rolename = "Unranked";
    if (userid === "279656190655463425") //June id
        rolename = "Technical Director";

    giveRole(rolename, guild, member);
})

client.on('messageReactionAdd', (reaction, user) => {
    if (reaction.message.id === '726379869092577380') {
        let userid = user.id;
        let guild = honguGuild;
        let member = guild.members.cache.find(member => member.id === userid);
        let rolename = "Addicted";

        giveRole(rolename, guild, member);
    }
});

client.on('messageReactionRemove', (reaction, user) => {
    let userid = user.id;
    let guild = honguGuild;
    let member = guild.members.cache.find(member => member.id === userid);
    let rolename = "Addicted";

    removeRole(rolename, guild, member);
});

module.exports.setHandler = setHandler;

function setHandler(handleMessage) {
    client.on('message', handleMessage);
}

module.exports.getEmoji = getEmoji;

function getEmoji(name) {
    return client.emojis.cache.find(emoji => emoji.name === name);
}

module.exports.giveRole = giveRole;

function giveRole(roleName, guild, member) {
    var role = getRole(guild, roleName);
    member.roles.add(role);
}

module.exports.removeRole = removeRole;

function removeRole(rolename, guild, member) {
    var ro = guild.roles.cache.find(r => r.name === rolename);
    if (member.roles.cache.find(r => r.name === rolename))
        member.roles.remove(ro.id);
}

module.exports.clearRoles = clearRoles;

function clearRoles(guild, member) {
    for (var i = 0; i < eloRoles.length; i++) {
        var role = eloRoles[i].name;
        removeRole(role, guild, member)
    };
}

module.exports.getRole = getRole;

function getRole(guild, roleName) {
    if (guild === null) guild = honguGuild;

    return guild.roles.cache.find(role => role.name === roleName);
}

module.exports.sendMessageToChannel = sendMessageToChannel;

function sendMessageToChannel(channelId, message) {
    client.channels.cache.get(channelId).send(message);
}